// Nika Net — Cloudflare Worker entry point.
// Routes:
//   /admin                → panel UI (PANEL_HTML injected at build time)
//   /api/*                → admin API (JSON, session-authenticated)
//   /sub/<token>          → user subscription (base64 bundle)
//   /<token>/vless|trojan → per-protocol config links
//   /<uuid>/...           → client config fetch (v2rayNG style) by user uuid
//   websocket upgrade     → VLESS/Trojan proxy handler
//   anything else         → camouflage redirect

import { Settings, User, Env, DEFAULTS } from "./types";
import * as store from "./settings";
import * as auth from "./auth";
import * as gen from "./generators";
import { handleVless } from "./protocols/vless";
import { handleTrojan } from "./protocols/trojan";
import { jsonResp } from "./protocols/common";

declare const PANEL_HTML: string;
const PANEL = PANEL_HTML; // single reference so esbuild inlines the HTML exactly once

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });

function cors(res: Response): Response {
  res.headers.set("access-control-allow-origin", "*");
  return res;
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(req.url);
      const path = url.pathname;
      const settings = await store.getSettings(env);

      // 1) websocket → proxy protocols
      if ((req.headers.get("Upgrade") || "").toLowerCase() === "websocket") {
        return handleWebsocket(req, env, settings);
      }

      // 2) panel
      if (path === "/admin" || path === "/admin/") return html(PANEL);

      // 3) admin API
      if (path.startsWith("/api/")) return cors(await handleApi(req, env, settings, url));

      // 4) user subscription
      if (path.startsWith("/sub/")) return handleSub(req, env, settings, path);

      // 5) client config fetch by uuid or token
      const m = path.match(/^\/([0-9a-fA-F-]{36})\/?$/);
      if (m) return handleClientConfig(env, settings, m[1]);

      // 6) health
      if (path === "/health") return jsonResp({ ok: true, name: settings.title });

      // 7) camouflage (unconfigured panels serve the panel at root for first-run UX)
      if (settings.host === DEFAULTS.host) return html(PANEL);
      return Response.redirect("https://www.cloudflare.com", 302);
    } catch (e) {
      return jsonResp({ error: String(e) }, 500);
    }
  },
};

/* ---------------------- websocket ---------------------- */
async function handleWebsocket(req: Request, env: Env, settings: Settings): Promise<Response> {
  const url = new URL(req.url);
  const proto = url.searchParams.get("proto") || req.headers.get("x-nika-proto") || "";
  const users = await store.getUsers(env);
  const uuid = url.searchParams.get("uuid") || "";

  const user = users.find((u) => u.uuid.toLowerCase() === uuid.toLowerCase()) || users[0];
  if (!user || !user.active) return jsonResp({ error: "no active user" }, 403);

  if (proto === "trojan") return handleTrojan(req, user, settings);
  return handleVless(req, user, settings);
}

