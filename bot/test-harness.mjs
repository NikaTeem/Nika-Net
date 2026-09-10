// End-to-end harness: runs the REAL bundled worker against a mocked Telegram
// API + in-memory KV, and replays the exact support-ticket flow.
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

let msgId = 0;
const sent = []; // every sendMessage payload

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
    if (method === "editMessageText") return json({ ok: true, result: { message_id: body.message_id } });
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
const origErr = console.error;
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

const OWNER = 8940829322;
const msg = (chatId, text, from) => ({
  message: { chat: { id: chatId }, from: { id: from ?? chatId, first_name: "Owner" }, text },
});
const cb = (chatId, messageId, data, from) => ({
  callback_query: { id: "cq" + Math.random(), from: { id: from ?? chatId, first_name: "Owner" }, message: { chat: { id: chatId }, message_id: messageId }, data },
});

const textsTo = (chatId) => sent.filter((s) => s.chat_id === chatId).map((s) => s.text);
const lastTo = (chatId) => { const t = textsTo(chatId); return t[t.length - 1]; };

// ===== run =====
await webhook(msg(OWNER, "/support"));            // 1) open support menu
console.log("after /support, owner got:", JSON.stringify(lastTo(OWNER)));
const menuId = msgId;                              // the supportMenu message id

await webhook(cb(OWNER, menuId, "sup:cat:idea"));  // 2) pick category
console.log("after category pick, owner got:", JSON.stringify(lastTo(OWNER)));
console.log("owner state:", await kv.get("u:" + OWNER));

const before = sent.length;
await webhook(msg(OWNER, "تست پشتیبانی"));          // 3) type ticket body
console.log("after body, owner got:", JSON.stringify(lastTo(OWNER)));
console.log("owner state:", await kv.get("u:" + OWNER));
const ticket = JSON.parse(await kv.get("sup:" + OWNER));
console.log("owner ticket msgs:", JSON.stringify(ticket.msgs));

// ===== assert scenario 1 (owner, fresh) =====
let allTexts = textsTo(OWNER);
console.log("ACK present after body:", allTexts.some((t) => t.includes("تیکتت ثبت شد")));
console.log("ticket has body msg:", ticket.msgs.some((m) => m.dir === "in" && m.text.includes("تست پشتیبانی")));
console.log("console errors:", errors.length ? errors.slice(0, 5) : "none");

// ===== scenario 2: test user with EXISTING history (the live failing case) =====
const TEST = 7385498647;
// prefill an old ticket with prior "in" messages — exactly like the live data
kv.put(
  "sup:" + TEST,
  JSON.stringify({
    id: TEST, kind: "ticket", status: "open", unread: 0,
    lastAt: Date.now() - 3600_000, lastText: "تست قدیمی", name: "ツ", username: "zakpir",
    msgs: [
      { dir: "out", text: "تست 1", at: Date.now() - 5000_000 },
      { dir: "in", text: "تست 2", at: Date.now() - 4000_000 },
    ],
  })
);
kv.put("u:" + TEST, JSON.stringify({ state: "idle", lang: "fa", tokens: {}, panels: [], panelAuth: {}, lastBuild: 0, builds: 0, tmp: {} }));

sent.length = 0;
await webhook(msg(TEST, "/support", TEST));            // open support menu
const menuId2 = msgId;
const before2 = sent.length;
await webhook(cb(TEST, menuId2, "sup:cat:buy", TEST)); // pick category
const afterCategoryPick = textsTo(TEST);
console.log("\n[user with history] after category pick got:", JSON.stringify(afterCategoryPick));
console.log("[user with history] ACK at category pick:", afterCategoryPick.some((t) => t.includes("تیکتت ثبت شد")));

await webhook(msg(TEST, "یه مشکل جدید", TEST));        // type body
console.log("[user with history] after body got:", JSON.stringify(lastTo(TEST)));
const t2 = JSON.parse(await kv.get("sup:" + TEST));
console.log("[user with history] ticket msgs now:", JSON.stringify(t2.msgs.map((m) => [m.dir, m.text])));
console.log("[user with history] duplicate ACK after body:", textsTo(TEST).filter((t) => t.includes("تیکتت ثبت شد")).length > 1);
console.log("console errors:", errors.length ? errors.slice(0, 5) : "none");

// ===== scenario 3: user replies to an owner message → should get «پیام شما ارسال شد» =====
const R = 6629683311;
kv.put(
  "sup:" + R,
  JSON.stringify({
    id: R, kind: "dm", status: "open", unread: 0,
    lastAt: Date.now() - 1000, lastText: "سلام", name: "Reza", username: "reza",
    msgs: [{ dir: "out", text: "سلام چطوری؟", at: Date.now() - 60000 }],
  })
);
kv.put("u:" + R, JSON.stringify({ state: "idle", lang: "fa", tokens: {}, panels: [], panelAuth: {}, lastBuild: 0, builds: 0, tmp: {} }));
sent.length = 0;
await webhook(msg(R, "خوبم ممنون", R));
console.log("\n[reply to owner] user got:", JSON.stringify(lastTo(R)));
console.log("[reply to owner] pmReplyAck present:", textsTo(R).some((t) => t.includes("پیام شما ارسال شد")));
console.log("console errors:", errors.length ? errors.slice(0, 5) : "none");

