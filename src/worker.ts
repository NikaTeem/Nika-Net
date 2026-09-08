// Nika Net — Cloudflare Worker entry point.
// Routes:
//   /admin                → panel UI (PANEL_HTML injected at build time)
//   /api/info             → public info (is the panel set up?)
//   /api/*                → admin API (JSON, session-authenticated)
//   /sub/<token>          → user subscription (base64 bundle)
//   /<uuid>/...           → client config fetch (v2rayNG style) by user uuid
//   websocket upgrade     → VLESS/Trojan proxy handler
//   anything else         → camouflage redirect

import { Settings, User, Env, DEFAULTS } from "./types";
import * as store from "./settings";
import * as auth from "./auth";
import * as gen from "./generators";
import * as metrics from "./metrics";
import { handleVless } from "./protocols/vless";
import { handleTrojan } from "./protocols/trojan";
import { jsonResp } from "./protocols/common";
import * as cf from "./cloudflare";

declare const PANEL_HTML: string;
const PANEL = PANEL_HTML; // single reference so esbuild inlines the HTML exactly once

declare const NIKA_VERSION: string;
const CUR_VERSION = NIKA_VERSION || "0.4.0";

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });

function cors(res: Response): Response {
  res.headers.set("access-control-allow-origin", "*");
  return res;
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      metrics.bumpRequest();
      ctx.waitUntil(metrics.flush(env));

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

      // 5) client config fetch by uuid
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

  const user = users.find((u) => u.uuid.toLowerCase() === uuid.toLowerCase());
  if (!user) return jsonResp({ error: "no user for this uuid" }, 403);
  if (!user.active) return jsonResp({ error: "user inactive" }, 403);

  if (proto === "trojan") return handleTrojan(req, user, settings, env);
  return handleVless(req, user, settings, env);
}