/* ---------------------- admin API ---------------------- */
async function handleApi(req: Request, env: Env, settings: Settings, url: URL): Promise<Response> {
  const op = url.pathname.replace("/api/", "");
  const method = req.method.toUpperCase();

  // login
  if (op === "login" && method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { password?: string };
    const pass = body.password || "";
    if (!settings.adminPassHash) {
      // first-run: set password
      if (!pass || pass.length < 4) return jsonResp({ error: "password too short" }, 400);
      settings.adminPassHash = await auth.sha256Hex(pass);
      await store.saveSettings(env, settings);
    }
    const ok = settings.adminPassHash === (await auth.sha256Hex(pass));
    if (!ok) return jsonResp({ error: "wrong password" }, 401);
    const token = await auth.signSession(settings.sessionSecret, JSON.stringify({ t: Date.now() }));
    const res = jsonResp({ ok: true });
    res.headers.set("set-cookie", `${auth.SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`);
    return res;
  }

  if (op === "logout") {
    const res = jsonResp({ ok: true });
    res.headers.set("set-cookie", `${auth.SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0`);
    return res;
  }

  // everything below requires auth
  if (!(await auth.isAuthed(req, settings))) return jsonResp({ error: "unauthorized" }, 401);

  switch (op) {
    case "status": {
      const users = await store.getUsers(env);
      return jsonResp({
        title: settings.title,
        users: users.length,
        active: users.filter((u) => u.active).length,
        protocols: settings.protocols,
        used: users.reduce((a, u) => a + u.used, 0),
      });
    }

    case "users": {
      const users = await store.getUsers(env);
      if (method === "GET") return jsonResp(users);
      if (method === "POST") {
        const b = (await req.json().catch(() => ({}))) as { name?: string; quota?: number; days?: number };
        const u: User = {
          id: crypto.randomUUID(),
          name: b.name || "کاربر",
          uuid: crypto.randomUUID(),
          password: auth.randomToken(),
          quota: Number(b.quota) || 50,
          used: 0,
          days: Number(b.days) || 30,
          active: true,
          createdAt: Date.now(),
        };
        users.push(u);
        await store.saveUsers(env, users);
        return jsonResp(u);
      }
      if (method === "DELETE") {
        const id = url.searchParams.get("id");
        const next = users.filter((u) => u.id !== id);
        await store.saveUsers(env, next);
        return jsonResp({ ok: true });
      }
      break;
    }

    case "settings": {
      if (method === "GET") return jsonResp(settings);
      if (method === "POST") {
        const b = (await req.json().catch(() => ({}))) as Partial<Settings>;
        const next: Settings = { ...settings };
        if (typeof b.title === "string") next.title = b.title;
        if (typeof b.host === "string") next.host = b.host;
        if (typeof b.sni === "string") next.sni = b.sni;
        if (typeof b.wsPath === "string") next.wsPath = b.wsPath;
        if (Array.isArray(b.cleanIps)) next.cleanIps = b.cleanIps;
        if (b.protocols) next.protocols = { ...settings.protocols, ...b.protocols };
        await store.saveSettings(env, next);
        return jsonResp({ ok: true });
      }
      break;
    }

    case "gen": {
      // per-user subscription preview (admin-side)
      const id = url.searchParams.get("id");
      const users = await store.getUsers(env);
      const u = users.find((x) => x.id === id) || users[0];
      if (!u) return jsonResp({ error: "user not found" }, 404);
      return jsonResp({
        base64: gen.buildBase64Bundle(u, settings),
        clash: gen.buildClashYaml(u, settings),
        singbox: gen.buildSingboxJson(u, settings),
        warp: settings.protocols.warp ? gen.buildWarpConfig(u) : null,
      });
    }
  }

  return jsonResp({ error: "not found" }, 404);
}

/* ---------------------- subscriptions ---------------------- */
async function handleSub(req: Request, env: Env, settings: Settings, path: string): Promise<Response> {
  const rest = path.replace("/sub/", "");
  const token = rest.split("/")[0].split(".")[0];
  const fmt = rest.split(".").pop()?.toLowerCase() || "";
  const users = await store.getUsers(env);
  const user = users.find((u) => u.password === token || u.uuid.replace(/-/g, "").slice(0, 12) === token);
  if (!user) return jsonResp({ error: "invalid token" }, 404);

  const isClash = fmt === "yaml" || fmt === "yml";
  const isSingbox = fmt === "json";
  const body = isClash
    ? gen.buildClashYaml(user, settings)
    : isSingbox
      ? gen.buildSingboxJson(user, settings)
      : "vmess://" + gen.buildBase64Bundle(user, settings);

  return new Response(body, {
    headers: { "content-type": isClash ? "text/yaml" : isSingbox ? "application/json" : "text/plain" },
  });
}

async function handleClientConfig(env: Env, settings: Settings, uuid: string): Promise<Response> {
  const users = await store.getUsers(env);
  const user = users.find((u) => u.uuid.toLowerCase() === uuid.toLowerCase());
  if (!user) return jsonResp({ error: "unknown uuid" }, 404);
  const body = "vmess://" + gen.buildBase64Bundle(user, settings);
  return new Response(body, { headers: { "content-type": "text/plain" } });
}
