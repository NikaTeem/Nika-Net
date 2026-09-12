// Admin & ban feature tests — drives the REAL bundled worker with mocked
// Telegram + in-memory KV. Covers: promote/demote admins, timed bans with
// mandatory reason, in-bot notifications, ban gate, expiry, guards, and the
// new panel endpoints (/panel/api/admins, /ban, /unban).
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
// panel password for password-login tests (matches auth.ts salt)
kv.put("panel:password:", createHash("sha256").update("nikapanel:v1:nikapass123").digest("hex"));

const OWNER = 8940829322;
const A = 111111111; // will be promoted to admin
const B = 222222222; // regular user, will be banned

let msgId = 0;
const sent = [];       // every sendMessage payload {chat_id, text, ...}
const edited = [];     // every editMessageText payload {chat_id, text, ...}
const answered = [];   // answerCallbackQuery payloads {callback_query_id, text}

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith("https://api.telegram.org/bot")) {
    const method = u.split("/").pop();
    let body = {};
    try { body = JSON.parse(init.body || "{}"); } catch {}
    if (method === "sendMessage") {
      sent.push(body);
      return json({ ok: true, result: { message_id: ++msgId, chat: { id: body.chat_id } } });
    }
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

const env = {
  TELEGRAM_TOKEN: "TEST",
  WEBHOOK_SECRET: "sec",
  NIKA_SECRET: "x",
  BOT_ADMIN_KEY: "k",
  BOT_KV: kv,
};

let pending = [];
const ctx = { waitUntil: (p) => pending.push(p) };

async function webhook(update) {
  const req = new Request("https://x/webhook", {
    method: "POST",
    headers: { "X-Telegram-Bot-Api-Secret-Token": "sec", "content-type": "application/json" },
    body: JSON.stringify(update),
  });
  const res = await worker.fetch(req, env, ctx);
  await Promise.all(pending);
  pending = [];
  return res;
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

const msg = (chatId, text, from) => ({
  message: { chat: { id: chatId }, from: { id: from ?? chatId, first_name: "T", username: "u" }, text },
});
const cb = (chatId, messageId, data, from) => ({
  callback_query: { id: "cq" + Math.random(), from: { id: from ?? chatId, first_name: "T" }, message: { chat: { id: chatId }, message_id: messageId }, data },
});

const textsTo = (chatId) => sent.filter((s) => s.chat_id === chatId).map((s) => s.text);
const lastTo = (chatId) => { const t = textsTo(chatId); return t[t.length - 1]; };
const anyTextsTo = (chatId) => [
  ...sent.filter((s) => s.chat_id === chatId).map((s) => s.text),
  ...edited.filter((s) => s.chat_id === chatId).map((s) => s.text),
];
const lastAnyTo = (chatId) => { const t = anyTextsTo(chatId); return t[t.length - 1]; };
const PASS = [];
const check = (name, cond, extra) => { PASS.push([name, !!cond]); console.log((cond ? "✅" : "❌") + " " + name + (cond ? "" : "  → " + (extra ?? ""))); };

const adminsKV = async () => { const raw = await kv.get("admins"); return raw ? JSON.parse(raw) : []; };
const banKV = async (id) => { const raw = await kv.get("ban:" + id); return raw ? JSON.parse(raw) : null; };

/* ===== 1) owner /admin → admin menu ===== */
await webhook(msg(OWNER, "/admin"));
check("owner /admin → منوی مدیریت", anyTextsTo(OWNER).some((t) => t.includes("مدیریت ربات") && t.includes("ادمین")));

/* ===== 2) non-owner cannot open /admin ===== */
sent.length = 0;
await webhook(msg(B, "/admin"));
check("کاربر عادی /admin → owner_only", (lastTo(B) || "").includes("فقط") || (lastTo(B) || "").includes("Owner"));

/* ===== 3) promote admin (in-bot) — picker → confirm ===== */
sent.length = 0;
await webhook(cb(OWNER, 10, "adm:add"));
check("adm:add → prompt", (lastTo(OWNER) || "").includes("فوروارد"));
sent.length = 0;
await webhook(msg(OWNER, "111111111"));
check("promote: scope picker shown", (lastTo(OWNER) || "").includes("تعیین دسترسی") || (lastTo(OWNER) || "").includes("خلاصه"));
await webhook(cb(OWNER, 30, "ar:confirm"));
check("promote: ادمین به KV اضافه شد", (await adminsKV()).includes(A));
check("promote: کاربر اعلان گرفت", textsTo(A).some((t) => t.includes("به‌عنوان ادمین Nika Net منصوب شدی")));
check("promote: مالک تأیید گرفت", anyTextsTo(OWNER).some((t) => t.includes("ذخیره شد")));

/* ===== 4) admin list + demote ===== */
sent.length = 0;
await webhook(cb(OWNER, 11, "adm:list"));
check("adm:list → نام کاربر دیده می‌شود", anyTextsTo(OWNER).some((t) => t.includes("111111111")));
sent.length = 0;
await webhook(cb(OWNER, 12, "adm:del:" + A));
check("demote: از KV حذف شد", !(await adminsKV()).includes(A));
check("demote: کاربر اعلان گرفت", textsTo(A).some((t) => t.includes("دسترسی ادمینِ تو")));
check("demote: مالک تأیید گرفت", anyTextsTo(OWNER).some((t) => t.includes("برداشته شد")));

/* ===== 5) ban flow with mandatory reason (in-bot) ===== */
await webhook(msg(OWNER, "/admin"));
sent.length = 0;
await webhook(cb(OWNER, 13, "ban:new"));
check("ban:new → prompt", (lastTo(OWNER) || "").includes("فوروارد"));
sent.length = 0;
await webhook(msg(OWNER, "222222222"));
check("ban: آیدی → انتخاب مدت", (lastTo(OWNER) || "").includes("مدت مسدودی"));
sent.length = 0;
await webhook(cb(OWNER, 14, "ban:dur:1h"));
check("ban:dur → پرسش دلیل", anyTextsTo(OWNER).some((t) => t.includes("دلیل مسدودسازی")));
sent.length = 0;
await webhook(msg(OWNER, "ارسال اسپم به همه"));
const banRec = await banKV(B);
check("ban: رکورد ذخیره شد", !!banRec && banRec.reason === "ارسال اسپم به همه" && banRec.until > Date.now());
check("ban: کاربر اعلان گرفت", textsTo(B).some((t) => t.includes("مسدود شد") && t.includes("ارسال اسپم به همه")));
check("ban: مالک تأیید گرفت", anyTextsTo(OWNER).some((t) => t.includes("مسدود شد")));

/* ===== 6) ban gate: banned user can't use the bot ===== */
sent.length = 0;
await webhook(msg(B, "/menu"));
check("مسدود: /menu → پیام مسدودی", (lastTo(B) || "").includes("مسدود است"));
check("مسدود: منوی اصلی نیامد", !(lastTo(B) || "").includes("NIKA NET"));
sent.length = 0;
await webhook(cb(B, 15, "menu:main"));
check("مسدود: دکمه هم بسته است", (lastTo(B) || "").includes("مسدود است"));

/* ===== 7) unban (in-bot) ===== */
sent.length = 0;
await webhook(cb(OWNER, 16, "ban:unban:" + B));
check("unban: رکورد پاک شد", !(await banKV(B)));
check("unban: کاربر اعلان گرفت", textsTo(B).some((t) => t.includes("دوباره باز شد")));
sent.length = 0;
await webhook(msg(B, "/menu"));
check("unban: منو برمی‌گردد", (lastTo(B) || "").includes("NIKA NET"));

/* ===== 8) timed ban auto-expiry ===== */
kv.put("ban:" + B, JSON.stringify({ chatId: B, by: OWNER, reason: "تست", at: Date.now(), until: Date.now() - 1000 }));
sent.length = 0;
await webhook(msg(B, "/menu"));
check("منقضی: مسدود منقضی رفع می‌شود (منو می‌آید)", (lastTo(B) || "").includes("NIKA NET"));

/* ===== 9) guards ===== */
const r1 = await adminsKV();
await webhook(cb(B, 17, "adm:add"));
check("غیرمالک نمی‌تواند ادمین اضافه کند", (await adminsKV()).length === r1.length);

// promote A again to test "cannot ban admin" + "admin can ban"
await webhook(cb(OWNER, 18, "adm:add"));
await webhook(msg(OWNER, "111111111"));
await webhook(cb(OWNER, 31, "ar:confirm"));
check("re-promote: A دوباره ادمین شد", (await adminsKV()).includes(A));

// admin can ban a regular user
sent.length = 0;
await webhook(cb(A, 19, "ban:new"));
check("ادمین می‌تواند ban:new بزند", (lastTo(A) || "").includes("فوروارد"));
await webhook(msg(A, "222222222"));
await webhook(cb(A, 20, "ban:dur:1d"));
await webhook(msg(A, "بی‌احترامی"));
const banByAdmin = await banKV(B);
check("ادمین می‌تواند مسدود کند (by=ادمین)", !!banByAdmin && banByAdmin.by === A);
await webhook(cb(A, 21, "ban:unban:" + B));

// owner cannot ban an admin
await webhook(msg(OWNER, "/admin"));
sent.length = 0;
await webhook(cb(OWNER, 22, "ban:new"));
await webhook(msg(OWNER, "111111111"));
check("مالک نمی‌تواند ادمین را مسدود کند", textsTo(OWNER).some((t) => t.includes("قابل مسدودسازی نیستند")));

// cleanup: demote A
await webhook(cb(OWNER, 23, "adm:del:" + A));

/* ===== 10) panel endpoints ===== */
// owner password login
let lr = await panelRaw("/panel/api/password", { method: "POST", body: { id: OWNER, password: "nikapass123" } });
const ownerTok = (lr.setCookie.match(/npanel=([a-f0-9-]+)/) || [])[1];
check("panel: ورود مالک با رمز", lr.ok && !!ownerTok);

lr = await panelRaw("/panel/api/admins", { cookie: "npanel=" + ownerTok });
check("panel: GET admins → ok + isOwner", lr.ok && lr.j.isOwner === true && Array.isArray(lr.j.admins));

lr = await panelRaw("/panel/api/admins", { method: "POST", cookie: "npanel=" + ownerTok, body: { action: "add", id: B } });
check("panel: POST admins add → ok + اعلان", lr.ok && (await adminsKV()).includes(B) && textsTo(B).some((t) => t.includes("منصوب شدی")));

lr = await panelRaw("/panel/api/admins", { method: "POST", cookie: "npanel=" + ownerTok, body: { action: "remove", id: B } });
check("panel: POST admins remove → ok + اعلان", lr.ok && !(await adminsKV()).includes(B) && textsTo(B).some((t) => t.includes("برداشته شد")));

lr = await panelRaw("/panel/api/ban", { method: "POST", cookie: "npanel=" + ownerTok, body: { id: B, until: 0, reason: "" } });
check("panel: ban بدون دلیل → 400", lr.status === 400);

lr = await panelRaw("/panel/api/ban", { method: "POST", cookie: "npanel=" + ownerTok, body: { id: B, until: 0, reason: "اسپم از پنل" } });
check("panel: ban → ok + اعلان + رکورد", lr.ok && !!banKV && textsTo(B).some((t) => t.includes("مسدود شد")), "");

lr = await panelRaw("/panel/api/ban", { method: "POST", cookie: "npanel=" + ownerTok, body: { id: OWNER, until: 0, reason: "x" } });
check("panel: ban مالک → 400", lr.status === 400);

lr = await panelRaw("/panel/api/unban", { method: "POST", cookie: "npanel=" + ownerTok, body: { id: B } });
check("panel: unban → ok + اعلان", lr.ok && textsTo(B).some((t) => t.includes("دوباره باز شد")));

// admin login + permission boundaries
await webhook(cb(OWNER, 24, "adm:add"));
await webhook(msg(OWNER, "111111111"));
await webhook(cb(OWNER, 32, "ar:confirm"));
lr = await panelRaw("/panel/api/password", { method: "POST", body: { id: A, password: "nikapass123" } });
const adminTok = (lr.setCookie.match(/npanel=([a-f0-9-]+)/) || [])[1];
check("panel: ورود ادمین با رمز", lr.ok && !!adminTok);

lr = await panelRaw("/panel/api/state", { cookie: "npanel=" + adminTok });
check("panel: state برای ادمین + role=admin", lr.ok && lr.j.role === "admin");

lr = await panelRaw("/panel/api/admins", { method: "POST", cookie: "npanel=" + adminTok, body: { action: "add", id: B } });
check("panel: ادمین نمی‌تواند ادمین اضافه کند → 403", lr.status === 403);

lr = await panelRaw("/panel/api/ban", { method: "POST", cookie: "npanel=" + adminTok, body: { id: B, until: 3600000, reason: "ادمین مسدود کرد" } });
check("panel: ادمین می‌تواند مسدود کند → ok", lr.ok && lr.j.bans.some((b) => b.chatId === B));
await panelRaw("/panel/api/unban", { method: "POST", cookie: "npanel=" + adminTok, body: { id: B } });

// code login stays owner-only
lr = await panelRaw("/panel/api/request", { method: "POST", body: { id: A } });
check("panel: کد ورود فقط مالک (ادمین → 403)", lr.status === 403);

/* ===== summary ===== */
const failed = PASS.filter(([, ok]) => !ok);
console.log("\n===== ADMIN RESULT =====");
console.log(`${PASS.length - failed.length}/${PASS.length} passed`);
if (failed.length) { failed.forEach(([n]) => console.log("FAILED: " + n)); process.exit(1); }
