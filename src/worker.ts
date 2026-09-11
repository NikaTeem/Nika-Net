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
import * as poolprobe from "./poolprobe";
import { handleVless } from "./protocols/vless";
import { handleTrojan } from "./protocols/trojan";
import { jsonResp } from "./protocols/common";
import * as cf from "./cloudflare";
import { isCloudflareIp as isCfIp } from "./cfips";
import { renderSubPage } from "./subpage";

declare const PANEL_HTML: string;
const PANEL = PANEL_HTML; // single reference so esbuild inlines the HTML exactly once

declare const NIKA_VERSION: string;
const CUR_VERSION = NIKA_VERSION || "0.4.0";

/* ---------- online clean-IP pool ---------- */
// Community-maintained sources of Cloudflare ranges + curated clean IPs.
const IP_SOURCES = [
  "https://raw.githubusercontent.com/XIU2/CloudflareSpeedTest/master/ip.txt",
  "https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.txt",
];
const IP_RE = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g;
let ipPoolCache: { ips: string[]; at: number } | null = null;

async function fetchIpPool(): Promise<string[]> {
  if (ipPoolCache && Date.now() - ipPoolCache.at < 10 * 60_000) return ipPoolCache.ips;
  const set = new Set<string>();
  const withTimeout = (url: string) =>
    Promise.race([
      fetch(url),
      new Promise<Response>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
    ]);
  for (const src of IP_SOURCES) {
    try {
      const res = await withTimeout(src);
      const text = await res.text();
      let m: RegExpExecArray | null;
      let n = 0;
      while ((m = IP_RE.exec(text)) && n < 4000) {
        const ip = m[1];
        const o = ip.split(".").map(Number);
        if (o.every((x) => x >= 0 && x <= 255) && !ip.startsWith("0.")) { set.add(ip); n++; }
      }
    } catch { /* source down → skip */ }
  }
  const ips = [...set];
  ipPoolCache = { ips, at: Date.now() };
  return ips;
}



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
      if (m) return handleClientConfig(req, env, settings, m[1]);

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
// Relay-Test probe: `wss://<host>/<wsPath>?probe=nika` answers with a tiny
// signature frame so the panel can verify (end-to-end, from the user's
// browser) that a candidate domain really fronts THIS worker — and how fast.
function handleProbe(req: Request): Response {
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
  server.accept();
  const sig = JSON.stringify({ ok: true, panel: "nika", v: CUR_VERSION });
  try { server.send(sig); } catch { /* noop */ }
  setTimeout(() => { try { server.close(); } catch { /* noop */ } }, 2000);
  return new Response(null, { status: 101, webSocket: client });
}

