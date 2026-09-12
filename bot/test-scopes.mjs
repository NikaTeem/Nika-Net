// Granular admin permissions (RBAC) tests — drives the REAL bundled worker.
// Covers: picking exact scopes via the picker, per-scope enforcement in the
// bot (bans/broadcast/admins) and panel login (panel scope), editing scopes
// of an existing admin, and anti-escalation for super admins.
import worker from "./dist/bot.js";
import { createHash } from "node:crypto";

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });

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
kv.put("panel:password:", createHash("sha256").update("nikapanel:v1:nikapass123").digest("hex"));

const OWNER = 8940829322;
const A = 111111111; // becomes a bans-only admin
const S = 333333333; // becomes a super admin
const C = 444444444; // target of S's attempt

let msgId = 0;
const sent = [];
const edited = [];
const answered = [];

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith("https://api.telegram.org/bot")) {
    const method = u.split("/").pop();
    let body = {};
    try { body = JSON.parse(init.body || "{}"); } catch {}
    if (method === "sendMessage") { sent.push(body); return json({ ok: true, result: { message_id: ++msgId } }); }
    if (method === "editMessageText") { edited.push(body); return json({ ok: true, result: { message_id: body.message_id } }); }
    if (method === "answerCallbackQuery") { answered.push(body); return json({ ok: true }); }
    if (method === "getMe") return json({ ok: true, result: { id: 1, username: "NikaNetLauncher_bot" } });
    if (method === "getChat") return json({ ok: true, result: { id: body.chat_id, type: "private", first_name: "T", username: "u" } });
    if (method === "getChatMember") return json({ ok: true, result: { status: "member" } });
    if (method === "getUserProfilePhotos") return json({ ok: true, result: { total_count: 0, photos: [] } });
    return json({ ok: true, result: { message_id: ++msgId } });
  }
  return new Response("not found", { status: 404 });
};

const env = { TELEGRAM_TOKEN: "TEST", WEBHOOK_SECRET: "sec", NIKA_SECRET: "x", BOT_ADMIN_KEY: "k", BOT_KV: kv };
let pending = [];
const ctx = { waitUntil: (p) => pending.push(p) };

async function webhook(update) {
  const req = new Request("https://x/webhook", {
    method: "POST",
    headers: { "X-Telegram-Bot-Api-Secret-Token": "sec", "content-type": "application/json" },
    body: JSON.stringify(update),
  });
  await worker.fetch(req, env, ctx);
  await Promise.all(pending);
  pending = [];
}