/* ---------------------- admin API ---------------------- */
async function handleApi(req: Request, env: Env, settings: Settings, url: URL): Promise<Response> {
  const op = url.pathname.replace("/api/", "");
  const method = req.method.toUpperCase();

  // public: is the panel set up? (no auth needed)
  if (op === "info") {
    return jsonResp({
      name: settings.title,
      setup: !settings.adminPassHash,
      protocols: settings.protocols,
      version: CUR_VERSION,
    });
  }

  // public: update check
  if (op === "update/check") {
    const latest = await fetchLatestVersion();
    return jsonResp({
      current: CUR_VERSION,
      latest: latest.version,
      notes: latest.notes || "",
      upToDate: cmpVersion(CUR_VERSION, latest.version) >= 0,
    });
  }

  // login
  if (op === "login" && method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { password?: string };
    const pass = body.password || "";
    const firstRun = !settings.adminPassHash;
    if (firstRun) {
      if (!pass || pass.length < 4) return jsonResp({ error: "password too short" }, 400);
      settings.adminPassHash = await auth.sha256Hex(pass);
      await store.saveSettings(env, settings);
    }
    const ok = settings.adminPassHash === (await auth.sha256Hex(pass));
    if (!ok) return jsonResp({ error: "wrong password" }, 401);
    const token = await auth.signSession(settings.sessionSecret, JSON.stringify({ t: Date.now() }));
    await metrics.appendActivity(env, {
      icon: firstRun ? "🛠" : "🔐",
      text: firstRun ? "نصب اولیه پنل — رمز ادمین ثبت شد" : "ورود ادمین به پنل",
      time: Date.now(),
    });
    const res = jsonResp({ ok: true, setup: firstRun });
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
        setup: false,
        users: users.length,
        active: users.filter((u) => u.active).length,
        usedGb: Math.round(users.reduce((a, u) => a + (u.used || 0), 0) * 100) / 100,
        requestsToday: await metrics.getRequestsToday(env),
        requestsTotal: await metrics.getRequestsTotal(env),
        protocols: settings.protocols,
        activity: await metrics.getActivity(env),
        traffic7d: await metrics.getTraffic7d(env),
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
        await metrics.appendActivity(env, { icon: "👤", text: `کاربر ساخته شد — ${u.name}`, time: Date.now() });
        return jsonResp(u);
      }
      if (method === "DELETE") {
        const id = url.searchParams.get("id");
        const victim = users.find((u) => u.id === id);
        const next = users.filter((u) => u.id !== id);
        await store.saveUsers(env, next);
        await metrics.appendActivity(env, { icon: "🗑", text: `کاربر حذف شد — ${victim?.name || id}`, time: Date.now() });
        return jsonResp({ ok: true });
      }
      break;
    }

    case "users/toggle": {
      if (method !== "POST") break;
      const b = (await req.json().catch(() => ({}))) as { id?: string };
      const users = await store.getUsers(env);
      const u = users.find((x) => x.id === b.id);
      if (!u) return jsonResp({ error: "not found" }, 404);
      u.active = !u.active;
      await store.saveUsers(env, users);
      await metrics.appendActivity(env, {
        icon: u.active ? "🟢" : "⛔",
        text: `${u.name} ${u.active ? "فعال" : "غیرفعال"} شد`,
        time: Date.now(),
      });
      return jsonResp({ ok: true, active: u.active });
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
        await metrics.appendActivity(env, { icon: "⚙️", text: "تنظیمات پنل به‌روزرسانی شد", time: Date.now() });
        return jsonResp({ ok: true });
      }
      break;
    }

    case "gen": {
      const id = url.searchParams.get("id");
      const users = await store.getUsers(env);
      const u = users.find((x) => x.id === id);
      if (!u) return jsonResp({ error: "user not found" }, 404);
      return jsonResp({
        user: { id: u.id, name: u.name, quota: u.quota, used: Math.round((u.used || 0) * 100) / 100, days: u.days, active: u.active },
        base64: gen.buildBase64Bundle(u, settings),
        clash: gen.buildClashYaml(u, settings),
        singbox: gen.buildSingboxJson(u, settings),
        warp: settings.protocols.warp ? gen.buildWarpConfig(u) : null,
      });
    }

    case "update/apply": {
      if (method !== "POST") break;
      const b = (await req.json().catch(() => ({}))) as { token?: string };
      const res = await applySelfUpdate(env, settings, b.token || "");
      return jsonResp(res, res.ok ? 200 : 400);
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

/* ---------------------- updates ---------------------- */
const GITHUB_RAW = "https://raw.githubusercontent.com/NikaTeem/Nika-Net/main";

let latestCache: { version: string; notes?: string } | null = null;
let latestAt = 0;

async function fetchLatestVersion(): Promise<{ version: string; notes?: string }> {
  if (latestCache && Date.now() - latestAt < 300_000) return latestCache;
  try {
    const r = await fetch(`${GITHUB_RAW}/version.json`, { cf: { cacheTtl: 300 } });
    if (!r.ok) throw new Error("fetch failed");
    const j = (await r.json()) as { version: string; notes?: string };
    latestCache = j;
    latestAt = Date.now();
    return j;
  } catch {
    return { version: CUR_VERSION, notes: "" };
  }
}

function cmpVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

async function applySelfUpdate(
  env: Env,
  settings: Settings,
  token: string
): Promise<{ ok: boolean; error?: string }> {
  if (!token || token.length < 20) return { ok: false, error: "token required" };

  const v = await cf.cfJson(token, "/user/tokens/verify");
  if (!v?.success) return { ok: false, error: v?.errors?.[0]?.message || "توکن نامعتبر است" };

  const a = await cf.cfJson(token, "/accounts?per_page=50");
  const accountId = a?.result?.[0]?.id;
  if (!accountId) return { ok: false, error: "اکانتی با این توکن پیدا نشد" };

  const name = (settings.host || "").split(".")[0];
  if (!name) return { ok: false, error: "ابتدا Host ورکر را در تنظیمات وارد کن" };

  const kvId = await cf.findKvId(token, accountId, [`nika-${name}-kv`, `${name}-kv`]);

  const bundle = await fetch(`${GITHUB_RAW}/dist/worker.js`);
  if (!bundle.ok) return { ok: false, error: "دریافت آخرین نسخه ممکن نشد" };
  const code = await bundle.text();

  const bindings = kvId ? [{ type: "kv_namespace", name: "NIKA_KV", namespace_id: kvId }] : [];
  const up = await cf.uploadWorker(token, accountId, name, code, bindings);
  if (!up.ok) return { ok: false, error: up.err };

  await cf.enableWorkersDev(token, accountId, name);
  await metrics.appendActivity(env, { icon: "🔄", text: "پنل به‌روزرسانی شد", time: Date.now() });
  return { ok: true };
}
