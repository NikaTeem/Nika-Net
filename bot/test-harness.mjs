// End-to-end harness for Support v2: runs the REAL bundled worker against a
// mocked Telegram API + in-memory KV, and verifies every support flow.
import worker from "./dist/bot.js";
import vm from "node:vm";

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

let msgId = 0;
const sent = [];   // every sendMessage payload
const edited = []; // every editMessageText payload

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
    if (method === "getMe") return json({ ok: true, result: { id: 1, username: "TestBot" } });
    if (method === "getChat") return json({ ok: true, result: { id: body.chat_id, type: "private", first_name: "T", username: "u" } });
    if (method === "getChatMember") return json({ ok: true, result: { status: "member" } });
    if (method === "getUserProfilePhotos") return json({ ok: true, result: { total_count: 0, photos: [] } });
    if (method === "editMessageText") { edited.push(body); return json({ ok: true, result: { message_id: body.message_id } }); }
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

const errors = [];
console.error = (...a) => { errors.push(a.map(String).join(" ")); };
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

async function panel(path, opts = {}) {
  const req = new Request("https://x" + path, {
    method: opts.method || "GET",
    headers: { cookie: "npanel=aaaabbbbccccddddeeee", "content-type": "application/json" },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
  const res = await worker.fetch(req, env, ctx);
  await Promise.all(pending);
  pending = [];
  let j = {};
  try { j = await res.json(); } catch {}
  return { status: res.status, ok: res.ok, j };
}

// درخواست خام پنل با کنترل کامل روی کوکی + خواندن set-cookie
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

const OWNER = 8940829322;
const msg = (chatId, text, from) => ({
  message: { chat: { id: chatId }, from: { id: from ?? chatId, first_name: "T", username: "u" }, text },
});
const cb = (chatId, messageId, data, from) => ({
  callback_query: { id: "cq" + Math.random(), from: { id: from ?? chatId, first_name: "T" }, message: { chat: { id: chatId }, message_id: messageId }, data },
});

const textsTo = (chatId) => sent.filter((s) => s.chat_id === chatId).map((s) => s.text);
const lastTo = (chatId) => { const t = textsTo(chatId); return t[t.length - 1]; };
const ack = (t) => (t || "").includes("تیکتت ثبت شد");
const replyAck = (t) => (t || "").includes("پیام شما ارسال شد");
const PASS = [];
const check = (name, cond) => { PASS.push([name, !!cond]); console.log((cond ? "✅" : "❌") + " " + name); };

// ---- 1) owner: /support → menu → category → body ----
await webhook(msg(OWNER, "/support"));
check("owner /support → منوی دسته‌ها", lastTo(OWNER).includes("موضوع تیکتت رو انتخاب کن"));
const menuId = msgId;

await webhook(cb(OWNER, menuId, "sup:cat:idea"));
check("owner انتخاب دسته → بدون تأیید زودهنگام", !textsTo(OWNER).some(ack));
check("owner انتخاب دسته → پیام «حالا بنویس» (edit)", edited.some((e) => (e.text || "").includes("حالا مشکل")));
check("owner state = await_support", JSON.parse(await kv.get("u:" + OWNER)).state === "await_support");

await webhook(msg(OWNER, "متن تیکت مالک"));
const ownerTicket = JSON.parse(await kv.get("sup:" + OWNER));
check("owner بدنهٔ تیکت ثبت شد", ownerTicket.msgs.some((m) => m.dir === "in" && m.text.includes("متن تیکت")));
check("owner بدنه → تأیید «تیکتت ثبت شد» بعد از نوشتن", ack(lastTo(OWNER)));
check("owner بدنه → فقط یک تأیید", textsTo(OWNER).filter(ack).length === 1);
check("owner state برگشت به idle", JSON.parse(await kv.get("u:" + OWNER)).state === "idle");
check("owner ticket startedBy=user", ownerTicket.startedBy === "user");

// ---- 2) user with EXISTING history: category → ack still fires ----
const TEST = 7385498647;
kv.put("sup:" + TEST, JSON.stringify({
  id: TEST, kind: "ticket", status: "open", unread: 0, lastAt: Date.now() - 3600_000,
  lastText: "قدیمی", name: "ツ", username: "zakpir",
  msgs: [{ dir: "out", text: "تست 1", at: 1 }, { dir: "in", text: "تست 2", at: 2 }],
}));
kv.put("u:" + TEST, JSON.stringify({ state: "idle", lang: "fa", tokens: {}, panels: [], panelAuth: {}, lastBuild: 0, builds: 0, tmp: {} }));
sent.length = 0;

await webhook(msg(TEST, "/support", TEST));
const menuId2 = msgId;
await webhook(cb(TEST, menuId2, "sup:cat:buy", TEST));
check("کاربرِ باسابقه → انتخاب دسته بدون تأیید زودهنگام", !textsTo(TEST).some(ack));
await webhook(msg(TEST, "یه مشکل جدید", TEST));
const t2 = JSON.parse(await kv.get("sup:" + TEST));
check("کاربرِ باسابقه → بدنه اضافه شد", t2.msgs.some((m) => m.dir === "in" && m.text.includes("یه مشکل جدید")));
check("کاربرِ باسابقه → تأیید بعد از نوشتن", ack(lastTo(TEST)));
check("کاربرِ باسابقه → فقط یک تأیید", textsTo(TEST).filter(ack).length === 1);
check("کاربرِ باسابقه → category=خرید و اشتراک", t2.category === "buy");

// ---- 3) reply to owner → «پیام شما ارسال شد» ----
const R = 6629683311;
kv.put("sup:" + R, JSON.stringify({
  id: R, kind: "dm", status: "open", unread: 0, lastAt: 1, lastText: "سلام",
  name: "Reza", username: "reza", msgs: [{ dir: "out", text: "سلام چطوری؟", at: 1 }],
}));
kv.put("u:" + R, JSON.stringify({ state: "idle", lang: "fa", tokens: {}, panels: [], panelAuth: {}, lastBuild: 0, builds: 0, tmp: {} }));
sent.length = 0;
await webhook(msg(R, "خوبم ممنون", R));
check("پاسخ به مالک → «پیام شما ارسال شد»", replyAck(lastTo(R)));

// ---- 4) panel APIs (with session cookie) ----
kv.put("panel:sess:aaaabbbbccccddddeeee", String(OWNER));

let r = await panel("/panel/api/support/list");
check("support/list فقط تیکت‌ها (startedBy=user)", r.ok && r.j.tickets.every((t) => t.startedBy === "user"));
check("support/list شامل کاربر باسابقه", r.j.tickets.some((t) => t.id === TEST));

r = await panel("/panel/api/pm/list");
check("pm/list فقط پیام‌های شخصی (startedBy=owner)", r.ok && r.j.threads.every((t) => t.startedBy === "owner"));
check("pm/list شامل گفتگوی Reza (dm مهاجرت‌شده)", r.j.threads.some((t) => t.id === R));

sent.length = 0;
r = await panel("/panel/api/pm/send", { method: "POST", body: { id: R, text: "خواهش می‌کنم" } });
const pmSent = sent.find((s) => s.chat_id === R);
check("pm/send → ارسال به کاربر", r.ok && !!pmSent);
check("pm/send → دکمهٔ «پاسخ دادن»", pmSent && JSON.stringify(pmSent.reply_markup).includes("پاسخ دادن"));
check("pm/send → پاکت حریم خصوصی", pmSent && pmSent.text.includes("پیام خصوصی از Nika Net"));

sent.length = 0;
r = await panel("/panel/api/support/reply", { method: "POST", body: { id: TEST, text: "حل شد؟" } });
const supSent = sent.find((s) => s.chat_id === TEST);
check("support/reply → ارسال به کاربر", r.ok && !!supSent);
check("support/reply → دکمهٔ «پاسخ دادن»", supSent && JSON.stringify(supSent.reply_markup).includes("پاسخ دادن"));
const t3 = JSON.parse(await kv.get("sup:" + TEST));
check("support/reply → ثبت out در تیکت", t3.msgs[t3.msgs.length - 1].dir === "out");

r = await panel("/panel/api/support/toggle", { method: "POST", body: { id: TEST } });
check("support/toggle → بستن", r.ok && r.j.status === "closed");

r = await panel("/panel/api/support/closeall", { method: "POST" });
check("support/closeall", r.ok && typeof r.j.closed === "number");

// ---- 5) migration: old `kind` field still reads correctly ----
r = await panel("/panel/api/support/list");
check("closeall بسته شد و status ها closed است", r.j.tickets.filter((t) => t.status === "open").length === 0);

// ===== 6) ورود پنل (Auth v1) =====
// 6a) اسکریپت صفحهٔ ورود باید بدون خطای نحوی رندر شود (ریگریشن: escape های \n و \d)
{
  const preq = new Request("https://x/panel", { method: "GET" });
  const pres = await worker.fetch(preq, env, ctx);
  const phtml = await pres.text();
  const pm = phtml.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  let syntaxOk = false;
  if (pm) { try { new vm.Script(pm[1]); syntaxOk = true; } catch (e) { errors.push("panel script syntax: " + e.message); } }
  check("اسکریپت صفحهٔ پنل بدون خطای نحوی", syntaxOk);
  check("پنل: هدر cache-control ضد کش", (pres.headers.get("cache-control") || "").includes("no-store"));
  check("پنل: نشانگر نسخه در HTML", phtml.includes("v0.10.4"));
}

let lr = await panelRaw("/panel/api/logininfo");
check("logininfo عمومی → مالک 8940829322", lr.ok && lr.j.ownerId === 8940829322);

lr = await panelRaw("/panel/api/request", { method: "POST", body: { id: 8940829322 } });
check("request → ok + sent:true", lr.ok && lr.j.sent === true && lr.j.bot === "TestBot");
const code1 = await kv.get("panel:code:8940829322");
check("کد در KV ذخیره شد (۶ رقمی)", /^\d{6}$/.test(code1));

lr = await panelRaw("/panel/api/request", { method: "POST", body: { id: 8940829322 } });
check("درخواست فوری دوم → sent:false (ضداسپم)", lr.ok && lr.j.sent === false);
check("کد یکسان ماند (idempotent)", (await kv.get("panel:code:8940829322")) === code1);

lr = await panelRaw("/panel/api/request", { method: "POST", body: { id: 999999999 } });
check("درخواست با آیدی غیرمالک → 403", lr.status === 403);

lr = await panelRaw("/panel/api/verify", { method: "POST", body: { id: 8940829322, code: "000000" } });
check("کد اشتباه → 401", lr.status === 401);

lr = await panelRaw("/panel/api/verify", { method: "POST", body: { id: 8940829322, code: code1 } });
check("کد درست → ok + set-cookie", lr.ok && /npanel=[a-f0-9]+/.test(lr.setCookie));
const token = (lr.setCookie.match(/npanel=([a-f0-9-]+)/) || [])[1];
check("کد بعد از ورود پاک شد", !(await kv.get("panel:code:8940829322")));

lr = await panelRaw("/panel/api/state", { cookie: "npanel=" + token });
check("نشست معتبر → /state ok", lr.ok && lr.j.bot && lr.j.stats);
lr = await panelRaw("/panel/api/state");
check("بدون کوکی → /state 401", lr.status === 401);

lr = await panelRaw("/panel/api/logout", { method: "POST", cookie: "npanel=" + token });
check("logout → ok", lr.ok);
lr = await panelRaw("/panel/api/state", { cookie: "npanel=" + token });
check("بعد از خروج → 401", lr.status === 401);

// ===== 7) ورود با رمز عبور (Auth v2 — جایگزین کد تلگرام) =====
lr = await panelRaw("/panel/api/haspassword");
check("haspassword اولیه → set:false", lr.ok && lr.j.set === false);

lr = await panelRaw("/panel/api/password", { method: "POST", body: { id: 8940829322, password: "whatever1" } });
check("ورود با رمز وقتی هنوز تنظیم نشده → 403", lr.status === 403);

lr = await panelRaw("/panel/api/setpassword", { method: "POST", body: { password: "nikapass123" } });
check("setpassword بدون نشست → 401", lr.status === 401);

// دوباره با کد وارد شو تا بتوانیم رمز بگذاریم
lr = await panelRaw("/panel/api/request", { method: "POST", body: { id: 8940829322 } });
const code2 = await kv.get("panel:code:8940829322");
lr = await panelRaw("/panel/api/verify", { method: "POST", body: { id: 8940829322, code: code2 } });
const token2 = (lr.setCookie.match(/npanel=([a-f0-9-]+)/) || [])[1];
check("ورود مجدد با کد (برای تنظیم رمز)", lr.ok && !!token2);

lr = await panelRaw("/panel/api/setpassword", { method: "POST", cookie: "npanel=" + token2, body: { password: "123" } });
check("رمز کوتاه → 400", lr.status === 400);

lr = await panelRaw("/panel/api/setpassword", { method: "POST", cookie: "npanel=" + token2, body: { password: "nikapass123" } });
check("setpassword درست → ok", lr.ok && lr.j.ok === true);

lr = await panelRaw("/panel/api/haspassword");
check("haspassword بعد از تنظیم → set:true", lr.ok && lr.j.set === true);

lr = await panelRaw("/panel/api/password", { method: "POST", body: { id: 999999999, password: "nikapass123" } });
check("رمز با آیدی غیرمالک → 401", lr.status === 401);

lr = await panelRaw("/panel/api/password", { method: "POST", body: { id: 8940829322, password: "wrong-pass" } });
check("رمز اشتباه → 401", lr.status === 401);

lr = await panelRaw("/panel/api/password", { method: "POST", body: { id: 8940829322, password: "nikapass123" } });
check("رمز درست → ok + set-cookie", lr.ok && /npanel=[a-f0-9]+/.test(lr.setCookie));
const token3 = (lr.setCookie.match(/npanel=([a-f0-9-]+)/) || [])[1];

lr = await panelRaw("/panel/api/state", { cookie: "npanel=" + token3 });
check("نشست رمز → /state ok", lr.ok && lr.j.bot && lr.j.stats);

// قفل موقت: ۵ رمز اشتباه پشت سر هم → 401 حتی با رمز درست
for (let i = 0; i < 5; i++) {
  await panelRaw("/panel/api/password", { method: "POST", body: { id: 8940829322, password: "bad-" + i } });
}
lr = await panelRaw("/panel/api/password", { method: "POST", body: { id: 8940829322, password: "nikapass123" } });
check("بعد از ۵ تلاش ناموفق → قفل موقت 401", lr.status === 401);

// پاک‌سازی برای تست‌های بعدی
await kv.delete("panel:password:");
await kv.delete("panel:pwfail:8940829322");

// ===== 8) پیام همگانی v2 (قالب برندشده + دکمه + تاریخچه) =====
await kv.put("u:555111", JSON.stringify({ chatId: 555111 }));
await kv.put("u:555222", JSON.stringify({ chatId: 555222 }));
sent.length = 0;

lr = await panelRaw("/panel/api/broadcast", { method: "POST", cookie: "npanel=" + token3, body: { text: "سلام", buttonText: "بزن", buttonUrl: "ftp://x" } });
check("برادکست: لینک دکمهٔ نامعتبر → 400", lr.status === 400);

lr = await panelRaw("/panel/api/broadcast", { method: "POST", cookie: "npanel=" + token3, body: { text: "سلام", buttonText: "بزن" } });
check("برادکست: دکمه بدون لینک → 400", lr.status === 400);

lr = await panelRaw("/panel/api/broadcast", { method: "POST", cookie: "npanel=" + token3, body: { text: "سلام <b>دنیا</b>", buttonText: "کانال", buttonUrl: "https://t.me/NikaSociety" } });
check("برادکست: ارسال → ok", lr.ok && lr.j.sent >= 0 && lr.j.total >= 1);
const lastMsg = sent[sent.length - 1];
check("برادکست: پاکت برندشده دارد", !!lastMsg && lastMsg.text.includes("پیام همگانی Nika Net"));
check("برادکست: متن مالک با HTML حفظ شد", !!lastMsg && lastMsg.text.includes("<b>دنیا</b>"));
check("برادکست: فوتر ربات دارد", !!lastMsg && lastMsg.text.endsWith("@TestBot"));
check("برادکست: دکمهٔ inline دارد", !!lastMsg && JSON.stringify(lastMsg.reply_markup).includes("NikaSociety"));

lr = await panelRaw("/panel/api/broadcast/test", { method: "POST", cookie: "npanel=" + token3, body: { text: "<b>ناقص" } });
check("برادکست: ارسال تست → ok", lr.ok && lr.j.ok);
const testMsg = sent[sent.length - 1];
check("برادکست: HTML نامتعادل → تگ حذف شد", !!testMsg && !testMsg.text.includes("<b>ناقص") && testMsg.text.includes("&lt;b&gt;ناقص"));

lr = await panelRaw("/panel/api/broadcast/history", { cookie: "npanel=" + token3 });
check("برادکست: تاریخچه ثبت و خوانده شد", lr.ok && Array.isArray(lr.j.history) && lr.j.history.length >= 1);

console.log("\nconsole errors:", errors.length ? errors.slice(0, 5) : "none");
console.log("\n===== RESULT =====");
const failed = PASS.filter((p) => !p[1]);
console.log(failed.length ? `FAILED: ${failed.length}` : "ALL PASSED ✅");
process.exit(failed.length ? 1 : 0);