async function handleWebsocket(req: Request, env: Env, settings: Settings): Promise<Response> {
  const url = new URL(req.url);
  if (url.searchParams.get("probe") === "nika") return handleProbe(req);
  const proto = (url.searchParams.get("proto") || req.headers.get("x-nika-proto") || "").toLowerCase();
  const users = await store.getUsers(env);

  // Authorization happens INSIDE the protocol handlers: the VLESS uuid / the
  // Trojan SHA-224(password) arrive in the early-data header (ed=2048) or in
  // the first WebSocket message — never in the URL. Rejecting here by a URL
  // param used to 403 every real client, so we only pre-check when a client
  // actually sends `uuid=` in the query (legacy) and defer otherwise.
  const uuidQ = url.searchParams.get("uuid") || "";
  if (uuidQ) {
    const user = users.find((u) => u.uuid.toLowerCase() === uuidQ.toLowerCase());
    if (!user) return jsonResp({ error: "no user for this uuid" }, 403);
    if (!user.active) return jsonResp({ error: "user inactive" }, 403);
    return proto === "trojan" ? handleTrojan(req, users, settings, env) : handleVless(req, users, settings, env);
  }

  if (proto === "trojan") return handleTrojan(req, users, settings, env);
  return handleVless(req, users, settings, env);
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

  // public: online clean-IP pool (fresh Cloudflare ranges + curated clean IPs)
  if (op === "ips") {
    const ips = await fetchIpPool();
    return jsonResp({ ips, count: ips.length });
  }

  // public: byte source for the panel's speed test (real proxy-path throughput)
  if (op === "speedtest") {
    const raw = url.searchParams.get("bytes") || "4194304";
    const bytes = Math.min(8 * 1024 * 1024, Math.max(64 * 1024, parseInt(raw, 10) || 4 * 1024 * 1024));
    const chunk = new Uint8Array(64 * 1024);
    crypto.getRandomValues(chunk);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        const remaining = bytes - sent;
        if (remaining <= 0) { controller.close(); return; }
        const take = Math.min(chunk.length, remaining);
        controller.enqueue(take === chunk.length ? chunk : chunk.slice(0, take));
        sent += take;
      },
    });
    return new Response(stream, {
      headers: {
        "content-type": "application/octet-stream",
        "content-length": String(bytes),
        "cache-control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  // login
  if (op === "login" && method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { password?: string };
    const pass = typeof body.password === "string" ? body.password : "";

    // First run: whatever password the admin types becomes THE admin password.
    // This path never compares against an existing hash, so it can never
    // reply "wrong password" during initial setup.
    if (!settings.adminPassHash) {
      if (pass.length < 4) return jsonResp({ error: "password too short" }, 400);
      settings.adminPassHash = await auth.sha256Hex(pass);
      try { await store.saveSettings(env, settings); } catch { /* keep in-memory hash */ }
      const token = await auth.signSession(settings.sessionSecret, JSON.stringify({ t: Date.now() }));
      try {
        await metrics.appendActivity(env, { icon: "🛠", text: "نصب اولیه پنل — رمز ادمین ثبت شد", time: Date.now() });
      } catch { /* activity log must never block login */ }
      const res = jsonResp({ ok: true, setup: true });
      res.headers.set("set-cookie", `${auth.SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`);
      return res;
    }

    // Returning admin: verify the password.
    if (settings.adminPassHash !== (await auth.sha256Hex(pass))) return jsonResp({ error: "wrong password" }, 401);
    const token = await auth.signSession(settings.sessionSecret, JSON.stringify({ t: Date.now() }));
    try {
      await metrics.appendActivity(env, { icon: "🔐", text: "ورود ادمین به پنل", time: Date.now() });
    } catch { /* activity log must never block login */ }
    const res = jsonResp({ ok: true, setup: false });
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
        const b = (await req.json().catch(() => ({}))) as Partial<Settings> & { newpass?: string };
        const next: Settings = { ...settings };
        if (typeof b.title === "string") next.title = b.title;
        if (typeof b.host === "string") next.host = b.host;
        if (typeof b.sni === "string") next.sni = b.sni;
        if (typeof b.wsPath === "string") next.wsPath = b.wsPath;
        if (Array.isArray(b.cleanIps)) next.cleanIps = b.cleanIps;
        if (Array.isArray(b.cleanIpv6)) next.cleanIpv6 = b.cleanIpv6;
        if (typeof b.fixedIp === "string") next.fixedIp = b.fixedIp.trim();
        if (typeof b.relayDomain === "string") next.relayDomain = b.relayDomain.trim();
        if (Array.isArray(b.poolIps)) next.poolIps = b.poolIps;
        if (typeof b.poolCountry === "string") next.poolCountry = b.poolCountry;
        if (typeof b.poolFlag === "string") next.poolFlag = b.poolFlag;
        if (b.protocols) next.protocols = { ...settings.protocols, ...b.protocols };
        // change admin password (min 4 chars) — hashed, never stored in plain text
        if (typeof b.newpass === "string" && b.newpass.trim()) {
          const np = b.newpass.trim();
          if (np.length < 4) return jsonResp({ error: "password too short" }, 400);
          next.adminPassHash = await auth.sha256Hex(np);
        }
        store.sanitizeSettings(next); // never persist a bad clean IP / fixed IP
        await store.saveSettings(env, next);
        try {
          await metrics.appendActivity(env, { icon: "⚙️", text: "تنظیمات پنل به‌روزرسانی شد", time: Date.now() });
        } catch { /* ignore */ }
        return jsonResp({ ok: true });
      }
      break;
    }

    case "pooltest": {
      if (method !== "POST") break;
      const b = (await req.json().catch(() => ({}))) as { list?: string[] };
      const list = Array.isArray(b.list) ? b.list.filter((x) => typeof x === "string") : [];
      if (!list.length) return jsonResp({ results: [], elapsed: 0 });
      const t0 = Date.now();
      const results = await poolprobe.probePool(list);
      // annotate each probed address: `verified` = a real Cloudflare edge
      // (official anycast range) that can front the worker. Community
      // "reverse-proxy/datacenter" IPs are alive but NOT verified edges.
      const annotated = results.map((r) => {
        const ip = (r.addr || "").split(":")[0];
        return { ...r, verified: isCfIp(ip) };
      });
      return jsonResp({ results: annotated, elapsed: Date.now() - t0 });
    }

    case "gen": {
      const id = url.searchParams.get("id");
      const users = await store.getUsers(env);
      const u = users.find((x) => x.id === id);
      if (!u) return jsonResp({ error: "user not found" }, 404);
      const eff = { ...settings, host: resolveHost(req, settings) };
      return jsonResp({
        user: { id: u.id, name: u.name, quota: u.quota, used: Math.round((u.used || 0) * 100) / 100, days: u.days, active: u.active },
        base64: gen.buildBase64Bundle(u, eff),
        clash: gen.buildClashYaml(u, eff),
        singbox: gen.buildSingboxJson(u, eff),
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
// If the admin hasn't set a real host yet (placeholder default), fall back to
// the live request host so generated configs route back to this worker.
function resolveHost(req: Request, s: Settings): string {
  const h = (s.host || "").trim();
  return h && h !== DEFAULTS.host ? h : new URL(req.url).hostname;
}

async function handleSub(req: Request, env: Env, settings: Settings, path: string): Promise<Response> {
  const rest = path.replace("/sub/", "");
  const token = rest.split("/")[0].split(".")[0];
  const fmt = rest.split(".").pop()?.toLowerCase() || "";
  const users = await store.getUsers(env);
  const user = users.find((u) => u.password === token || u.uuid.replace(/-/g, "").slice(0, 12) === token);
  if (!user) return jsonResp({ error: "invalid token" }, 404);

  // Browsers get the landing page; apps/clients get the raw config.
  // Real browsers send Sec-Fetch navigation headers — proxy apps don't, so
  // they reliably receive the config even if their Accept looks browser-like.
  const accept = req.headers.get("Accept") || "";
  const secFetchDest = req.headers.get("Sec-Fetch-Dest") || "";
  const secFetchMode = req.headers.get("Sec-Fetch-Mode") || "";
  const browserNav = secFetchDest === "document" || secFetchMode === "navigate";
  if (accept.includes("text/html") && browserNav) {
    const origin = new URL(req.url).origin;
    return new Response(
      renderSubPage({
        name: user.name,
        active: !!user.active,
        quota: Number(user.quota) || 0,
        used: Math.round((user.used || 0) * 100) / 100,
        days: Number(user.days) || 0,
        origin,
        token,
        version: CUR_VERSION,
        protocols: settings.protocols,
      }),
      { headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const isClash = fmt === "yaml" || fmt === "yml";
  const isSingbox = fmt === "json";
  const eff = { ...settings, host: resolveHost(req, settings) };
  const body = isClash
    ? gen.buildClashYaml(user, eff)
    : isSingbox
      ? gen.buildSingboxJson(user, eff)
      : gen.buildBase64Bundle(user, eff);

  return new Response(body, {
    headers: { "content-type": isClash ? "text/yaml" : isSingbox ? "application/json" : "text/plain" },
  });
}

async function handleClientConfig(req: Request, env: Env, settings: Settings, uuid: string): Promise<Response> {
  const users = await store.getUsers(env);
  const user = users.find((u) => u.uuid.toLowerCase() === uuid.toLowerCase());
  if (!user) return jsonResp({ error: "unknown uuid" }, 404);
  const eff = { ...settings, host: resolveHost(req, settings) };
  const body = gen.buildBase64Bundle(user, eff);
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