async function panelRaw(path, opts = {}) {
  const headers = { "content-type": "application/json" };
  if (opts.cookie) headers.cookie = opts.cookie;
  const req = new Request("https://x" + path, {
    method: opts.method || "GET",
    headers,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
  const res = await worker.fetch(req, env, ctx);
  await Promise.all(pending);
  pending = [];
  let j = {};
  try { j = await res.json(); } catch {}
  return { status: res.status, ok: res.ok, j, setCookie: res.headers.get("set-cookie") || "" };
}

const msg = (chatId, text, from) => ({ message: { chat: { id: chatId }, from: { id: from ?? chatId, first_name: "T", username: "u" }, text } });
const cb = (chatId, data, from) => ({ callback_query: { id: "cq" + Math.random(), from: { id: from ?? chatId, first_name: "T" }, message: { chat: { id: chatId }, message_id: ++msgId }, data } });

const textsTo = (chatId) => sent.filter((s) => s.chat_id === chatId).map((s) => s.text);
const lastTo = (chatId) => { const t = textsTo(chatId); return t[t.length - 1]; };

const PASS = [];
const check = (name, cond, extra) => { PASS.push([name, !!cond]); console.log((cond ? "✅" : "❌") + " " + name + (cond ? "" : "  → " + (extra ?? ""))); };
const adminRec = async (id) => { const raw = await kv.get("adm:" + id); return raw ? JSON.parse(raw) : null; };

/* ===== 1) add A with ONLY bans ===== */
await webhook(cb(OWNER, "adm:add"));
await webhook(msg(OWNER, String(A)));
check("picker shown for A", (lastTo(OWNER) || "").includes("تعیین دسترسی"));
// default = full admin (everything except admins). Turn off all but bans.
for (const sc of ["support", "users", "broadcast", "forcedjoin", "panel"]) {
  await webhook(cb(OWNER, `ar:toggle:${sc}`));
}
await webhook(cb(OWNER, "ar:confirm"));
const recA = await adminRec(A);
check("A stored with bans only", !!recA && JSON.stringify(recA.scopes) === JSON.stringify(["bans"]), JSON.stringify(recA && recA.scopes));
check("A notified with scopes", textsTo(A).some((t) => t.includes("منصوب شدی") && t.includes("دسترسی")));

/* ===== 2) enforcement in bot ===== */
sent.length = 0;
await webhook(cb(A, "ban:new"));
check("A can ban:new (bans ✓)", (lastTo(A) || "").includes("فوروارد"));
sent.length = 0;
await webhook(msg(A, "/broadcast ok"));
check("A blocked from /broadcast (no broadcast)", (lastTo(A) || "").includes("فقط") || (lastTo(A) || "").includes("Owner"));
sent.length = 0; answered.length = 0;
await webhook(cb(A, "adm:list"));
check("A blocked from adm:list (no admins)", answered.length === 0 || !textsTo(A).some((t) => t.includes("لیست ادمین")));

/* ===== 3) panel login gated by panel scope ===== */
let lr = await panelRaw("/panel/api/password", { method: "POST", body: { id: A, password: "nikapass123" } });
check("A without panel scope → login rejected", !lr.ok, "status=" + lr.status);

/* ===== 4) owner edits A: grant panel + users ===== */
await webhook(cb(OWNER, "ar:edit:" + A));
const allOwnerTexts = [...sent, ...edited].filter((s) => s.chat_id === OWNER).map((s) => s.text).join(" | ");
check("edit picker shown for A", allOwnerTexts.includes("تعیین دسترسی"), allOwnerTexts.slice(0, 120));
await webhook(cb(OWNER, "ar:toggle:panel"));
await webhook(cb(OWNER, "ar:toggle:users"));
await webhook(cb(OWNER, "ar:confirm"));
const recA2 = await adminRec(A);
check("A now has bans+panel+users", !!recA2 && JSON.stringify([...recA2.scopes].sort()) === JSON.stringify(["bans", "panel", "users"].sort()), JSON.stringify(recA2 && recA2.scopes));

lr = await panelRaw("/panel/api/password", { method: "POST", body: { id: A, password: "nikapass123" } });
const aTok = (lr.setCookie.match(/npanel=([a-f0-9-]+)/) || [])[1];
check("A with panel scope → login ok", lr.ok && !!aTok);
lr = await panelRaw("/panel/api/state", { cookie: "npanel=" + aTok });
check("panel state role=admin + scopes", lr.ok && lr.j.role === "admin" && (lr.j.scopes || []).includes("panel"), JSON.stringify(lr.j && lr.j.scopes));
lr = await panelRaw("/panel/api/users", { cookie: "npanel=" + aTok });
check("panel users allowed (users ✓)", lr.ok);
lr = await panelRaw("/panel/api/admins", { cookie: "npanel=" + aTok });
check("panel admins denied (no admins)", lr.status === 403);

/* ===== 5) super admin can manage admins but can't escalate ===== */
await webhook(cb(OWNER, "adm:add"));
await webhook(msg(OWNER, String(S)));
await webhook(cb(OWNER, "ar:preset:super"));
await webhook(cb(OWNER, "ar:confirm"));
const recS = await adminRec(S);
check("S stored with ALL scopes (super)", !!recS && recS.scopes.includes("admins"), JSON.stringify(recS && recS.scopes));

// S adds C — the picker for S must not offer `admins` (no escalation)
await webhook(cb(S, "adm:add"));
await webhook(msg(S, String(C)));
const pickerText = lastTo(S) || "";
check("S picker hides admins toggle", !pickerText.includes("مدیریت ادمین‌ها"), pickerText.slice(0, 120));
await webhook(cb(S, "ar:preset:full"));
await webhook(cb(S, "ar:confirm"));
const recC = await adminRec(C);
check("C added by S without admins scope", !!recC && !recC.scopes.includes("admins"), JSON.stringify(recC && recC.scopes));

// S tries to toggle `admins` directly → must be ignored/fail (no record change)
await webhook(cb(S, "ar:edit:" + C));
await webhook(cb(S, "ar:toggle:admins"));
await webhook(cb(S, "ar:confirm"));
const recC2 = await adminRec(C);
check("C still has no admins scope after S's attempt", !!recC2 && !recC2.scopes.includes("admins"), JSON.stringify(recC2 && recC2.scopes));

/* ===== 6) regular user can't touch the picker ===== */
await webhook(cb(C, "adm:add"));
check("user without admins can't open adm:add", answered.length >= 0 && !textsTo(C).some((t) => t.includes("فوروارد")));

console.log("\n===== SCOPES RESULT =====\n" + PASS.filter(([, ok]) => ok).length + "/" + PASS.length + " passed");
process.exit(PASS.some(([, ok]) => !ok) ? 1 : 0);
