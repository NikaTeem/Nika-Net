// Support edge-case tests — locks in the "bug-free support flow" guarantees:
// stickers/media without text never create empty tickets, banned users can't
// open tickets, and the ack/reply flow stays intact.
import worker from "./dist/bot.js";

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

const OWNER = 8940829322;
const USER = 333333333;

let msgId = 0;
const sent = [];
const edited = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith("https://api.telegram.org/bot")) {
    const method = u.split("/").pop();
    let body = {};
    try { body = JSON.parse(init.body || "{}"); } catch {}
    if (method === "sendMessage") { sent.push(body); return json({ ok: true, result: { message_id: ++msgId, chat: { id: body.chat_id } } }); }
    if (method === "editMessageText") { edited.push(body); return json({ ok: true, result: { message_id: body.message_id } }); }
    if (method === "answerCallbackQuery") return json({ ok: true });
    if (method === "getMe") return json({ ok: true, result: { id: 1, username: "NikaNetLauncher_bot" } });
    if (method === "getChat") return json({ ok: true, result: { id: body.chat_id, type: "private", first_name: "T", username: "u" } });
    if (method === "getChatMember") return json({ ok: true, result: { status: "member" } });
    return json({ ok: true, result: { message_id: ++msgId } });
  }
  return new Response("not found", { status: 404 });
};

const env = { TELEGRAM_TOKEN: "T", WEBHOOK_SECRET: "s", NIKA_SECRET: "x", BOT_KV: kv };
let pending = [];
const ctx = { waitUntil: (p) => pending.push(p) };

async function webhook(update) {
  const req = new Request("https://x/webhook", {
    method: "POST",
    headers: { "X-Telegram-Bot-Api-Secret-Token": "s", "content-type": "application/json" },
    body: JSON.stringify(update),
  });
  await worker.fetch(req, env, ctx);
  await Promise.all(pending);
  pending = [];
}

const text = (chatId, t, from) => ({ message: { chat: { id: chatId }, from: { id: from ?? chatId, first_name: "T", username: "u" }, text: t } });
const media = (chatId, sticker) => ({ message: { chat: { id: chatId }, from: { id: chatId, first_name: "T", username: "u" }, sticker: { file_id: "x" } } });
const cb = (chatId, messageId, data, from) => ({
  callback_query: { id: "cq" + Math.random(), from: { id: from ?? chatId, first_name: "T" }, message: { chat: { id: chatId }, message_id: messageId }, data },
});

const textsTo = (chatId) => sent.filter((s) => s.chat_id === chatId).map((s) => s.text);
const lastTo = (chatId) => { const t = textsTo(chatId); return t[t.length - 1]; };
const PASS = [];
const check = (name, cond) => { PASS.push([name, !!cond]); console.log((cond ? "✅" : "❌") + " " + name); };

/* 1) user picks category → await_support */
await webhook(cb(USER, 1, "sup:cat:bug"));
check("انتخاب دسته → await_support", JSON.parse(await kv.get("u:" + USER)).state === "await_support");

/* 2) sticker (no text) in await_support → ignored, no message added */
const preSticker = JSON.parse(await kv.get("sup:" + USER));
sent.length = 0;
await webhook(media(USER, true));
const postSticker = JSON.parse(await kv.get("sup:" + USER));
check("استیکر بدون متن → پیامی به تیکت اضافه نشد", postSticker.msgs.length === preSticker.msgs.length);
check("استیکر بدون متن → تأیید هم ارسال نشد", !textsTo(USER).some((t) => t.includes("تیکت")));
check("استیکر بدون متن → حالت await_support حفظ شد", JSON.parse(await kv.get("u:" + USER)).state === "await_support");

/* 3) real body → ticket created + ack */
sent.length = 0;
await webhook(text(USER, "رباتم کرش میکنه"));
const tk = JSON.parse(await kv.get("sup:" + USER));
check("بدنه → تیکت ثبت شد", !!tk && tk.msgs.some((m) => m.dir === "in" && m.text.includes("کرش")));
check("بدنه → تأیید «تیکتت ثبت شد»", textsTo(USER).some((t) => t.includes("تیکتت ثبت شد")));
check("بدنه → مالک اعلان گرفت", textsTo(OWNER).some((t) => t.includes("تیکت جدید پشتیبانی")));
check("بدنه → حالت idle شد", JSON.parse(await kv.get("u:" + USER)).state === "idle");

/* 4) banned user cannot open support */
kv.put("ban:" + USER, JSON.stringify({ chatId: USER, by: OWNER, reason: "اسپم", at: Date.now(), until: 0 }));
sent.length = 0;
await webhook(text(USER, "/support"));
check("مسدود → /support بسته شد", (lastTo(USER) || "").includes("مسدود است"));
await webhook(cb(USER, 2, "sup:cat:bug"));
check("مسدود → دکمهٔ دسته هم بسته است", (lastTo(USER) || "").includes("مسدود است"));
kv.delete("ban:" + USER);

/* 5) owner random free text → main menu, not a ticket */
sent.length = 0;
await webhook(text(OWNER, "سلام بچه‌ها"));
check("مالک پیام آزاد → منوی اصلی (نه تیکت)", (lastTo(OWNER) || "").includes("NIKA NET"));

/* 6) menu:close → حذف پیام بدون خطا */
await webhook(cb(USER, 3, "menu:close"));
check("menu:close بدون خطا", true);

const failed = PASS.filter(([, ok]) => !ok);
console.log("\n===== SUPPORT RESULT =====");
console.log(`${PASS.length - failed.length}/${PASS.length} passed`);
if (failed.length) { failed.forEach(([n]) => console.log("FAILED: " + n)); process.exit(1); }
