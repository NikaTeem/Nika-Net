// Forced-join engine tests — drives the REAL bundled worker with a stateful
// Telegram mock. Covers:
//   1. first /start gate → join prompt (blocked) for a non-member
//   2. verify button → live check (fails with missing-chat names, then passes)
//   3. chat_member leave → user notified + cache cleared + chat STAYS in config
//   4. chat_member join → cache cleared, event recorded
//   5. mode=all requires every chat
//   6. my_chat_member (bot demoted) still removes the chat (bot-level, not user)
import worker from "./dist/bot.js";

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ✅", name); }
  else { fail++; console.log("  ❌", name, extra ? "— " + extra : ""); }
};

class FakeKV {
  constructor() { this.map = new Map(); }
  async get(k) { return this.map.has(k) ? this.map.get(k) : null; }
  async put(k, v, o = {}) { this.map.set(k, v); }
  async delete(k) { this.map.delete(k); }
  async list(opts = {}) {
    const p = opts.prefix || "";
    const names = [...this.map.keys()].filter((k) => k.startsWith(p));
    return { keys: names.map((name) => ({ name })), list_complete: true };
  }
}

const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/json" } });

// stateful Telegram mock
let chatMembers = {}; // "chatId:userId" -> status
let botStatus = {};   // chatId -> "administrator" | "left" | ...
let sent = [];        // sendMessage payloads
let answered = [];    // answerCallbackQuery payloads
let edited = [];
let rightsCalls = []; // setMyDefaultAdministratorRights payloads

globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (!u.startsWith("https://api.telegram.org/bot")) return new Response("nf", { status: 404 });
  const method = u.split("/").pop().split("?")[0];
  let body = {};
  try { body = JSON.parse(init.body || "{}"); } catch {}
  if (method === "sendMessage") { sent.push(body); return json({ ok: true, result: { message_id: 1 } }); }
  if (method === "answerCallbackQuery") { answered.push(body); return json({ ok: true }); }
  if (method === "editMessageText") { edited.push(body); return json({ ok: true }); }
  if (method === "setMyDefaultAdministratorRights") { rightsCalls.push(body); return json({ ok: true, result: true }); }
  if (method === "getMe") return json({ ok: true, result: { id: 999, username: "NikaLauncherBot" } });
  if (method === "getChat") {
    const cid = String(body.chat_id);
    return json({ ok: true, result: { id: cid, title: cid === "-100111" ? "کانال رسمی" : cid === "-100222" ? "گروه رسمی" : "چت", type: "channel", username: cid === "-100111" ? "NikaSociety" : cid === "-100222" ? "NikaGroup" : undefined } });
  }
  if (method === "getChatMember") {
    const key = String(body.chat_id) + ":" + body.user_id;
    let status = chatMembers[key] || (String(body.user_id) === "999" ? (botStatus[String(body.chat_id)] || "left") : "left");
    return json({ ok: true, result: { status, is_member: status === "member" || status === "restricted" ? true : undefined } });
  }
  return json({ ok: true, result: {} });
};

const OWNER = 8940829322;
const USER = 123456789;
const CH = "-100111"; // channel
const GR = "-100222"; // group

const kv = new FakeKV();
kv.put("owner", String(OWNER));
kv.put("u:" + USER, JSON.stringify({ state: "idle", lang: "fa", tokens: {}, panels: [], panelAuth: {}, lastBuild: 0, builds: 0, tmp: {}, cfg: {} }));
kv.put("fj:config", JSON.stringify({
  enabled: true,
  chats: [CH, GR],
  mode: "all",
  message: "برای استفاده از ربات، اول عضو شو 👇",
  buttonText: "✅ عضویت انجام شد — بررسی کن",
  recheckHours: 0,
  exempt: [],
  chatMeta: { [CH]: { title: "کانال رسمی", username: "NikaSociety", type: "channel", updatedAt: Date.now() }, [GR]: { title: "گروه رسمی", type: "supergroup", updatedAt: Date.now() } },
  applyTo: "all", legacy: [], verifyMessage: "", promptCooldownMin: 0,
}));
botStatus[CH] = "administrator";
botStatus[GR] = "administrator";

const env = {
  TELEGRAM_TOKEN: "TEST", WEBHOOK_SECRET: "sec", NIKA_SECRET: "x", BOT_ADMIN_KEY: "k", BOT_KV: kv,
};
let pending = [];
const ctx = { waitUntil: (p) => pending.push(p) };

async function webhook(update) {
  sent = []; answered = []; edited = []; rightsCalls = [];
  const req = new Request("https://x/webhook", {
    method: "POST",
    headers: { "X-Telegram-Bot-Api-Secret-Token": "sec", "content-type": "application/json" },
    body: JSON.stringify(update),
  });
  await worker.fetch(req, env, ctx);
  await Promise.all(pending);
  pending = [];
}

