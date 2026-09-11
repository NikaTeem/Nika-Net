// HYPER ✨ smoke test — drives the REAL bot bundle through the new tools
// (voice / cf / mtx / warp / wiz / isp / doh / frag / roadmap / tour / texts /
// promo / pin / unlock / sub / queen) with mocked Telegram + panel API.
import worker from "./dist/bot.js";

const SECRET = "test-secret";

/* ---- fake KV ---- */
class FakeKV {
  constructor() { this.map = new Map(); }
  async get(k) { return this.map.has(k) ? this.map.get(k) : null; }
  async put(k, v) { this.map.set(k, v); }
  async delete(k) { this.map.delete(k); }
  async list(opts = {}) {
    const p = opts.prefix || "";
    const names = [...this.map.keys()].filter((k) => k.startsWith(p));
    return { keys: names.map((name) => ({ name })), list_complete: true };
  }
}
const kv = new FakeKV();
kv.put("owner", "8940829322");

/* ---- AES-GCM encrypt matching crypto.ts ---- */
async function enc(plain) {
  const key = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SECRET))),
    { name: "AES-GCM" }, false, ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv); out.set(ct, iv.length);
  return Buffer.from(out).toString("base64");
}

/* ---- seed owner state with a panel + saved password ---- */
const PANEL_BASE = "https://nika-one.sub.workers.dev";
const userState = {
  state: "idle", lang: "fa", skin: "graphite",
  tokens: {}, panels: [
    { name: "nika-one", url: PANEL_BASE + "/admin", base: PANEL_BASE, account: "acc1", createdAt: Date.now() },
  ],
  panelAuth: {}, lastBuild: 0, builds: 0, tmp: {}, cfg: {},
};
userState.panelAuth["nika-one"] = { enc: await enc("nikapass123"), saved: true };
kv.put("u:8940829322", JSON.stringify(userState));

/* ---- fake panel API ---- */
const settings = { title: "Nika", host: "nika-one.sub.workers.dev", sni: "www.speedtest.net", wsPath: "/ws", protocols: { vless: true, trojan: true, warp: false } };
const panelUsers = [
  { id: "u1", name: "رضا", uuid: "11111111-1111-4111-8111-111111111111", password: "pw1", quota: 50, used: 3, days: 30, active: true },
  { id: "u2", name: "Sara", uuid: "22222222-2222-4222-8222-222222222222", password: "pw2", quota: 50, used: 10, days: 30, active: false },
];

/* ---- captured outbound ---- */
const sent = [];       // {method, url, body}
const tgSent = [];     // {method, body} for telegram
const panelPatches = []; // settings patches

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const method = (init.method || "GET").toUpperCase();
  let body = {};
  try { body = init.body ? JSON.parse(init.body) : {}; } catch {}

  if (u.startsWith("https://api.telegram.org/bot")) {
    const m = u.split("/").pop();
    tgSent.push({ method: m, body });
    if (m === "sendMessage" || m === "editMessageText") return new Response(JSON.stringify({ ok: true, result: { message_id: ++msgId, chat: { id: body.chat_id } } }));
    if (m === "answerCallbackQuery") return new Response(JSON.stringify({ ok: true }));
    if (m === "getMe") return new Response(JSON.stringify({ ok: true, result: { id: 1, username: "NikaNetLauncher_bot" } }));
    if (m === "getChat") return new Response(JSON.stringify({ ok: true, result: { id: body.chat_id, type: "private", first_name: "T", username: "u" } }));
    if (m === "getChatMember") return new Response(JSON.stringify({ ok: true, result: { status: "administrator" } }));
    return new Response(JSON.stringify({ ok: true, result: true }));
  }
  if (u.startsWith(PANEL_BASE + "/api/")) {
    const op = u.replace(PANEL_BASE + "/api/", "");
    if (op === "login") {
      const r = new Response(JSON.stringify({ ok: true }), { headers: { "set-cookie": "npanel=sess123; HttpOnly; Path=/" } });
      return r;
    }
    if (op === "status") return new Response(JSON.stringify({ title: "Nika", users: panelUsers.length, active: 1, usedGb: 13.5, requestsToday: 42123, requestsTotal: 912345, protocols: settings.protocols, version: "0.13.4" }));
    if (op === "users") return new Response(JSON.stringify(panelUsers));
    if (op === "settings" && method === "GET") return new Response(JSON.stringify(settings));
    if (op === "settings" && method === "POST") { panelPatches.push(body); Object.assign(settings, body); if (body.protocols) settings.protocols = { ...settings.protocols, ...body.protocols }; return new Response(JSON.stringify({ ok: true })); }
    if (op === "info") return new Response(JSON.stringify({ name: "Nika", setup: false, protocols: settings.protocols, version: "0.13.4" }));
  }
  if (u.includes("raw.githubusercontent.com") && u.includes("ROADMAP.md")) {
    return new Response("# Roadmap\n- [x] پنل UI\n- [ ] Fragment\n- [ ] QR\n", { headers: { "content-type": "text/plain" } });
  }
  if (u.includes("/sub/")) {
    return new Response("vless://abc", { headers: { "content-type": "text/plain" } });
  }
  return new Response(JSON.stringify({ error: "unmocked " + u }), { status: 404 });
};

let msgId = 0;
const env = { TELEGRAM_TOKEN: "t", WEBHOOK_SECRET: "w", NIKA_SECRET: SECRET, BOT_KV: kv, BOT_ADMIN_KEY: "adminkey" };
let pending = [];
const ctx = { waitUntil: (p) => { pending.push(p); } };