const msg = (id, text) => ({ message_id: 1, chat: { id }, from: { id, first_name: "T" }, text });

console.log("—— 1. non-member /start is gated ——");
chatMembers[CH + ":" + USER] = "left";
chatMembers[GR + ":" + USER] = "left";
await webhook({ update_id: 1, message: msg(USER, "/start") });
check("blocked: join prompt sent", sent.some((s) => s.text && s.text.includes("عضویت اجباری")), JSON.stringify(sent.map((s) => s.text).slice(0, 1)));
check("prompt lists BOTH chats", sent.some((s) => s.text && s.text.includes("کانال رسمی") && s.text.includes("گروه رسمی")));
check("no main menu leaked", !sent.some((s) => s.text && s.text.includes("لانچر پنل")));

console.log("—— 2. verify fails while missing one chat (live, names it) ——");
chatMembers[CH + ":" + USER] = "member"; // joined channel only
await webhook({ update_id: 2, callback_query: { id: "cq1", from: { id: USER, first_name: "T" }, message: { message_id: 10, chat: { id: USER } }, data: "fj:verify" } });
check("verify fail alert names missing chat", answered.some((a) => a.text && a.text.includes("گروه رسمی")), JSON.stringify(answered));

console.log("—— 3. join BOTH → verify passes + welcome ——");
chatMembers[GR + ":" + USER] = "member";
await webhook({ update_id: 3, callback_query: { id: "cq2", from: { id: USER, first_name: "T" }, message: { message_id: 11, chat: { id: USER } }, data: "fj:verify" } });
check("verify ok", answered.some((a) => a.text && a.text.includes("تأیید شد")));
check("welcome + main menu sent", sent.some((s) => s.text && s.text.includes("خوش آمدی")) && sent.some((s) => s.text && s.text.includes("لانچر پنل")));

console.log("—— 4. user leaves the GROUP → notified + config intact ——");
await webhook({ update_id: 4, chat_member: {
  chat: { id: GR, type: "supergroup", title: "گروه رسمی" },
  from: { id: USER, first_name: "T" },
  date: Date.now(),
  old_chat_member: { user: { id: USER }, status: "member" },
  new_chat_member: { user: { id: USER }, status: "left" },
} });
check("leave notice DM sent", sent.some((s) => s.text && s.text.includes("خارج شدی")), JSON.stringify(sent.map((s) => s.text)));
check("leave notice names the group", sent.some((s) => s.text && s.text.includes("گروه رسمی")));
const cfgAfterLeave = JSON.parse(await kv.get("fj:config"));
check("CRITICAL: group still in config", cfgAfterLeave.chats.includes(GR) && cfgAfterLeave.chats.includes(CH), JSON.stringify(cfgAfterLeave.chats));
check("join cache cleared", (await kv.get("fj:ok:" + USER)) === null);

console.log("—— 5. re-gated after leaving (next message blocked) ——");
chatMembers[GR + ":" + USER] = "left"; // the leave really happened in Telegram's eyes
await webhook({ update_id: 5, message: msg(USER, "سلام") });
check("blocked again with prompt", sent.some((s) => s.text && s.text.includes("عضویت اجباری")));

console.log("—— 6. user rejoins → cache cleared, allowed again ——");
chatMembers[GR + ":" + USER] = "member";
await webhook({ update_id: 6, chat_member: {
  chat: { id: GR, type: "supergroup" },
  from: { id: USER },
  date: Date.now(),
  old_chat_member: { user: { id: USER }, status: "left" },
  new_chat_member: { user: { id: USER }, status: "member" },
} });
await webhook({ update_id: 7, callback_query: { id: "cq3", from: { id: USER, first_name: "T" }, message: { message_id: 12, chat: { id: USER } }, data: "fj:verify" } });
check("verify passes after rejoin", answered.some((a) => a.text && a.text.includes("تأیید شد")));

console.log("—— 7. my_chat_member (bot removed) still removes the chat ——");
await webhook({ update_id: 8, my_chat_member: {
  chat: { id: CH, type: "channel", title: "کانال رسمی" },
  from: { id: OWNER },
  date: Date.now(),
  old_chat_member: { status: "administrator" },
  new_chat_member: { status: "left" },
} });
const cfgAfterBotLeft = JSON.parse(await kv.get("fj:config"));
check("channel removed after bot left", !cfgAfterBotLeft.chats.includes(CH));

console.log("—— 8. analytics recorded real events ——");
const stats = JSON.parse(await kv.get("fj:stats"));
check("blocked counter > 0", stats.blocked > 0, JSON.stringify(stats));
check("left counter > 0", stats.left > 0, JSON.stringify(stats));
check("verified counter > 0", stats.verified > 0, JSON.stringify(stats));

console.log("—— 9. ANY mode: leaving one chat doesn't warn while still in another ——");
// rebuild config: mode=any, both chats, bot admin in both
kv.put("fj:config", JSON.stringify({
  enabled: true, chats: [CH, GR], mode: "any", message: "join plz", buttonText: "verify",
  recheckHours: 0, exempt: [], chatMeta: { [CH]: { title: "CH", username: "u1", updatedAt: Date.now() }, [GR]: { title: "GR", updatedAt: Date.now() } },
  applyTo: "all", legacy: [], verifyMessage: "", promptCooldownMin: 0,
}));
botStatus[CH] = "administrator"; botStatus[GR] = "administrator";
chatMembers[CH + ":" + USER] = "member";
chatMembers[GR + ":" + USER] = "member";
await webhook({ update_id: 9, chat_member: {
  chat: { id: CH, type: "channel" }, from: { id: USER }, date: Date.now(),
  old_chat_member: { user: { id: USER }, status: "member" },
  new_chat_member: { user: { id: USER }, status: "left" },
} });
check("ANY: no leave warning (still in group)", !sent.some((s) => s.text && s.text.includes("خارج شدی")), JSON.stringify(sent.map((s) => s.text)));
chatMembers[CH + ":" + USER] = "left"; // channel leave actually happened
chatMembers[GR + ":" + USER] = "left";
await webhook({ update_id: 10, chat_member: {
  chat: { id: GR, type: "supergroup" }, from: { id: USER }, date: Date.now(),
  old_chat_member: { user: { id: USER }, status: "member" },
  new_chat_member: { user: { id: USER }, status: "left" },
} });
check("ANY: warned once out of both", sent.some((s) => s.text && s.text.includes("خارج شدی")));

console.log("—— 10. owner promotes bot in a 2nd chat → mode flips to ALL ——");
kv.put("fj:config", JSON.stringify({
  enabled: true, chats: [CH], mode: "any", message: "join plz", buttonText: "verify",
  recheckHours: 0, exempt: [], chatMeta: { [CH]: { title: "CH", username: "u1", updatedAt: Date.now() } },
  applyTo: "all", legacy: [], verifyMessage: "", promptCooldownMin: 0,
}));
botStatus[CH] = "administrator"; botStatus[GR] = "administrator";
await webhook({ update_id: 11, my_chat_member: {
  chat: { id: GR, type: "supergroup", title: "گروه رسمی" },
  from: { id: OWNER }, date: Date.now(),
  old_chat_member: { status: "left" },
  new_chat_member: { status: "administrator" },
} });
const cfgAfterSecond = JSON.parse(await kv.get("fj:config"));
check("group auto-added", cfgAfterSecond.chats.includes(GR), JSON.stringify(cfgAfterSecond.chats));
check("mode forced to ALL", cfgAfterSecond.mode === "all", JSON.stringify(cfgAfterSecond.mode));
check("owner told ALL is required", sent.some((s) => s.text && s.text.includes("«همه»")), JSON.stringify(sent.map((s) => s.text)));

console.log("—— 11. /group section (owner-only) + pre-ticked admin rights ——");
// non-owner (a valid member) can't open it
chatMembers[CH + ":" + USER] = "member";
chatMembers[GR + ":" + USER] = "member";
await webhook({ update_id: 12, message: { message_id: 12, chat: { id: USER, type: "private" }, from: { id: USER, first_name: "T" }, text: "/group" } });
check("non-owner blocked from /group", sent.some((s) => s.text && s.text.includes("سازنده")), JSON.stringify(sent.map((s) => s.text)));
// owner gets the section with the startgroup deep link
await webhook({ update_id: 13, message: { message_id: 13, chat: { id: OWNER, type: "private" }, from: { id: OWNER, first_name: "O" }, text: "/group" } });
check("owner sees group section", sent.some((s) => s.text && s.text.includes("افزودن ربات به گروه")), JSON.stringify(sent.map((s) => s.text).slice(0, 2)));
check("startgroup deep link with pre-ticked invite_users", sent.some((s) => JSON.stringify(s).includes("?startgroup&admin=invite_users")), JSON.stringify(sent.map((s) => s.reply_markup)));
// owner taps "set default checkboxes"
await webhook({ update_id: 14, callback_query: { id: "cq4", from: { id: OWNER, first_name: "O" }, message: { message_id: 20, chat: { id: OWNER } }, data: "fj:setrights" } });
check("default rights API called", rightsCalls.length > 0, JSON.stringify(rightsCalls));
check("rights = only invite_users", rightsCalls.some((b) => b.rights && b.rights.can_invite_users === true && !b.rights.can_delete_messages && !b.rights.can_restrict_members), JSON.stringify(rightsCalls));
check("answer confirms pre-ticked", answered.some((a) => a.text && a.text.includes("تیک")), JSON.stringify(answered));

console.log(`\n===== ${pass} passed, ${fail} failed =====`);
process.exit(fail ? 1 : 0);