async function send(u) {
  pending = [];
  const req = new Request("https://x/webhook", {
    method: "POST",
    headers: { "X-Telegram-Bot-Api-Secret-Token": "w", "content-type": "application/json" },
    body: JSON.stringify(u),
  });
  const res = await worker.fetch(req, env, ctx);
  await Promise.all(pending).catch(() => {});
  return res;
}
const CHAT = 8940829322;
const cbq = (data, mid = 10) => send({ update_id: 1, callback_query: { id: "cb1", data, from: { id: CHAT, first_name: "Owner" }, message: { message_id: mid, chat: { id: CHAT } } } });
const msg = (text) => send({ update_id: 1, message: { message_id: 20, chat: { id: CHAT, type: "private" }, from: { id: CHAT, first_name: "Owner" }, text } });
const lastTg = (m) => tgSent.filter((t) => t.method === m).pop();
const anyTg = (m, needle) => tgSent.filter((t) => t.method === m).some((t) => (JSON.stringify(t.body) || "").includes(needle));

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("✅ " + name); } else { fail++; console.log("❌ " + name); } };
const contains = (name, needle, hay) => ok(name, String(hay || "").includes(needle));

/* 1. /tools command */
await msg("/tools");
contains("tools command renders menu", "ابزارها", lastTg("sendMessage")?.body?.text);

/* 2. voice menu + read */
await cbq("menu:voice");
contains("voice menu lists panel", "nika-one", lastTg("editMessageText")?.body?.text);
await cbq("voice:nika-one");
contains("voice result shows version", "0.13.4", lastTg("editMessageText")?.body?.text);
contains("voice result shows requests", "۴۲۱۲۳", lastTg("editMessageText")?.body?.text);

/* 3. cf quota */
await cbq("menu:cf");
contains("cf menu shows requests today", "۴۲۱۲۳", lastTg("editMessageText")?.body?.text);

/* 4. matrix */
await cbq("menu:mtx");
contains("matrix shows users", "👥 ۲", lastTg("editMessageText")?.body?.text);

/* 5. warp menu + toggle */
await cbq("menu:warp");
ok("warp menu lists user (button)", anyTg("editMessageText", "رضا"));
await cbq("warp:en:nika-one");
ok("warp toggle patched protocols.warp=true", panelPatches.some((p) => p.protocols && p.protocols.warp === true));
await cbq("warp:g:nika-one:u1");
contains("warp conf has PrivateKey", "PrivateKey", lastTg("editMessageText")?.body?.text);

/* 6. isp */
await cbq("menu:isp");
contains("isp menu lists mci", "همراه اول", lastTg("editMessageText")?.body?.text);
await cbq("isp:mci");
ok("isp applied sni", panelPatches.some((p) => p.sni === "www.speedtest.net"));

/* 7. wiz (SNI + WS path) */
await cbq("menu:wiz");
contains("wiz asks sni", "SNI", lastTg("editMessageText")?.body?.text);
await msg("www.speedtest.net");
contains("wiz asks ws path", "WebSocket", lastTg("sendMessage")?.body?.text);
await msg("/nika-ws");
ok("wiz patched wsPath", panelPatches.some((p) => p.wsPath === "/nika-ws"));

/* 8. doh + frag */
await cbq("menu:doh");
ok("doh shows adguard (button)", anyTg("editMessageText", "AdGuard"));
await cbq("menu:frag");
contains("frag shows preset", "Fragment", lastTg("editMessageText")?.body?.text);

/* 9. roadmap */
await cbq("menu:road");
contains("roadmap has done item", "پنل UI", lastTg("editMessageText")?.body?.text);

/* 10. tour */
await cbq("tour:0");
contains("tour step 1", "قدم ۱/۳", lastTg("editMessageText")?.body?.text);

/* 11. texts override */
await cbq("txt:tip");
await msg("نکتهٔ سفارشی من");
ok("texts saved", anyTg("sendMessage", "ثبت شد"));

/* 12. promo */
await cbq("promo:edit");
await msg("https://t.me/mychannel");
contains("promo saved", "ذخیره شد", lastTg("sendMessage")?.body?.text);

/* 13. pin set */
await cbq("pin:set");
contains("pin asks", "پین", lastTg("editMessageText")?.body?.text);
await msg("1234");
contains("pin confirm", "یک بار دیگر", lastTg("sendMessage")?.body?.text);
await msg("1234");
ok("pin set ok", anyTg("sendMessage", "قفل ست شد"));

/* 14. pin wrong then unlock */
const st2 = JSON.parse(await kv.get("u:8940829322"));
st2.cfg.unlockedAt = 0; // force lock
kv.put("u:8940829322", JSON.stringify(st2));
await msg("/menu");
contains("locked notice", "unlock", lastTg("sendMessage")?.body?.text);
await msg("/unlock 9999");
contains("wrong pin", "اشتباه", lastTg("sendMessage")?.body?.text);
await msg("/unlock 1234");
ok("unlock ok", anyTg("sendMessage", "بازه"));

/* 15. pin off */
await cbq("pin:off");
contains("pin removed", "برداشته شد", lastTg("sendMessage")?.body?.text);

/* 16. sub status */
await cbq("sub:ask");
contains("sub ask", "سابسکریپشن", lastTg("editMessageText")?.body?.text);
await msg(PANEL_BASE + "/sub/111111111111");
contains("sub result", "base64", lastTg("sendMessage")?.body?.text);

/* 17. queen easter */
await msg("/queen");
contains("queen easter", "CONNECTING INTELLIGENCE", lastTg("sendMessage")?.body?.text);

/* 18. main menu has new buttons */
await msg("/menu");
ok("main menu has tools (button)", anyTg("sendMessage", "ابزارها"));
ok("main menu has roadmap (button)", anyTg("sendMessage", "نقشه راه"));

console.log(`\n===== HYPER RESULT =====\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
