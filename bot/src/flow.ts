// Nika Net Launcher — the conversation state machine (Graphite + Neon edition).

import { Env } from "./types";
import * as tg from "./telegram";
import * as st from "./state";
import * as cf from "./cloudflare";
import * as ui from "./ui";
import * as panel from "./panel";
import * as fj from "./forcedjoin";
import * as sup from "./support";
import * as adm from "./admin";
import * as bc from "./broadcast";
import * as ex from "./extras";
import { t, Lang } from "./i18n";
import { encryptText, decryptText } from "./crypto";
import { UserState, TokenRecord } from "./state";

declare const PANEL_BUNDLE: string;
const BUNDLE = PANEL_BUNDLE;
const GITHUB_RAW = "https://raw.githubusercontent.com/NikaTeem/Nika-Net/main";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const SPIN = ui.SPIN;
const RX_NAME = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
const RX_SUB = /^[a-z0-9][a-z0-9]{2,62}$/;
const BUILD_COOLDOWN = 300_000;

const L = (s: UserState): Lang => (s.lang === "en" ? "en" : "fa");
const randName = () => `nika-${1000 + Math.floor(Math.random() * 9000)}`;

/* ---------------- release / auto-announce 🚀 ---------------- */

function cmpVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

async function fetchLatestVersion(): Promise<{ version: string; notes?: string } | null> {
  try {
    const r = await fetch(`${GITHUB_RAW}/version.json`, { cf: { cacheTtl: 120 } } as RequestInit);
    if (!r.ok) return null;
    const j = (await r.json()) as { version?: string; notes?: string };
    if (!j.version) return null;
    return { version: j.version, notes: j.notes };
  } catch {
    return null;
  }
}

// the freshest panel bundle straight from the repo — keeps the bot
// version-agnostic: new panels & updates always deploy the latest build.
let bundleCache: { code: string; at: number } | null = null;
async function fetchLatestBundle(): Promise<string> {
  if (bundleCache && Date.now() - bundleCache.at < 300_000) return bundleCache.code;
  try {
    const r = await fetch(`${GITHUB_RAW}/dist/worker.js`, { cf: { cacheTtl: 300 } } as RequestInit);
    if (r.ok) {
      const t = await r.text();
      if (t.length > 10_000) {
        bundleCache = { code: t, at: Date.now() };
        return t;
      }
    }
  } catch {
    /* fall back to embedded bundle */
  }
  return BUNDLE;
}

async function announceUpdate(env: Env, version: string, notes: string): Promise<{ sent: number; total: number }> {
  const ids = await tg.listUserChatIds(env);
  const text = ui.updateAnnouncement(version, notes);
  const kb = tg.kb([[{ text: "🔄 بروزرسانی پنل‌ها", cb: "upd:all", color: "primary", emoji: false }]]);
  let sent = 0;
  for (const id of ids) {
    try {
      await tg.sendMessage(env, id, text, kb);
      sent++;
    } catch {
      /* skip blocked/unreachable */
    }
  }
  await env.BOT_KV.put("announcedVersion", version);
  return { sent, total: ids.length };
}

// compare repo version.json against the last announced version and, if a new
// release is out, push the update notification to every user (idempotent).
export async function announceLatest(
  env: Env
): Promise<{ announced: boolean; version: string; sent: number; total: number }> {
  const latest = await fetchLatestVersion();
  if (!latest) return { announced: false, version: "", sent: 0, total: 0 };
  const last = (await env.BOT_KV.get("announcedVersion")) || "";
  if (last && cmpVersion(last, latest.version) >= 0) {
    return { announced: false, version: latest.version, sent: 0, total: 0 };
  }
  const r = await announceUpdate(env, latest.version, latest.notes || "");
  return { announced: true, version: latest.version, ...r };
}

export async function handleScheduled(env: Env): Promise<void> {
  try {
    await ensureMenuButton(env);
    await refreshReplyKeyboards(env);
    await announceLatest(env);
  } catch (e) {
    console.error("scheduled error", e);
  }
}

export async function handleUpdate(env: Env, update: tg.TgUpdate): Promise<void> {
  try {
    if (update.callback_query) return await handleCallback(env, update.callback_query);
    if (update.my_chat_member) return await fj.onBotChatMember(env, update.my_chat_member);
    if (update.chat_member) return await fj.onUserChatMember(env, update.chat_member);
    if (update.message) return await handleMessage(env, update.message);
  } catch (e) {
    console.error("update error", e);
  }
}

/* ---------------- broadcast (owner-only) ---------------- */
export async function broadcastAll(env: Env, text: string): Promise<{ sent: number; total: number }> {
  const r = await bc.broadcastAll(env, text);
  return { sent: r.sent, total: r.total };
}

// دکمهٔ منوی ربات (کنار کادر نوشتن) → لیست دستورها + ثبت دستور /support — idempotent.
export async function ensureMenuButton(env: Env): Promise<void> {
  try {
    const flag = "commands-v2";
    const cur = (await env.BOT_KV.get("menuButton")) || "";
    if (cur !== flag) {
      await tg.setCommandsMenuButton(env);
      await tg.setMyCommands(env, [
        { command: "start", description: "🏠 شروع / منوی اصلی" },
        { command: "menu", description: "📋 منوی اصلی" },
        { command: "support", description: "🎧 پشتیبانی و ثبت تیکت" },
        { command: "admin", description: "👑 مدیریت ربات (مالک و ادمین‌ها)" },
        { command: "lang", description: "🌐 تغییر زبان / Change language" },
      ]);
      await env.BOT_KV.put("menuButton", flag).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

// پس از حذف Mini App، کیبورد قدیمیِ کاربران (با دکمهٔ web_app) باید یک‌بار
// با کیبورد جدیدِ متنی جایگزین شود — وگرنه دکمهٔ «🎧 پشتیبانی» به آدرس 404 می‌رفت.
async function refreshReplyKeyboards(env: Env): Promise<void> {
  const flag = "kb-v0.8.0";
  try {
    if ((await env.BOT_KV.get("kbFlag")) === flag) return;
    const ids = await tg.listUserChatIds(env);
    for (const id of ids) {
      try {
        const s = await st.getState(env, id);
        await tg.sendMessage(env, id, "⌨️", ui.replyMenu(s)).catch(() => {});
      } catch {
        /* skip blocked/unreachable */
      }
    }
    await env.BOT_KV.put("kbFlag", flag).catch(() => {});
  } catch {
    /* ignore */
  }
}

/* ---------------- small helpers ---------------- */
async function reply(env: Env, chatId: number, msgId: number | undefined, text: string, kb?: tg.Kb): Promise<number | undefined> {
  if (msgId) {
    try {
      await tg.editMessage(env, chatId, msgId, text, kb);
      return msgId;
    } catch {
      /* fall through to send */
    }
  }
  const r = await tg.sendMessage(env, chatId, text, kb);
  return r?.result?.message_id as number | undefined;
}

async function withSpin<T>(
  env: Env, chatId: number, msgId: number, label: string,
  work: () => Promise<T>
): Promise<T> {
  let stop = false;
  const loop = (async () => {
    let i = 0;
    while (!stop) {
      await tg.editMessage(env, chatId, msgId, `${SPIN[i % SPIN.length]} ${label}`).catch(() => {});
      await sleep(400);
      i++;
    }
  })();
  const res = await work();
  stop = true;
  await loop.catch(() => {});
  return res;
}

async function staged(
  env: Env, chatId: number, msgId: number, title: string, stages: string[],
  work: (step: (i: number, ok?: boolean) => Promise<void>) => Promise<void>
): Promise<void> {
  const done = stages.map(() => false);
  let cur = 0;
  let frame = 0;
  const render = () =>
    `<b>${title}</b>\n\n` + stages.map((s, i) => `${done[i] ? "✅" : i === cur ? SPIN[frame % SPIN.length] : "▫️"} ${s}`).join("\n");
  await tg.editMessage(env, chatId, msgId, render()).catch(() => {});
  await work(async (i, ok) => {
    if (ok) done[i] = true;
    else cur = i;
    frame++;
    await tg.editMessage(env, chatId, msgId, render()).catch(() => {});
    await sleep(280);
  });
  frame++;
  await tg.editMessage(env, chatId, msgId, render()).catch(() => {});
}

/* ---------------- token helpers ---------------- */
function activeRec(s: UserState): TokenRecord | undefined {
  if (s.activeToken && s.tokens[s.activeToken]) return s.tokens[s.activeToken];
  if (s.tmp.ephemeral) return s.tmp.ephemeral as TokenRecord;
  return undefined;
}

async function decryptTok(env: Env, s: UserState): Promise<string | null> {
  const rec = activeRec(s);
  if (!rec) return null;
  try {
    return await decryptText(env.NIKA_SECRET, rec.enc);
  } catch {
    return null;
  }
}

async function setRecAccountId(s: UserState, rec: TokenRecord, i: number): Promise<boolean> {
  const acc = rec.accounts?.[i];
  if (!acc) return false;
  if (s.tmp.ephemeral && s.tmp.ephemeral === rec) {
    (s.tmp.ephemeral as TokenRecord).accountId = acc.id;
  } else {
    rec.accountId = acc.id;
  }
  return true;
}

/* ================================ MESSAGES ================================ */

async function handleMessage(env: Env, msg: tg.TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // track last-seen + name for the panel (throttled writes)
  await st.touchMeta(env, chatId, { firstName: msg.from?.first_name, lastName: msg.from?.last_name, username: msg.from?.username });
  // اطمینان از حضور کاربر در لیست کاربران پنل (حتی بدون /start)
  await st.ensureUser(env, chatId);

  // 🚫 مسدودی — اولین گیت: کاربر مسدود فقط پیام «مسدودی» می‌گیرد
  const banRec = await adm.getBan(env, chatId);
  if (banRec) {
    await adm.banGateNotice(env, chatId, banRec);
    return;
  }

  // عضویت اجباری — gate every message (owner + exempt always pass, and the
  // "await_fj_chat" setup state is allowed so the owner can configure it).
  const pre = await st.getState(env, chatId);
  if (pre.state !== "await_fj_chat") {
    if (!(await fj.gateUser(env, chatId, L(pre)))) return;
  }

  // 🔐 قفل لانچر — همهچیز بهجز /unlock وقتی قفل باشد مسدود میشود
  if (/^\/unlock(?:\s|$)/i.test(text)) return await cmdUnlock(env, chatId, msg.message_id, text);
  if (pinLocked(pre)) {
    return void (await tg.sendMessage(env, chatId, ui.makeText("🔐", t(L(pre), "pin_locked"), null, null, "danger")));
  }

  const startMatch = /^\/start(?:\s+(.+))?$/i.exec(text);
  if (text === "/start" || text.toLowerCase() === "start" || startMatch) {
    const payload = (startMatch?.[1] || "").trim().toLowerCase();
    let owner = await st.getOwner(env);
    if (owner === null) { await st.setOwner(env, chatId); owner = chatId; }
    let s = await st.getState(env, chatId);
    s.state = "idle";
    await st.saveState(env, chatId, s);
    await ensureMenuButton(env);
    // دیپ‌لینک /start support → مستقیم به انتخاب دستهٔ تیکت (بدون گام میانی)
    if (payload === "support") {
      const sm = ui.supportMenu(s);
      return void (await tg.sendMessage(env, chatId, sm.text, sm.kb));
    }
    const fname = msg.from?.first_name || "";
    await tg.sendMessage(env, chatId, "⌨️", ui.replyMenu(s));
    const m = await tg.sendMessage(env, chatId, "🎨");
    const msgId = m?.result?.message_id as number | undefined;
    const intro = t(L(s), "w_hello", { n: ui.esc(fname) });
    if (msgId) {
      for (let i = 6; i <= intro.length; i += 6) {
        await tg.editMessage(env, chatId, msgId, `🎨 ${intro.slice(0, i)}▌`).catch(() => {});
        await sleep(70);
      }
      const mm = ui.mainMenu(s, fname, await isOwner(env, chatId), await adm.isAdmin(env, chatId));
      await tg.editMessage(env, chatId, msgId, mm.text, mm.kb).catch(() => {});
    }
    return;
  }

  if (text === "/menu") {
    const s = await st.getState(env, chatId);
    if (s.state === "await_support" || s.state === "await_reply") { s.state = "idle"; await st.saveState(env, chatId, s); }
    const m = ui.mainMenu(s, msg.from?.first_name, await isOwner(env, chatId), await adm.isAdmin(env, chatId));
    return void (await tg.sendMessage(env, chatId, m.text, m.kb));
  }

  if (text === "/support" || text.toLowerCase() === "support") {
    const s = await st.getState(env, chatId);
    if (s.state === "await_support" || s.state === "await_reply") { s.state = "idle"; await st.saveState(env, chatId, s); }
    const m = ui.supportMenu(s);
    return void (await tg.sendMessage(env, chatId, m.text, m.kb));
  }

  if (text === "/lang") {
    const s = await st.getState(env, chatId);
    s.lang = s.lang === "fa" ? "en" : "fa";
    await st.saveState(env, chatId, s);
    await tg.sendMessage(env, chatId, "⌨️", ui.replyMenu(s));
    const m = ui.settingsMenu(s);
    return void (await tg.sendMessage(env, chatId, m.text, m.kb));
  }

  if (text === "/ping") {
    const s = await st.getState(env, chatId);
    const t0 = Date.now();
    const m = await tg.sendMessage(env, chatId, "🏓");
    const msgId = m?.result?.message_id as number | undefined;
    const ms = Date.now() - t0;
    if (msgId) await tg.editMessage(env, chatId, msgId, ui.pingResult(s, ms)).catch(() => {});
    return;
  }

  if (/^\/wiz(?:\s|$)/i.test(text)) {
    const s = await st.getState(env, chatId);
    s.state = "await_wiz_sni";
    await st.saveState(env, chatId, s);
    const m = ui.wizAsk(s, 0);
    return void (await tg.sendMessage(env, chatId, m.text, m.kb));
  }

  if (/^\/txt(?:\s|$)/i.test(text)) {
    const s = await st.getState(env, chatId);
    const m = ui.textsMenu(s);
    return void (await tg.sendMessage(env, chatId, m.text, m.kb));
  }

  if (/^\/promo(?:\s|$)/i.test(text)) {
    const s = await st.getState(env, chatId);
    const m = ui.promoMenu(s);
    return void (await tg.sendMessage(env, chatId, m.text, m.kb));
  }

  if (/^\/pin(?:\s|$)/i.test(text)) {
    const s = await st.getState(env, chatId);
    const m = ui.pinMenu(s);
    return void (await tg.sendMessage(env, chatId, m.text, m.kb));
  }

  if (/^\/tools(?:\s|$)/i.test(text)) {
    const s = await st.getState(env, chatId);
    const m = ui.toolsMenu(s);
    return void (await tg.sendMessage(env, chatId, m.text, m.kb));
  }

  if (/^\/road(?:\s|$)/i.test(text)) {
    return await roadEntry(env, chatId, undefined);
  }

  if (/^\/queen$/i.test(text)) {
    return void (await tg.sendMessage(env, chatId, ui.queen()));
  }

  if (text.startsWith("/broadcast")) {
    const owner = await st.getOwner(env);
    const s = await st.getState(env, chatId);
    if (owner !== chatId) {
      return void (await tg.sendMessage(env, chatId, t(L(s), "owner_only")));
    }
    const payload = text.replace(/^\/broadcast\s*/, "").trim();
    if (!payload) {
      return void (await tg.sendMessage(env, chatId, t(L(s), "bc_help")));
    }
    await tg.sendMessage(env, chatId, t(L(s), "bc_sending"));
    const r = await broadcastAll(env, payload);
    return void (await tg.sendMessage(env, chatId, t(L(s), "bc_done", { sent: r.sent, total: r.total })));
  }

  if (text === "/admin" || text.toLowerCase() === "admin") {
    const s = await st.getState(env, chatId);
    if (!(await adm.isAdmin(env, chatId))) {
      return void (await tg.sendMessage(env, chatId, t(L(s), "owner_only")));
    }
    if (s.state === "await_admin_id" || s.state === "await_ban_id" || s.state === "await_ban_reason") {
      s.state = "idle";
      await st.saveState(env, chatId, s);
    }
    return await showAdminMenu(env, chatId, s, msg.message_id);
  }

  // quick reply keyboard labels
  const rl = ui.REPLY_LABELS[text];
  if (rl) {
    const s = await st.getState(env, chatId);
    if (s.state === "await_reply") { s.state = "idle"; await st.saveState(env, chatId, s).catch(() => {}); }
    if (rl === "menu") {
      const m = ui.mainMenu(s, msg.from?.first_name, await isOwner(env, chatId), await adm.isAdmin(env, chatId));
      return void (await tg.sendMessage(env, chatId, m.text, m.kb));
    }
    if (rl === "panels") {
      const m = ui.panelsList(s, 0);
      return void (await tg.sendMessage(env, chatId, m.text, m.kb));
    }
    if (rl === "new") return await buildEntry(env, chatId, msg.message_id);
    if (rl === "support") {
      const m = ui.supportMenu(s);
      return void (await tg.sendMessage(env, chatId, m.text, m.kb));
    }
  }

  const s = await st.getState(env, chatId);
  switch (s.state) {
    case "await_token":
      return await inToken(env, chatId, msg.message_id, text);
    case "await_name":
      return await inName(env, chatId, text);
    case "await_subdomain":
      return await inSub(env, chatId, msg.message_id, text);
    case "await_panel_pass":
      return await inPanelPass(env, chatId, msg.message_id, text);
    case "await_uname":
      return await inUname(env, chatId, text);
    case "await_uquota":
      return await inUquota(env, chatId, text);
    case "await_uexp":
      return await inUexp(env, chatId, text);
    case "await_fj_chat":
      return await inFjChat(env, chatId, msg, text);
    case "await_admin_id":
      return await inAdminId(env, chatId, msg, text);
    case "await_ban_id":
      return await inBanId(env, chatId, msg, text);
    case "await_ban_reason":
      return await inBanReason(env, chatId, text);
    case "await_support":
      // پس از انتخاب دسته — پیام کاربر بدنهٔ تیکت می‌شود (حتی اگر مالک باشد)
      if (!text) return; // استیکر/عکس/فایل بدون متن → تیکت خالی نساز
      return await supportText(env, chatId, msg, text, true);
    case "await_reply":
      // کاربر دکمهٔ «پاسخ دادن» را زده — همهٔ پیام‌های بعدی (حتی از مالک)
      // به همان گفتگو/تیکت اضافه می‌شود تا وقتی خودش منو را باز کند.
      if (!text) return; // استیکر/عکس بدون متن → نادیده
      return await supportText(env, chatId, msg, text, false);
    case "await_wiz_sni":
      return await inWizSni(env, chatId, msg.message_id, text);
    case "await_wiz_ws":
      return await inWizWs(env, chatId, msg.message_id, text);
    case "await_txt":
      return await inTxt(env, chatId, text);
    case "await_promo":
      return await inPromo(env, chatId, text);
    case "await_sublink":
      return await inSubLink(env, chatId, text);
    case "await_pin1":
      return await inPin1(env, chatId, text);
    case "await_pin2":
      return await inPin2(env, chatId, text);
    case "await_unlock":
      return await inUnlock(env, chatId, text);
    default: {
      // مالک → منوی اصلی · کاربر عادی → پیام آزاد = تیکت پشتیبانی
      if (await isOwner(env, chatId)) {
        const m = ui.mainMenu(s, msg.from?.first_name, true);
        return void (await tg.sendMessage(env, chatId, m.text, m.kb));
      }
      if (!text) return; // استیکر/عکس/فایل بدون متن → نادیده بگیر
      return await supportText(env, chatId, msg, text, false);
    }
  }
}

// ثبت پیام کاربر به‌عنوان تیکت/پاسخ + تأیید و اعلان به مالک
async function supportText(env: Env, chatId: number, msg: tg.TgMessage, text: string, fromCategory = false): Promise<void> {
  const r = await sup.recordIncoming(env, chatId, text, {
    firstName: msg.from?.first_name,
    lastName: msg.from?.last_name,
    username: msg.from?.username,
  }, { asTicket: fromCategory });
  const owner = await st.getOwner(env);
  const isNewTicket = fromCategory || r.verdict === "new_ticket";
  if (owner && owner !== chatId) {
    await tg.sendMessage(env, owner, ui.supportNotify(r.ticket, text, isNewTicket)).catch(() => {});
  }
  // تأیید بعد از ثبت پیام کاربر:
  //   تیکتِ جدید (یا بدنهٔ تیکت بعد از انتخاب دسته) → «تیکتت ثبت شد»
  //   پاسخ به پیام مالک/پشتیبانی → «پیام شما ارسال شد»
  //   پیام پشت‌سرهم کاربر (followup) → تأیید کوتاه تا چت زنده بماند
  if (isNewTicket) {
    await tg.sendMessage(env, chatId, ui.supportAck()).catch(() => {});
  } else if (r.verdict === "reply") {
    await tg.sendMessage(env, chatId, ui.pmReplyAck()).catch(() => {});
  } else if (r.verdict === "followup") {
    await tg.sendMessage(env, chatId, ui.followupAck()).catch(() => {});
  }
  // بازگشت به حالت عادی پس از ثبت بدنهٔ تیکت
  const s = await st.getState(env, chatId);
  if (s.state === "await_support") {
    s.state = "idle";
    await st.saveState(env, chatId, s).catch(() => {});
  }
}

/* ---------------- owner helpers ---------------- */
async function isOwner(env: Env, chatId: number): Promise<boolean> {
  return (await fj.ownerId(env)) === chatId;
}

/* ---------------- admin & ban management (owner + admins) ---------------- */

// باز کردن منوی مدیریت ادمین‌ها و مسدودی‌ها
async function showAdminMenu(env: Env, chatId: number, s: UserState, msgId?: number): Promise<void> {
  const meta = await fj.botMeta(env);
  const isOwnerFlag = await isOwner(env, chatId);
  const [admins, bans] = await Promise.all([adm.listAdmins(env), adm.listBans(env)]);
  const m = ui.adminMenu(s, meta, isOwnerFlag, admins.length, bans.length);
  await reply(env, chatId, msgId, m.text, m.kb);
}

// استخراج آیدی عددی هدف از متن یا پیام فورواردشده
function targetUserId(msg: tg.TgMessage, text: string): number | null {
  const fwd = msg as unknown as {
    forward_origin?: { sender_user?: { id?: number } };
    forward_from?: { id?: number };
  };
  const viaOrigin = fwd.forward_origin?.sender_user?.id;
  const viaFrom = fwd.forward_from?.id;
  if (Number.isInteger(viaOrigin) && viaOrigin! > 0) return viaOrigin!;
  if (Number.isInteger(viaFrom) && viaFrom! > 0) return viaFrom!;
  const m = /(-?\d{5,15})/.exec(text);
  return m ? parseInt(m[1], 10) : null;
}

async function inAdminId(env: Env, chatId: number, msg: tg.TgMessage, text: string): Promise<void> {
  const s = await st.getState(env, chatId);
  s.state = "idle";
  const id = targetUserId(msg, text);
  if (!id || !Number.isInteger(id) || id <= 0) {
    await tg.sendMessage(env, chatId, "⚠️ آیدی عددی پیدا نشد — یک پیام را فوروارد کن یا آیدی را بفرست.").catch(() => {});
    return void (await showAdminMenu(env, chatId, s, undefined));
  }
  const who = await adm.userLabel(env, id);
  const r = await adm.addAdmin(env, id, chatId);
  await st.saveState(env, chatId, s);
  if (!r.ok) {
    await tg.sendMessage(env, chatId, "⛔ " + (r.error || "خطا")).catch(() => {});
    return void (await showAdminMenu(env, chatId, s, undefined));
  }
  if (!r.changed) {
    await tg.sendMessage(env, chatId, ui.admAlready(s, who)).catch(() => {});
    return void (await showAdminMenu(env, chatId, s, undefined));
  }
  await adm.notifyAdminAdded(env, id);
  await tg.sendMessage(env, chatId, ui.adminAdded(s, who)).catch(() => {});
  return void (await showAdminMenu(env, chatId, s, undefined));
}

async function inBanId(env: Env, chatId: number, msg: tg.TgMessage, text: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const id = targetUserId(msg, text);
  if (!id || !Number.isInteger(id) || id <= 0) {
    s.state = "idle";
    await st.saveState(env, chatId, s);
    await tg.sendMessage(env, chatId, "⚠️ آیدی عددی پیدا نشد — یک پیام را فوروارد کن یا آیدی را بفرست.").catch(() => {});
    return void (await showAdminMenu(env, chatId, s, undefined));
  }
  // مالک و ادمین‌ها قابل مسدودسازی نیستند — زودتر جلویش را بگیر
  if ((await adm.role(env, id)) !== "user") {
    s.state = "idle";
    await st.saveState(env, chatId, s);
    await tg.sendMessage(env, chatId, "⛔ مالک و ادمین‌ها قابل مسدودسازی نیستند.").catch(() => {});
    return void (await showAdminMenu(env, chatId, s, undefined));
  }
  const who = await adm.userLabel(env, id);
  s.tmp.banId = id;
  s.tmp.banName = who;
  await st.saveState(env, chatId, s);
  const m = ui.banAskDuration(s, who);
  await tg.sendMessage(env, chatId, m.text, m.kb).catch(() => {});
}

async function inBanReason(env: Env, chatId: number, text: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const id = s.tmp.banId as number | undefined;
  const who = (s.tmp.banName as string | undefined) || "?";
  const until = Number(s.tmp.banUntil) || 0;
  const durId = (s.tmp.banDurId as string | undefined) || "";
  s.state = "idle";
  delete s.tmp.banId; delete s.tmp.banName; delete s.tmp.banUntil; delete s.tmp.banDurId;
  await st.saveState(env, chatId, s);
  if (id === undefined || !Number.isInteger(id)) return;
  const reason = text.trim();
  if (!reason) {
    await tg.sendMessage(env, chatId, "⚠️ دلیل اجباری است — دوباره شروع کن.").catch(() => {});
    return void (await showAdminMenu(env, chatId, s, undefined));
  }
  const r = await adm.setBan(env, id, { by: chatId, byName: (await adm.userLabel(env, chatId)), reason, until });
  if (!r.ok) {
    await tg.sendMessage(env, chatId, "⛔ " + (r.error || "خطا")).catch(() => {});
    return void (await showAdminMenu(env, chatId, s, undefined));
  }
  const ban = await adm.getBan(env, id);
  if (ban) await adm.notifyBanned(env, id, ban);
  const dur = adm.durationOf(durId) || (until ? { id: "", ms: until, fa: adm.untilLabel(until), en: adm.untilLabel(until) } : { id: "perm", ms: 0, fa: "دائمی", en: "Permanent" });
  await tg.sendMessage(env, chatId, ui.banDone(s, who, L(s) === "fa" ? dur.fa : dur.en)).catch(() => {});
  return void (await showAdminMenu(env, chatId, s, undefined));
}

/* ---------------- forced-join channel setup (owner) ---------------- */
async function inFjChat(env: Env, chatId: number, msg: tg.TgMessage, text: string): Promise<void> {
  const s = await st.getState(env, chatId);
  if (!(await isOwner(env, chatId))) {
    s.state = "idle";
    await st.saveState(env, chatId, s);
    return;
  }
  let raw: string | null = null;
  const fwd = msg as unknown as {
    forward_origin?: { chat?: { id?: number; type?: string } };
    forward_from_chat?: { id?: number };
  };
  if (fwd.forward_origin?.chat?.id) raw = String(fwd.forward_origin.chat.id);
  else if (fwd.forward_from_chat?.id) raw = String(fwd.forward_from_chat.id);
  else raw = text;

  const chat = fj.normalizeChat(raw || "");
  if (!chat) {
    return void (await tg.sendMessage(env, chatId, ui.fjBadChat(s)));
  }
  const check = await fj.checkBotAdmin(env, chat);
  if (!check.ok) {
    return void (await tg.sendMessage(env, chatId, ui.fjCantSee(s, chat)));
  }
  const cfg = await fj.getConfig(env);
  cfg.chats = Array.from(new Set([...cfg.chats, chat]));
  cfg.enabled = true;
  await fj.saveConfig(env, cfg);
  s.state = "idle";
  await st.saveState(env, chatId, s);
  await tg.sendMessage(env, chatId, ui.fjSetOk(s, chat));
  const meta = await fj.botMeta(env);
  const m = ui.ownerMenu(s, meta);
  await tg.sendMessage(env, chatId, m.text, m.kb);
}

/* ---------------- token input ---------------- */
async function inToken(env: Env, chatId: number, msgId: number | undefined, raw: string): Promise<void> {
  let s = await st.getState(env, chatId);
  const token = raw.replace(/[“”"'`]/g, "").trim();
  if (token.length < 20) {
    return void (await tg.sendMessage(env, chatId, ui.badToken(s)));
  }
  if (msgId) await tg.deleteMessage(env, chatId, msgId).catch(() => {});
  const wait = await tg.sendMessage(env, chatId, ui.checking(s));
  const waitId = wait?.result?.message_id as number | undefined;

  const res = await (waitId
    ? withSpin(env, chatId, waitId, t(L(s), "tok_checking"), () => cf.verifyAndListAccounts(token))
    : cf.verifyAndListAccounts(token));

  s = await st.getState(env, chatId);
  if (!res.ok || !res.accounts.length) {
    const text = ui.tokenInvalid(s, res.err);
    if (waitId) await tg.editMessage(env, chatId, waitId, text).catch(() => {});
    else await tg.sendMessage(env, chatId, text);
    return;
  }

  let n = Object.keys(s.tokens).length + 1;
  while (s.tokens[`t${n}`]) n++;
  const tid = `t${n}`;
  const rec: TokenRecord = {
    name: res.accounts.length === 1 ? res.accounts[0].name : `Token ${n}`,
    enc: await encryptText(env.NIKA_SECRET, token),
    tail: token.slice(-4),
    accounts: res.accounts,
    accountId: res.accounts.length === 1 ? res.accounts[0].id : undefined,
    created: Date.now(),
  };
  s.tokens[tid] = rec;
  s.activeToken = tid;
  s.state = "await_save";
  await st.saveState(env, chatId, s);

  const q = ui.saveQuestion(s, res.accounts[0].name, res.accounts.length);
  if (waitId) await tg.editMessage(env, chatId, waitId, q.text, q.kb).catch(() => {});
  else await tg.sendMessage(env, chatId, q.text, q.kb);
}

async function afterSave(env: Env, chatId: number, msgId: number | undefined, saved: boolean): Promise<void> {
  const s = await st.getState(env, chatId);
  if (!saved) {
    const rec = s.activeToken ? s.tokens[s.activeToken] : undefined;
    if (rec && s.activeToken) delete s.tokens[s.activeToken];
    if (s.tmp.after_token === "build" && rec) s.tmp.ephemeral = rec;
    else if (s.tmp.after_token === "updall" && rec) s.tmp.ephemeral = rec;
    s.activeToken = Object.keys(s.tokens)[0];
  }
  s.state = "idle";
  const nxt = s.tmp.after_token as string | undefined;
  delete s.tmp.after_token;
  await st.saveState(env, chatId, s);
  if (nxt === "build") return await buildEntry(env, chatId, msgId);
  if (nxt === "updall") return await updateAll(env, chatId, msgId);
  const m = ui.tokensMenu(s);
  await reply(env, chatId, msgId, m.text, m.kb);
}

/* ---------------- build flow 🚀 ---------------- */
async function buildEntry(env: Env, chatId: number, msgId?: number): Promise<void> {
  const s = await st.getState(env, chatId);

  if (!activeRec(s)) {
    s.state = "await_token";
    s.tmp.after_token = "build";
    await st.saveState(env, chatId, s);
    const m = ui.tokenPrompt(s);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (Date.now() - s.lastBuild < BUILD_COOLDOWN) {
    const left = Math.floor((BUILD_COOLDOWN - (Date.now() - s.lastBuild)) / 60000) + 1;
    return void (await tg.sendMessage(env, chatId, ui.cooldown(s, left)));
  }
  const rec = activeRec(s)!;
  if (rec.accounts.length > 1 && !rec.accountId) {
    const m = ui.chooseAccount(s, rec.accounts);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  s.state = "await_name";
  s.tmp.suggest = undefined;
  await st.saveState(env, chatId, s);
  const m = ui.namePrompt(s);
  await reply(env, chatId, msgId, m.text, m.kb);
}

async function inName(env: Env, chatId: number, raw: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const name = raw.trim().toLowerCase();
  if (!RX_NAME.test(name) || s.panels.some((p) => p.name === name)) {
    return void (await tg.sendMessage(env, chatId, ui.invalidName(s)));
  }
  s.tmp.name = name;
  s.state = "idle";
  await st.saveState(env, chatId, s);
  await buildConfirmStep(env, chatId, undefined);
}

async function inSub(env: Env, chatId: number, msgId: number | undefined, raw: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const sub = raw.trim().toLowerCase();
  if (!RX_SUB.test(sub)) {
    return void (await tg.sendMessage(env, chatId, ui.invalidSub(s)));
  }
  const rec = activeRec(s);
  const tok = await decryptTok(env, s);
  const accountId = rec?.accountId || rec?.accounts?.[0]?.id;
  if (!rec || !tok || !accountId) {
    s.state = "await_token";
    s.tmp.after_token = "build";
    await st.saveState(env, chatId, s);
    const m = ui.tokenPrompt(s);
    return void (await tg.sendMessage(env, chatId, m.text, m.kb));
  }
  const wait = await tg.sendMessage(env, chatId, ui.checking(s));
  const waitId = wait?.result?.message_id as number | undefined;
  const r = await cf.registerSubdomain(tok, accountId, sub);
  if (!r.ok) {
    const err = t(L(s), "err_cf", { e: ui.esc(r.err || "?") });
    if (waitId) await tg.editMessage(env, chatId, waitId, err).catch(() => {});
    else await tg.sendMessage(env, chatId, err);
    return;
  }
  if (waitId) await tg.deleteMessage(env, chatId, waitId).catch(() => {});
  s.tmp.sub = sub;
  s.state = "idle";
  await st.saveState(env, chatId, s);
  await buildConfirmStep(env, chatId, undefined);
}

async function buildConfirmStep(env: Env, chatId: number, msgId?: number): Promise<void> {
  const s = await st.getState(env, chatId);
  const rec = activeRec(s);
  const tok = await decryptTok(env, s);
  const name = s.tmp.name as string | undefined;
  const accountId = rec?.accountId || rec?.accounts?.[0]?.id;
  if (!rec || !tok || !name || !accountId) {
    s.state = "await_token";
    s.tmp.after_token = "build";
    await st.saveState(env, chatId, s);
    const m = ui.tokenPrompt(s);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  const wait = await tg.sendMessage(env, chatId, ui.checking(s));
  const waitId = wait?.result?.message_id as number | undefined;

  const sub = await (waitId
    ? withSpin(env, chatId, waitId, t(L(s), "st_conn"), () => cf.getSubdomain(tok, accountId))
    : cf.getSubdomain(tok, accountId));

  if (!sub) {
    s.state = "await_subdomain";
    await st.saveState(env, chatId, s);
    const txt = ui.needSubdomain(s);
    if (waitId) await tg.editMessage(env, chatId, waitId, txt).catch(() => {});
    else await tg.sendMessage(env, chatId, txt);
    return;
  }
  s.tmp.sub = sub;
  await st.saveState(env, chatId, s);
  const accName = rec.accounts.find((a) => a.id === accountId)?.name || "?";
  const url = `https://${name}.${sub}.workers.dev/admin`;
  const m = ui.buildConfirm(s, { name, accountName: accName, url, ver: ui.VERSION });
  if (waitId) await tg.editMessage(env, chatId, waitId, m.text, m.kb).catch(() => {});
  else await tg.sendMessage(env, chatId, m.text, m.kb);
}

async function doBuild(env: Env, chatId: number, msgId: number): Promise<void> {
  const s = await st.getState(env, chatId);
  if (Date.now() - s.lastBuild < BUILD_COOLDOWN) {
    const left = Math.floor((BUILD_COOLDOWN - (Date.now() - s.lastBuild)) / 60000) + 1;
    return void (await tg.sendMessage(env, chatId, ui.cooldown(s, left)));
  }
  const rec = activeRec(s);
  const tok = await decryptTok(env, s);
  const name = s.tmp.name as string | undefined;
  const sub = s.tmp.sub as string | undefined;
  const accountId = rec?.accountId || rec?.accounts?.[0]?.id;
  if (!rec || !tok || !name || !sub || !accountId) {
    return void (await tg.sendMessage(env, chatId, "❌"));
  }

  const stages = [t(L(s), "st_kv"), t(L(s), "st_up"), t(L(s), "st_ver"), t(L(s), "st_save")];
  try {
    await staged(env, chatId, msgId, `🚀 «${name}»`, stages, async (step) => {
      await step(0);
      const kvId = await cf.createKvNamespace(tok, accountId, `nika-${name}-kv`);
      if (!kvId) throw new Error("KV namespace failed");
      await step(0, true);

      await step(1);
      const bindings = await cf.panelBindings(tok, accountId, name, kvId);
      const up = await cf.uploadWorker(tok, accountId, name, await fetchLatestBundle(), bindings);
      if (!up.ok) throw new Error(up.err || "upload failed");
      await cf.enableWorkersDev(tok, accountId, name);
      await step(1, true);

      await step(2);
      const base = `https://${name}.${sub}.workers.dev`;
      const h = await panel.panelHealth(base);
      await step(2, true);

      await step(3);
      const accName = rec.accounts.find((a) => a.id === accountId)?.name || "?";
      if (!s.panels.some((p) => p.name === name)) {
        s.panels.push({
          name, url: `${base}/admin`, base, account: accountId, accountName: accName,
          kvId, bundleVer: ui.VERSION, createdAt: Date.now(), health: h,
        });
      }
      s.lastBuild = Date.now();
      s.builds += 1;
      delete s.tmp.name;
      delete s.tmp.sub;
      delete s.tmp.ephemeral;
      await st.saveState(env, chatId, s);
      await step(3, true);
    });
  } catch (e: any) {
    const txt = ui.buildError(s, e?.message || String(e));
    await tg.editMessage(env, chatId, msgId, txt, tg.kb([[{ text: t(L(s), "back"), cb: "menu:main", color: "gray", emoji: false }]])).catch(() => {});
    return;
  }

  const fresh = await st.getState(env, chatId);
  if (!fresh.panels.some((p) => p.name === name)) return; // failed
  const m = ui.buildSuccess(fresh, name, sub);
  await tg.editMessage(env, chatId, msgId, m.text, m.kb).catch(() => {});
}

/* ---------------- update all 🔄 ---------------- */
async function updateAll(env: Env, chatId: number, msgId?: number): Promise<void> {
  const s = await st.getState(env, chatId);
  if (!s.panels.length) {
    const m = { text: t(L(s), "upd_all_none"), kb: tg.kb([[{ text: t(L(s), "b_new"), cb: "do:build", color: "success", emoji: false }], [{ text: t(L(s), "back"), cb: "menu:main", color: "gray", emoji: false }]]) };
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  const tok = await decryptTok(env, s);
  if (!tok) {
    s.state = "await_token";
    s.tmp.after_token = "updall";
    await st.saveState(env, chatId, s);
    const m = ui.tokenPrompt(s);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  const wait = await tg.sendMessage(env, chatId, t(L(s), "upd_all_upgrading", { n: s.panels.length }));
  const waitId = wait?.result?.message_id as number | undefined;
  const results: Array<{ name: string; ok: boolean }> = [];
  for (const p of s.panels) {
    try {
      const kvId = p.kvId || (await cf.findKvId(tok, p.account, [`nika-${p.name}-kv`, `${p.name}-kv`]));
      const bindings = await cf.panelBindings(tok, p.account, p.name, kvId);
      const up = await cf.uploadWorker(tok, p.account, p.name, await fetchLatestBundle(), bindings);
      if (!up.ok) {
        results.push({ name: p.name, ok: false });
        continue;
      }
      await cf.enableWorkersDev(tok, p.account, p.name);
      results.push({ name: p.name, ok: true });
    } catch {
      results.push({ name: p.name, ok: false });
    }
  }
  const okCount = results.filter((r) => r.ok).length;
  delete s.tmp.ephemeral;
  await st.saveState(env, chatId, s);
  const text = `🔄 <b>${t(L(s), "upd_all_done", { ok: okCount, all: results.length })}</b>\n\n${results.map((r) => `${r.ok ? "✅" : "❌"} <code>${ui.esc(r.name)}</code>`).join("\n")}`;
  if (waitId) await tg.editMessage(env, chatId, waitId, text).catch(() => {});
  else await tg.sendMessage(env, chatId, text);
}

/* ---------------- per-panel update / delete ---------------- */
function tokForPanel(s: UserState, accountId: string): TokenRecord | null {
  for (const rec of Object.values(s.tokens)) {
    if (rec.accounts.some((a) => a.id === accountId)) return rec;
  }
  if (s.tmp.ephemeral && (s.tmp.ephemeral as TokenRecord).accounts.some((a) => a.id === accountId)) {
    return s.tmp.ephemeral as TokenRecord;
  }
  return null;
}

async function panelUpdate(env: Env, chatId: number, msgId: number, name: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const p = s.panels.find((x) => x.name === name);
  const pair = p ? tokForPanel(s, p.account) : null;
  if (!p || !pair) {
    await tg.sendMessage(env, chatId, t(L(s), "tok_none"));
    return;
  }
  const token = await decryptText(env.NIKA_SECRET, pair.enc);
  const stages = [t(L(s), "st_up"), t(L(s), "st_ver")];
  try {
    await staged(env, chatId, msgId, `🔄 «${name}»`, stages, async (step) => {
      await step(0);
      const kvId = p.kvId || (await cf.findKvId(token, p.account, [`nika-${name}-kv`, `${name}-kv`]));
      const bindings = await cf.panelBindings(token, p.account, p.name, kvId);
      const up = await cf.uploadWorker(token, p.account, p.name, await fetchLatestBundle(), bindings);
      if (!up.ok) throw new Error(up.err || "upload failed");
      await cf.enableWorkersDev(token, p.account, p.name);
      await step(0, true);
      await step(1);
      const h = await panel.panelHealth(p.base);
      p.health = h;
      p.bundleVer = ui.VERSION;
      await st.saveState(env, chatId, s);
      await step(1, true);
    });
  } catch (e: any) {
    const txt = ui.buildError(s, e?.message || String(e));
    await tg.editMessage(env, chatId, msgId, txt).catch(() => {});
    return;
  }
  await tg.sendMessage(env, chatId, ui.makeText("✅", t(L(s), "pd_upd_ok", { n: name, ver: ui.VERSION }), null, null, "ok"));
  const m = ui.panelDetail(s, name);
  await tg.sendMessage(env, chatId, m.text, m.kb);
}

async function panelDelete(env: Env, chatId: number, msgId: number, name: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const p = s.panels.find((x) => x.name === name);
  const pair = p ? tokForPanel(s, p.account) : null;
  if (!p || !pair) {
    await tg.sendMessage(env, chatId, t(L(s), "tok_none"));
    return;
  }
  const token = await decryptText(env.NIKA_SECRET, pair.enc);
  const stages = [t(L(s), "st_delw"), t(L(s), "st_delk")];
  let note = "";
  try {
    await staged(env, chatId, msgId, `🗑 «${name}»`, stages, async (step) => {
      await step(0);
      const w = await cf.deleteWorker(token, p.account, p.name);
      if (!w.ok) note += `\n⚠️ worker: ${ui.esc(w.err || "?")}`;
      await step(0, true);
      await step(1);
      if (p.kvId) {
        const k = await cf.deleteKvNamespace(token, p.account, p.kvId);
        if (!k.ok) note += `\n⚠️ KV: ${ui.esc(k.err || "?")}`;
      }
      await step(1, true);
    });
  } catch (e: any) {
    note += `\n⚠️ ${ui.esc(e?.message || String(e))}`;
  }
  s.panels = s.panels.filter((x) => x.name !== name);
  delete s.panelAuth[name];
  await st.saveState(env, chatId, s);
  await tg.sendMessage(env, chatId, t(L(s), "pd_del_ok", { n: name }) + note);
  const m = ui.panelsList(s, 0);
  await tg.sendMessage(env, chatId, m.text, m.kb);
}

/* ---------------- health check 💚 ---------------- */
async function healthAll(env: Env, chatId: number, msgId: number): Promise<void> {
  const s = await st.getState(env, chatId);
  const wait = await tg.sendMessage(env, chatId, `⠋ ${t(L(s), "pan_checking")}`);
  const waitId = wait?.result?.message_id as number | undefined;
  if (waitId) {
    await withSpin(env, chatId, waitId, t(L(s), "pan_checking"), async () => {
      const results = await Promise.all(s.panels.map(async (p) => ({ p, h: await panel.panelHealth(p.base) })));
      for (const { p, h } of results) p.health = h;
      await st.saveState(env, chatId, s);
      return results;
    });
    const okN = s.panels.filter((p) => p.health?.ok).length;
    await tg.editMessage(env, chatId, waitId, `💚 ${t(L(s), "pan_summary", { ok: okN, all: s.panels.length })}`).catch(() => {});
  }
  const m = ui.panelsList(s, 0);
  await tg.sendMessage(env, chatId, m.text, m.kb);
}

/* ---------------- panel users 👥 ---------------- */
async function psession(env: Env, s: UserState, pname: string): Promise<{ ok: boolean; err: string; base: string; cookie: string }> {
  const p = s.panels.find((x) => x.name === pname);
  if (!p) return { ok: false, err: "?", base: "", cookie: "" };
  const a = s.panelAuth[pname];
  if (!a) return { ok: false, err: "nopass", base: p.base, cookie: "" };
  try {
    const pw = await decryptText(env.NIKA_SECRET, a.enc);
    const r = await panel.panelLogin(p.base, pw);
    return { ok: r.ok, err: r.err, base: p.base, cookie: r.cookie };
  } catch {
    return { ok: false, err: "badenc", base: p.base, cookie: "" };
  }
}

async function usersEntry(env: Env, chatId: number, msgId: number | undefined, pname: string, page: number): Promise<void> {
  const s = await st.getState(env, chatId);
  s.tmp.upanel = pname;
  const sess = await psession(env, s, pname);
  if (!sess.ok) {
    s.state = "await_panel_pass";
    s.tmp.ppanel = pname;
    await st.saveState(env, chatId, s);
    const m = ui.askPanelPass(s, pname);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  const r = await panel.panelApi(sess.base, sess.cookie, "GET", "/api/users");
  if (r.status !== 200 || !Array.isArray(r.json)) {
    const e = typeof r.json === "object" && r.json?.error ? r.json.error : `HTTP ${r.status}`;
    const txt = ui.makeText("⛔", t(L(s), "err_net", { e: ui.esc(e) }), null, null, "danger");
    return void (await reply(env, chatId, msgId, txt, tg.kb([[{ text: t(L(s), "back"), cb: `panel:${pname}`, color: "gray", emoji: false }]])));
  }
  s.tmp.upage = page;
  await st.saveState(env, chatId, s);
  const m = ui.usersList(s, pname, r.json, page);
  await reply(env, chatId, msgId, m.text, m.kb);
}

async function inPanelPass(env: Env, chatId: number, msgId: number | undefined, raw: string): Promise<void> {
  let s = await st.getState(env, chatId);
  const pname = s.tmp.ppanel as string | undefined;
  const p = pname ? s.panels.find((x) => x.name === pname) : undefined;
  if (!p) {
    s.state = "idle";
    await st.saveState(env, chatId, s);
    return;
  }
  if (msgId) await tg.deleteMessage(env, chatId, msgId).catch(() => {});
  const wait = await tg.sendMessage(env, chatId, ui.checking(s));
  const waitId = wait?.result?.message_id as number | undefined;
  const r = await (waitId
    ? withSpin(env, chatId, waitId, t(L(s), "tok_checking"), () => panel.panelLogin(p.base, raw))
    : panel.panelLogin(p.base, raw));
  s = await st.getState(env, chatId);
  if (!r.ok) {
    const txt = ui.makeText("❌", t(L(s), "a_bad"), null, null, "danger");
    if (waitId) await tg.editMessage(env, chatId, waitId, txt).catch(() => {});
    else await tg.sendMessage(env, chatId, txt);
    return;
  }
  s.panelAuth[p.name] = { enc: await encryptText(env.NIKA_SECRET, raw), saved: false };
  s.state = "idle";
  await st.saveState(env, chatId, s);
  const q = {
    text: ui.makeText("🔐", t(L(s), "a_ok"), t(L(s), "a_save_q"), null, "ok"),
    kb: tg.kb([
      [{ text: t(L(s), "a_yes"), cb: "asave:y", color: "success", emoji: false }],
      [{ text: t(L(s), "a_no"), cb: "asave:n", color: "gray", emoji: false }],
    ]),
  };
  if (waitId) await tg.editMessage(env, chatId, waitId, q.text, q.kb).catch(() => {});
  else await tg.sendMessage(env, chatId, q.text, q.kb);
}

async function inUname(env: Env, chatId: number, raw: string): Promise<void> {
  const s = await st.getState(env, chatId);
  s.tmp.uname = raw.trim().slice(0, 40) || "user";
  s.state = "await_uquota";
  await st.saveState(env, chatId, s);
  await tg.sendMessage(env, chatId, t(L(s), "u_ask_quota"));
}

async function inUquota(env: Env, chatId: number, raw: string): Promise<void> {
  const s = await st.getState(env, chatId);
  if (!/^\d+$/.test(raw.trim())) return void (await tg.sendMessage(env, chatId, ui.badNum(s)));
  s.tmp.uquota = parseInt(raw.trim(), 10);
  s.state = "await_uexp";
  await st.saveState(env, chatId, s);
  await tg.sendMessage(env, chatId, t(L(s), "u_ask_exp"));
}

async function inUexp(env: Env, chatId: number, raw: string): Promise<void> {
  const s = await st.getState(env, chatId);
  if (!/^\d+$/.test(raw.trim())) return void (await tg.sendMessage(env, chatId, ui.badNum(s)));
  const pname = s.tmp.upanel as string | undefined;
  const sess = pname ? await psession(env, s, pname) : null;
  if (!pname || !sess || !sess.ok) {
    s.state = "idle";
    await st.saveState(env, chatId, s);
    return void (await tg.sendMessage(env, chatId, t(L(s), "a_bad")));
  }
  const r = await panel.panelApi(sess.base, sess.cookie, "POST", "/api/users", {
    name: s.tmp.uname || "user",
    quota: s.tmp.uquota ?? 50,
    days: parseInt(raw.trim(), 10),
  });
  s.state = "idle";
  await st.saveState(env, chatId, s);
  if (r.status !== 200 || !r.json?.id) {
    const e = typeof r.json === "object" && r.json?.error ? r.json.error : `HTTP ${r.status}`;
    return void (await tg.sendMessage(env, chatId, t(L(s), "err_net", { e: ui.esc(e) })));
  }
  const links = ui.subLinks(sess.base, r.json);
  const kb = tg.kb([
    [
      { text: t(L(s), "sub_link"), url: links.base64, color: "primary", emoji: false },
      { text: t(L(s), "u_copy"), copy: links.base64, color: "gray", emoji: false },
    ],
    [{ text: t(L(s), "back"), cb: `users:${pname}:${s.tmp.upage || 0}`, color: "gray", emoji: false }],
  ]);
  await tg.sendMessage(env, chatId, ui.party([
    `<b>${t(L(s), "u_created", { n: ui.esc(r.json.name) })}</b>`,
    `📡 <code>${ui.esc(links.base64)}</code>`,
  ]), kb);
}

async function userDelete(env: Env, chatId: number, msgId: number, userId: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const pname = s.tmp.upanel as string | undefined;
  const sess = pname ? await psession(env, s, pname) : null;
  if (!pname || !sess || !sess.ok) {
    return void (await tg.sendMessage(env, chatId, t(L(s), "a_bad")));
  }
  const r = await panel.panelApi(sess.base, sess.cookie, "DELETE", `/api/users?id=${encodeURIComponent(userId)}`);
  if (r.status !== 200) {
    await tg.sendMessage(env, chatId, t(L(s), "err_net", { e: `HTTP ${r.status}` }));
  } else {
    await tg.sendMessage(env, chatId, t(L(s), "u_del_ok", { n: userId.slice(0, 8) }));
  }
  await usersEntry(env, chatId, msgId, pname, s.tmp.upage || 0);
}

async function udetail(env: Env, chatId: number, msgId: number, userId: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const pname = s.tmp.upanel as string | undefined;
  const sess = pname ? await psession(env, s, pname) : null;
  if (!pname || !sess || !sess.ok) {
    s.state = "await_panel_pass";
    s.tmp.ppanel = pname;
    await st.saveState(env, chatId, s);
    const m = ui.askPanelPass(s, pname || "?");
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  const r = await panel.panelApi(sess.base, sess.cookie, "GET", "/api/users");
  const x = Array.isArray(r.json) ? r.json.find((i: any) => i.id === userId) : undefined;
  if (!x) return;
  const m = ui.userDetail(s, pname, x, s.tmp.upage || 0);
  await reply(env, chatId, msgId, m.text, m.kb);
}

/* ================================ CALLBACKS ================================ */

async function navMenu(env: Env, chatId: number, msgId: number, name: string, firstName?: string): Promise<void> {
  const s = await st.getState(env, chatId);
  // هر جابه‌جایی بین منوها، حالت انتظارِ نوشتن تیکت و پاسخ را لغو می‌کند
  if (s.state === "await_support" || s.state === "await_reply") { s.state = "idle"; await st.saveState(env, chatId, s).catch(() => {}); }
  let m: { text: string; kb: tg.Kb };
  switch (name) {
    case "tokens": m = ui.tokensMenu(s); break;
    case "settings": m = ui.settingsMenu(s); break;
    case "help": m = ui.helpMenu(s); break;
    case "support": m = ui.supportMenu(s); break;
    case "owner":
      if (!(await isOwner(env, chatId))) return;
      m = ui.ownerMenu(s, await fj.botMeta(env));
      break;
    case "adm":
      if (!(await adm.isAdmin(env, chatId))) return;
      return await showAdminMenu(env, chatId, s, msgId);
    case "tools": m = ui.toolsMenu(s); break;
    case "texts": m = ui.textsMenu(s); break;
    case "promo": m = ui.promoMenu(s); break;
    case "pin": m = ui.pinMenu(s); break;
    case "doh": m = ui.dohMenu(s); break;
    case "frag": m = ui.fragMenu(s); break;
    case "isp": m = ui.ispMenu(s); break;
    case "tour": m = ui.tourMenu(s, 0); break;
    case "wiz":
      s.state = "await_wiz_sni";
      await st.saveState(env, chatId, s);
      m = ui.wizAsk(s, 0);
      break;
    case "road": return await roadEntry(env, chatId, msgId);
    case "voice": return await voiceEntry(env, chatId, msgId);
    case "cf": return await cfEntry(env, chatId, msgId);
    case "mtx": return await mtxEntry(env, chatId, msgId);
    case "warp": return await warpEntry(env, chatId, msgId);
    default: m = ui.mainMenu(s, firstName, await isOwner(env, chatId), await adm.isAdmin(env, chatId));
  }
  await reply(env, chatId, msgId, m.text, m.kb);
}

async function handleCallback(env: Env, cq: tg.TgCallbackQuery): Promise<void> {
  const chatId = cq.message?.chat?.id;
  const msgId = cq.message?.message_id;
  const data = cq.data || "";
  if (!chatId || !msgId) return;

  // 🚫 مسدودی — کاربر مسدود هیچ دکمه‌ای را نمی‌تواند بزند
  const cbBan = await adm.getBan(env, chatId);
  if (cbBan) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    await adm.banGateNotice(env, chatId, cbBan);
    return;
  }

  const s = await st.getState(env, chatId);
  const firstName = cq.from?.first_name;

  // عضویت اجباری — verify button (always reachable while blocked)
  if (data === "fj:verify") {
    const cfg = await fj.getConfig(env);
    if (!cfg.enabled || !cfg.chats.length) {
      return void (await tg.answerCallback(env, cq.id).catch(() => {}));
    }
    const joined = await fj.verifyAndAnswer(env, chatId, cfg, cq.id, L(s));
    if (joined) {
      const wmsg = cfg.verifyMessage?.trim() || t(L(s), "fj_welcome");
      await tg.sendMessage(env, chatId, wmsg).catch(() => {});
      const m = ui.mainMenu(s, firstName, await isOwner(env, chatId), await adm.isAdmin(env, chatId));
      await tg.sendMessage(env, chatId, m.text, m.kb);
    }
    return;
  }

  // 🔐 قفل لانچر — وقتی قفل باشد هیچ دکمه‌ای کار نمی‌کند (جز تأیید عضویت اجباری)
  if (pinLocked(s)) {
    await tg.answerCallback(env, cq.id, t(L(s), "pin_locked"), true).catch(() => {});
    return;
  }

  // gate every other callback for non-members (answer so the button doesn't spin forever)
  if (!(await fj.gateUser(env, chatId, L(s)))) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return;
  }

  if (data === "noop") return void (await tg.answerCallback(env, cq.id).catch(() => {}));
  if (data === "menu:close") {
    await tg.deleteMessage(env, chatId, msgId).catch(() => {});
    return void (await tg.answerCallback(env, cq.id, "👋").catch(() => {}));
  }
  if (data.startsWith("menu:")) {
    const name = data.split(":")[1];
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await navMenu(env, chatId, msgId, name, firstName);
  }

  /* ---------- مدیریت ادمین‌ها و مسدودی‌ها 👑🚫 ---------- */
  if (data === "adm:add") {
    if (!(await isOwner(env, chatId))) return void (await tg.answerCallback(env, cq.id, "⛔", true).catch(() => {}));
    s.state = "await_admin_id";
    await st.saveState(env, chatId, s);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await tg.sendMessage(env, chatId, ui.adminAskId(s)).catch(() => {}));
  }
  if (data === "adm:list") {
    if (!(await adm.isAdmin(env, chatId))) return void (await tg.answerCallback(env, cq.id, "⛔", true).catch(() => {}));
    const ids = await adm.listAdmins(env);
    const items: Array<{ id: number; label: string }> = [];
    for (const id of ids) items.push({ id, label: await adm.userLabel(env, id) });
    const m = ui.adminList(s, items, await isOwner(env, chatId));
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("adm:del:")) {
    if (!(await isOwner(env, chatId))) return void (await tg.answerCallback(env, cq.id, "⛔", true).catch(() => {}));
    const id = parseInt(data.slice("adm:del:".length), 10);
    const who = await adm.userLabel(env, id);
    const r = await adm.removeAdmin(env, id, chatId);
    await tg.answerCallback(env, cq.id).catch(() => {});
    if (r.ok && r.changed) {
      await adm.notifyAdminRemoved(env, id);
      await reply(env, chatId, msgId, ui.adminRemoved(s, who)).catch(() => {});
    } else if (!r.ok) {
      await reply(env, chatId, msgId, "⛔ " + (r.error || "خطا")).catch(() => {});
    }
    const ids = await adm.listAdmins(env);
    const items: Array<{ id: number; label: string }> = [];
    for (const i2 of ids) items.push({ id: i2, label: await adm.userLabel(env, i2) });
    const m = ui.adminList(s, items, true);
    return void (await tg.sendMessage(env, chatId, m.text, m.kb).catch(() => {}));
  }
  if (data === "ban:new") {
    if (!(await adm.isAdmin(env, chatId))) return void (await tg.answerCallback(env, cq.id, "⛔", true).catch(() => {}));
    s.state = "await_ban_id";
    await st.saveState(env, chatId, s);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await tg.sendMessage(env, chatId, ui.banAskId(s)).catch(() => {}));
  }
  if (data === "ban:list") {
    if (!(await adm.isAdmin(env, chatId))) return void (await tg.answerCallback(env, cq.id, "⛔", true).catch(() => {}));
    const bans = await adm.listBans(env);
    const items: Array<{ id: number; label: string; reason: string; until: string }> = [];
    for (const b of bans) {
      items.push({
        id: b.chatId,
        label: await adm.userLabel(env, b.chatId),
        reason: b.reason,
        until: b.until ? adm.untilLabel(b.until) : (L(s) === "fa" ? "دائمی" : "Permanent"),
      });
    }
    const m = ui.banList(s, items);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("ban:dur:")) {
    if (!(await adm.isAdmin(env, chatId))) return void (await tg.answerCallback(env, cq.id, "⛔", true).catch(() => {}));
    const dur = adm.durationOf(data.slice("ban:dur:".length));
    if (!dur) return void (await tg.answerCallback(env, cq.id).catch(() => {}));
    const who = (s.tmp.banName as string | undefined) || "?";
    s.tmp.banUntil = dur.ms;
    s.tmp.banDurId = dur.id;
    s.state = "await_ban_reason";
    await st.saveState(env, chatId, s);
    await tg.answerCallback(env, cq.id, `📅 ${L(s) === "fa" ? dur.fa : dur.en}`).catch(() => {});
    const prompt = ui.banAskReason(s, who, L(s) === "fa" ? dur.fa : dur.en);
    const edited = await tg.editMessage(env, chatId, msgId, prompt, tg.kb([])).catch(() => null);
    if (!edited || !edited.ok) await tg.sendMessage(env, chatId, prompt).catch(() => {});
    return;
  }
  if (data.startsWith("ban:unban:")) {
    if (!(await adm.isAdmin(env, chatId))) return void (await tg.answerCallback(env, cq.id, "⛔", true).catch(() => {}));
    const id = parseInt(data.slice("ban:unban:".length), 10);
    const who = await adm.userLabel(env, id);
    const r = await adm.unban(env, id, chatId);
    await tg.answerCallback(env, cq.id).catch(() => {});
    if (r.ok && r.changed) await adm.notifyUnbanned(env, id);
    if (r.ok) await reply(env, chatId, msgId, ui.unbanDone(s, who)).catch(() => {});
    else await reply(env, chatId, msgId, "⛔ " + (r.error || "خطا")).catch(() => {});
    const bans = await adm.listBans(env);
    const items: Array<{ id: number; label: string; reason: string; until: string }> = [];
    for (const b of bans) {
      items.push({
        id: b.chatId,
        label: await adm.userLabel(env, b.chatId),
        reason: b.reason,
        until: b.until ? adm.untilLabel(b.until) : (L(s) === "fa" ? "دائمی" : "Permanent"),
      });
    }
    const m = ui.banList(s, items);
    return void (await tg.sendMessage(env, chatId, m.text, m.kb).catch(() => {}));
  }

  /* ---------- پشتیبانی: انتخاب دستهٔ تیکت ---------- */
  if (data.startsWith("sup:cat:")) {
    const cat = ui.catOf(data.slice("sup:cat:".length));
    if (!cat) return void (await tg.answerCallback(env, cq.id).catch(() => {}));
    await sup.openCategory(env, chatId, cat.id, cat.fa, {
      firstName: cq.from?.first_name,
      lastName: cq.from?.last_name,
      username: cq.from?.username,
    });
    // حالت انتظار: پیام بعدی (حتی از مالک) بدنهٔ تیکت می‌شود
    s.state = "await_support";
    s.tmp.supportCat = cat.id;
    await st.saveState(env, chatId, s);
    await tg.answerCallback(env, cq.id, `🏷 ${cat.fa}`).catch(() => {});
    // منوی دسته‌ها را درجا به «دسته انتخاب شد — حالا بنویس» تبدیل می‌کنیم.
    // تأیید «تیکتت ثبت شد» بعد از نوشتن پیام کاربر می‌آید (نه الان).
    const done = ui.supportChosen(s, cat);
    const edited = await tg.editMessage(env, chatId, msgId, done, tg.kb([])).catch(() => null);
    if (!edited || !edited.ok) await tg.sendMessage(env, chatId, done).catch(() => {});
    return;
  }

  // دکمهٔ «پاسخ دادن» روی پیام شخصی مالک → کاربر همین‌جا بنویسد (بدون Mini App)
  if (data === "pm:reply") {
    await tg.answerCallback(env, cq.id, "✍️").catch(() => {});
    // حالت گفتگو: همهٔ پیام‌های بعدی کاربر (حتی اگر مالک باشد) به همین گفتگو اضافه می‌شود
    s.state = "await_reply";
    await st.saveState(env, chatId, s).catch(() => {});
    await tg.sendMessage(env, chatId, ui.pmReplyPrompt()).catch(() => {});
    return;
  }

  // دکمهٔ «پاسخ دادن» روی پاسخ پشتیبانی → کاربر همین‌جا بنویسد (به همان تیکت اضافه می‌شود)
  if (data === "sup:reply") {
    await tg.answerCallback(env, cq.id, "✍️").catch(() => {});
    s.state = "await_reply";
    await st.saveState(env, chatId, s).catch(() => {});
    await tg.sendMessage(env, chatId, ui.supportReplyPrompt()).catch(() => {});
    return;
  }

  // امتیاز بعد از بسته شدن تیکت — فقط صاحب تیکت می‌تواند امتیاز بدهد
  if (data.startsWith("sup:rate:")) {
    const parts = data.split(":");
    const tid = parseInt(parts[2], 10);
    const rating = parseInt(parts[3], 10);
    if (!Number.isInteger(tid) || tid !== chatId || !Number.isInteger(rating)) {
      return void (await tg.answerCallback(env, cq.id, "⛔", true).catch(() => {}));
    }
    await sup.setRating(env, tid, rating);
    await tg.answerCallback(env, cq.id, "🙏").catch(() => {});
    await tg.editMessage(env, chatId, msgId, ui.ratingThanks(rating), tg.kb([])).catch(() => {});
    return;
  }

  /* ---------- forced join (owner) ---------- */
  if (data === "fj:setchat") {
    if (!(await isOwner(env, chatId))) return void (await tg.answerCallback(env, cq.id).catch(() => {}));
    s.state = "await_fj_chat";
    await st.saveState(env, chatId, s);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await tg.sendMessage(env, chatId, ui.fjAskChat(s)));
  }
  if (data === "fj:status") {
    const cfg = await fj.getConfig(env);
    const m = ui.fjStatusMenu(s, {
      enabled: cfg.enabled, chats: cfg.chats, mode: cfg.mode,
      recheckHours: cfg.recheckHours, exempt: cfg.exempt,
      chatMeta: cfg.chatMeta, applyTo: cfg.applyTo, legacy: cfg.legacy,
    });
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }

  /* ---------- build ---------- */
  if (data === "do:build") {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await buildEntry(env, chatId, msgId);
  }
  if (data === "do:buildyes") {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await doBuild(env, chatId, msgId);
  }
  if (data === "do:randname") {
    let sug = randName();
    while (s.panels.some((p) => p.name === sug)) sug = randName();
    s.tmp.suggest = sug;
    await st.saveState(env, chatId, s);
    const m = ui.namePrompt(s, sug);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data === "do:usesuggest") {
    let sug = (s.tmp.suggest as string | undefined) || randName();
    if (!RX_NAME.test(sug) || s.panels.some((p) => p.name === sug)) sug = randName();
    s.tmp.name = sug;
    s.state = "idle";
    await st.saveState(env, chatId, s);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await buildConfirmStep(env, chatId, msgId);
  }

  /* ---------- token ---------- */
  if (data === "tok:add") {
    s.state = "await_token";
    delete s.tmp.after_token;
    await st.saveState(env, chatId, s);
    const m = ui.tokenPrompt(s);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("tok:use:")) {
    const tid = data.split(":")[2];
    if (s.tokens[tid]) {
      s.activeToken = tid;
      delete s.tmp.ephemeral;
      await st.saveState(env, chatId, s);
      await tg.answerCallback(env, cq.id, t(L(s), "tok_switch", { n: ui.esc(s.tokens[tid].name) })).catch(() => {});
    }
    const m = ui.tokensMenu(s);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("tok:del:")) {
    const tid = data.split(":")[2];
    const tk = s.tokens[tid];
    if (!tk) return void (await tg.answerCallback(env, cq.id).catch(() => {}));
    const m = ui.confirmMenu(L(s), `tok:delgo:${tid}`, "menu:tokens", t(L(s), "tok_del_q", { n: ui.esc(tk.name) }));
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("tok:delgo:")) {
    const tid = data.split(":")[2];
    const tk = s.tokens[tid];
    delete s.tokens[tid];
    if (s.activeToken === tid) s.activeToken = Object.keys(s.tokens)[0];
    await st.saveState(env, chatId, s);
    await tg.answerCallback(env, cq.id, t(L(s), "tok_deleted", { n: tk?.name || "?" })).catch(() => {});
    const m = ui.tokensMenu(s);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data === "save_y" || data === "save_n") {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await afterSave(env, chatId, msgId, data === "save_y");
  }

  /* ---------- account ---------- */
  if (data.startsWith("acc:")) {
    const i = parseInt(data.split(":")[1], 10);
    const rec = activeRec(s);
    if (!rec || !(await setRecAccountId(s, rec, i))) {
      return void (await tg.answerCallback(env, cq.id, "❌", true).catch(() => {}));
    }
    s.state = "await_name";
    s.tmp.suggest = undefined;
    await st.saveState(env, chatId, s);
    await tg.answerCallback(env, cq.id).catch(() => {});
    const m = ui.namePrompt(s);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }

  /* ---------- settings ---------- */
  if (data === "do:lang") {
    s.lang = s.lang === "fa" ? "en" : "fa";
    await st.saveState(env, chatId, s);
    await tg.sendMessage(env, chatId, "⌨️", ui.replyMenu(s));
    const m = ui.settingsMenu(s);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data === "do:getbundle") {
    await tg.answerCallback(env, cq.id, "📦").catch(() => {});
    await tg.sendDocument(env, chatId, "worker.js", BUNDLE).catch(() => {});
    return;
  }
  if (data === "do:skin") {
    const m = ui.skinsMenu(s);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("skin:")) {
    const id = data.slice(5);
    s.skin = id === "neon" || id === "paper" ? id : "graphite";
    await st.saveState(env, chatId, s);
    const m = ui.skinsMenu(s);
    await tg.answerCallback(env, cq.id, ui.SKINS[s.skin].lit).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }

  /* ---------- panels ---------- */
  if (data.startsWith("panels:")) {
    const pg = parseInt(data.split(":")[1], 10) || 0;
    const m = ui.panelsList(s, pg);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("panel:")) {
    const m = ui.panelDetail(s, data.slice("panel:".length));
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("pupd:")) {
    const name = data.slice(5);
    const m = ui.confirmMenu(L(s), `pupdgo:${name}`, `panel:${name}`, t(L(s), "pd_upd_q", { n: ui.esc(name) }));
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("pupdgo:")) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await panelUpdate(env, chatId, msgId, data.slice(7));
  }
  if (data.startsWith("pdel:")) {
    const name = data.slice(5);
    const m = ui.confirmMenu(L(s), `pdelgo:${name}`, `panel:${name}`, t(L(s), "pd_del_q", { n: ui.esc(name) }));
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("pdelgo:")) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await panelDelete(env, chatId, msgId, data.slice(7));
  }
  if (data.startsWith("pusers:")) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await usersEntry(env, chatId, msgId, data.slice(7), 0);
  }

  /* ---------- update all ---------- */
  if (data === "upd:all") {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await updateAll(env, chatId, msgId);
  }

  /* ---------- health ---------- */
  if (data === "do:health") {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await healthAll(env, chatId, msgId);
  }

  /* ---------- users ---------- */
  if (data === "do:users") {
    if (!s.panels.length) {
      const m = ui.panelsList(s, 0);
      await tg.answerCallback(env, cq.id).catch(() => {});
      return void (await reply(env, chatId, msgId, m.text, m.kb));
    }
    if (s.panels.length === 1) {
      await tg.answerCallback(env, cq.id).catch(() => {});
      return await usersEntry(env, chatId, msgId, s.panels[0].name, 0);
    }
    const rows: tg.Btn[][] = s.panels.map((p) => [{ text: `${ui.healthDot(p)} ${ui.esc(p.name)}`, cb: `pusers:${p.name}`, color: "primary", emoji: false }]);
    rows.push([{ text: t(L(s), "back"), cb: "menu:main", color: "gray", emoji: false }]);
    const m = { text: ui.makeText("👥", "👇", t(L(s), "choose"), null, "users"), kb: tg.kb(rows) };
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("users:")) {
    const parts = data.split(":");
    const name = parts[1];
    const page = parseInt(parts[2], 10) || 0;
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await usersEntry(env, chatId, msgId, name, page);
  }
  if (data.startsWith("user:")) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await udetail(env, chatId, msgId, data.slice(5));
  }
  if (data.startsWith("udel:")) {
    const userId = data.slice(5);
    const m = ui.confirmMenu(L(s), `udelgo:${userId}`, `users:${s.tmp.upanel}:${s.tmp.upage || 0}`, t(L(s), "u_del_q", { n: userId.slice(0, 8) }));
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("udelgo:")) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await userDelete(env, chatId, msgId, data.slice(7));
  }
  if (data.startsWith("unew:")) {
    const pname = data.slice(5);
    s.tmp.upanel = pname;
    s.state = "await_uname";
    await st.saveState(env, chatId, s);
    const m = ui.askUname(s, pname);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data === "asave:y" || data === "asave:n") {
    const pname = s.tmp.ppanel as string | undefined;
    if (pname && s.panelAuth[pname]) {
      s.panelAuth[pname].saved = data === "asave:y";
      await st.saveState(env, chatId, s);
    }
    await tg.answerCallback(env, cq.id, data === "asave:y" ? t(L(s), "a_saved") : t(L(s), "a_nosave")).catch(() => {});
    return await usersEntry(env, chatId, msgId, pname || "", 0);
  }

  /* ---------- HYPER ✨ tools ---------- */

  // 🎙 voice — read a panel's live status
  if (data.startsWith("voice:")) {
    const pname = data.slice(6);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await voiceEntry(env, chatId, msgId, pname);
  }

  // ⛓ warp — pick a user / toggle protocol
  if (data.startsWith("warp:g:")) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await warpGet(env, chatId, msgId, data.slice(7));
  }
  if (data.startsWith("warp:en:")) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await warpToggle(env, chatId, msgId, data.slice(8));
  }
  if (data.startsWith("warp:")) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await warpEntry(env, chatId, msgId, data.slice(5) || undefined);
  }

  // 📡 isp — apply an operator preset SNI to the panel
  if (data.startsWith("isp:")) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await ispApply(env, chatId, msgId, data.slice(4));
  }

  // 🎓 tour — next/prev step
  if (data.startsWith("tour:")) {
    const step = Math.max(0, parseInt(data.slice(5), 10) || 0);
    await tg.answerCallback(env, cq.id).catch(() => {});
    const m = ui.tourMenu(s, step);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }

  // ✍️ texts — pick which text to override / clear all
  if (data.startsWith("txt:")) {
    const key = data.slice(4);
    await tg.answerCallback(env, cq.id).catch(() => {});
    if (key === "clear") {
      const c = s.cfg || {};
      delete c.hello; delete c.desc; delete c.tip;
      s.cfg = c;
      await st.saveState(env, chatId, s);
      const m = ui.textsMenu(s);
      return void (await reply(env, chatId, msgId, m.text, m.kb));
    }
    if (key === "hello" || key === "desc" || key === "tip") {
      s.state = "await_txt";
      s.tmp.txtKey = key;
      await st.saveState(env, chatId, s);
      return void (await reply(env, chatId, msgId, t(L(s), "txt_ask"), tg.kb([[{ text: t(L(s), "cancel"), cb: "menu:texts", color: "gray", emoji: false }]])));
    }
    return;
  }

  // 📣 promo — edit / delete the channel post
  if (data.startsWith("promo:")) {
    const act = data.slice(6);
    await tg.answerCallback(env, cq.id).catch(() => {});
    if (act === "edit") {
      s.state = "await_promo";
      await st.saveState(env, chatId, s);
      return void (await reply(env, chatId, msgId, t(L(s), "promo_ask"), tg.kb([[{ text: t(L(s), "cancel"), cb: "menu:promo", color: "gray", emoji: false }]])));
    }
    if (act === "del") {
      const c = s.cfg || {};
      delete c.promo;
      s.cfg = c;
      await st.saveState(env, chatId, s);
      const m = ui.promoMenu(s);
      return void (await reply(env, chatId, msgId, m.text, m.kb));
    }
    return;
  }

  // 🔐 pin — set / remove
  if (data === "pin:set") {
    await tg.answerCallback(env, cq.id).catch(() => {});
    s.state = "await_pin1";
    await st.saveState(env, chatId, s);
    return void (await reply(env, chatId, msgId, t(L(s), "pin_ask"), tg.kb([[{ text: t(L(s), "cancel"), cb: "menu:pin", color: "gray", emoji: false }]])));
  }
  if (data === "pin:off") {
    await tg.answerCallback(env, cq.id).catch(() => {});
    const c = s.cfg || {};
    delete c.pin; delete c.unlockedAt; delete c.fails;
    s.cfg = c;
    s.state = "idle";
    await st.saveState(env, chatId, s);
    await tg.sendMessage(env, chatId, t(L(s), "pin_removed")).catch(() => {});
    const m = ui.pinMenu(s);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }

  // 📟 subscription status
  if (data === "sub:ask") {
    await tg.answerCallback(env, cq.id).catch(() => {});
    s.state = "await_sublink";
    await st.saveState(env, chatId, s);
    const m = ui.subAskMenu(s);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }

  await tg.answerCallback(env, cq.id).catch(() => {});
}

/* ================================ HYPER ✨ tools ================================ */
/* Everything below reads REAL panel/API data — ported from nika_launcher_pro.    */

function pinLocked(s: UserState): boolean {
  if (!s.cfg?.pin) return false;
  const u = Number(s.cfg.unlockedAt) || 0;
  return Date.now() - u > ex.PIN_TTL * 1000;
}

/* ---------- 🎙 voice ---------- */
async function voiceEntry(env: Env, chatId: number, msgId: number | undefined, pname?: string): Promise<void> {
  const s = await st.getState(env, chatId);
  if (pname) {
    const sess = await ex.panelSession(env, s, pname);
    const back = tg.kb([[{ text: t(L(s), "back"), cb: "menu:voice", color: "gray", emoji: false }]]);
    if (!sess.ok) {
      return void (await reply(env, chatId, msgId, ui.makeText("🎙", t(L(s), "no_pass"), null, null, "danger"), back));
    }
    const st2 = await ex.statusOf(sess.base, sess.cookie);
    if (!st2) {
      return void (await reply(env, chatId, msgId, ui.makeText("🎙", t(L(s), "voice_noauth"), null, null, "danger"), back));
    }
    return void (await reply(env, chatId, msgId, ui.voiceResult(s, pname, st2 as unknown as Record<string, unknown>), back));
  }
  const authed = s.panels.filter((p) => s.panelAuth[p.name]).map((p) => p.name);
  const m = ui.voiceMenu(s, authed);
  await reply(env, chatId, msgId, m.text, m.kb);
}

/* ---------- 📊 cf quota ---------- */
async function cfEntry(env: Env, chatId: number, msgId: number | undefined): Promise<void> {
  const s = await st.getState(env, chatId);
  const authed = s.panels.filter((p) => s.panelAuth[p.name]);
  if (!authed.length) {
    const m = ui.cfMenu(s, []);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  const entries: { name: string; r: number | null }[] = [];
  for (const p of authed) {
    const sess = await ex.panelSession(env, s, p.name);
    if (!sess.ok) { entries.push({ name: p.name, r: null }); continue; }
    const st2 = await ex.statusOf(sess.base, sess.cookie);
    entries.push({ name: p.name, r: st2 ? Number(st2.requestsToday) || 0 : null });
  }
  const m = ui.cfMenu(s, entries);
  await reply(env, chatId, msgId, m.text, m.kb);
}

/* ---------- 🧮 matrix ---------- */
async function mtxEntry(env: Env, chatId: number, msgId: number | undefined): Promise<void> {
  const s = await st.getState(env, chatId);
  const authed = s.panels.filter((p) => s.panelAuth[p.name]);
  if (!authed.length) {
    const m = ui.mtxMenu(s, []);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  const entries: { name: string; users: number; active: number; r: number | null }[] = [];
  for (const p of authed) {
    const sess = await ex.panelSession(env, s, p.name);
    if (!sess.ok) { entries.push({ name: p.name, users: 0, active: 0, r: null }); continue; }
    const [us, st2] = await Promise.all([ex.usersOf(sess.base, sess.cookie), ex.statusOf(sess.base, sess.cookie)]);
    entries.push({
      name: p.name,
      users: us ? us.length : 0,
      active: us ? us.filter((u) => !!u.active).length : 0,
      r: st2 ? Number(st2.requestsToday) || 0 : null,
    });
  }
  const m = ui.mtxMenu(s, entries);
  await reply(env, chatId, msgId, m.text, m.kb);
}

/* ---------- ⛓ warp ---------- */
async function warpEntry(env: Env, chatId: number, msgId: number | undefined, pname?: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const p =
    (pname && s.panels.find((x) => x.name === pname)) ||
    (s.tmp.upanel && s.panels.find((x) => x.name === s.tmp.upanel)) ||
    s.panels.find((x) => s.panelAuth[x.name]) ||
    s.panels[0];
  if (!p) {
    return void (await reply(env, chatId, msgId, ui.makeText(t(L(s), "warp_t"), t(L(s), "mtx_none"), null, null, "danger"), tg.kb([[{ text: t(L(s), "back"), cb: "menu:tools", color: "gray", emoji: false }]])));
  }
  const sess = await ex.panelSession(env, s, p.name);
  if (!sess.ok) {
    return void (await reply(env, chatId, msgId, ui.makeText("⛓", t(L(s), "no_pass"), null, null, "danger"), tg.kb([[{ text: t(L(s), "back"), cb: "menu:tools", color: "gray", emoji: false }]])));
  }
  const [cfg, us] = await Promise.all([ex.settingsOf(sess.base, sess.cookie), ex.usersOf(sess.base, sess.cookie)]);
  const warpOn = !!(cfg?.protocols && (cfg.protocols as Record<string, boolean>).warp);
  const m = ui.warpMenu(s, p.name, us || [], warpOn);
  await reply(env, chatId, msgId, m.text, m.kb);
}

async function warpGet(env: Env, chatId: number, msgId: number, spec: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const [pname, uid] = [spec.split(":")[0], spec.split(":").slice(1).join(":")];
  const sess = await ex.panelSession(env, s, pname);
  if (!sess.ok) {
    return void (await reply(env, chatId, msgId, ui.makeText("⛓", t(L(s), "no_pass"), null, null, "danger")));
  }
  const us = await ex.usersOf(sess.base, sess.cookie);
  const x = (us || []).find((i) => i.id === uid);
  if (!x) return;
  const conf = ex.warpConfig({ uuid: x.uuid, password: x.password });
  const m = ui.warpConf(s, pname, x.name || uid.slice(0, 8), conf);
  await reply(env, chatId, msgId, m.text, m.kb);
}

async function warpToggle(env: Env, chatId: number, msgId: number, pname: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const sess = await ex.panelSession(env, s, pname);
  if (!sess.ok) {
    return void (await reply(env, chatId, msgId, ui.makeText("⛓", t(L(s), "no_pass"), null, null, "danger")));
  }
  const cfg = await ex.settingsOf(sess.base, sess.cookie);
  const prot = (cfg?.protocols && typeof cfg.protocols === "object" ? { ...(cfg.protocols as Record<string, boolean>) } : {}) as Record<string, boolean>;
  const nowOn = !prot.warp;
  prot.warp = nowOn;
  const r = await ex.patchSettings(sess.base, sess.cookie, { protocols: prot });
  if (!r.ok) {
    return void (await reply(env, chatId, msgId, ui.makeText("⛓", r.err, null, null, "danger")));
  }
  const us = await ex.usersOf(sess.base, sess.cookie);
  const m = ui.warpMenu(s, pname, us || [], nowOn);
  await reply(env, chatId, msgId, m.text, m.kb);
}

/* ---------- 📡 isp ---------- */
async function ispApply(env: Env, chatId: number, msgId: number | undefined, key: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const preset = ex.ISP_PRESETS[key];
  if (!preset) return;
  const p =
    (s.tmp.upanel && s.panels.find((x) => x.name === s.tmp.upanel)) ||
    s.panels.find((x) => s.panelAuth[x.name]) ||
    s.panels[0];
  if (!p) {
    return void (await reply(env, chatId, msgId, ui.ispNop(s), tg.kb([[{ text: t(L(s), "back"), cb: "menu:isp", color: "gray", emoji: false }]])));
  }
  const sess = await ex.panelSession(env, s, p.name);
  if (!sess.ok) {
    return void (await reply(env, chatId, msgId, ui.makeText(t(L(s), "isp_t"), t(L(s), "no_pass"), null, null, "danger"), tg.kb([[{ text: t(L(s), "back"), cb: "menu:isp", color: "gray", emoji: false }]])));
  }
  const r = await ex.patchSettings(sess.base, sess.cookie, { sni: preset.sni[0] });
  const txt = r.ok ? ui.ispApplied(s, p.name, preset.sni[0]) : ui.makeText(t(L(s), "isp_t"), t(L(s), "wiz_fail", { e: ui.esc(r.err) }), null, null, "danger");
  await reply(env, chatId, msgId, txt, tg.kb([[{ text: t(L(s), "back"), cb: "menu:isp", color: "gray", emoji: false }]]));
}

/* ---------- 🗺 roadmap ---------- */
async function roadEntry(env: Env, chatId: number, msgId: number | undefined): Promise<void> {
  const s = await st.getState(env, chatId);
  const body = await ex.fetchRoadmap();
  const m = ui.roadMenu(s, body || "");
  await reply(env, chatId, msgId, m.text, m.kb);
}

/* ---------- 🕵️ wiz ---------- */
async function inWizSni(env: Env, chatId: number, msgId: number | undefined, text: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const sni = text.trim();
  const ok = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(sni);
  if (!ok) return void (await tg.sendMessage(env, chatId, t(L(s), "wiz_bad_sni")));
  s.tmp.wizSni = sni;
  s.state = "await_wiz_ws";
  await st.saveState(env, chatId, s);
  const m = ui.wizAsk(s, 1);
  await tg.sendMessage(env, chatId, m.text, m.kb);
}

async function inWizWs(env: Env, chatId: number, msgId: number | undefined, text: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const ws = text.trim();
  if (!/^\/([a-zA-Z0-9\-_/]{0,64})$/.test(ws)) return void (await tg.sendMessage(env, chatId, t(L(s), "wiz_bad_ws")));
  const sni = (s.tmp.wizSni as string) || "";
  const p =
    (s.tmp.upanel && s.panels.find((x) => x.name === s.tmp.upanel)) ||
    s.panels.find((x) => s.panelAuth[x.name]) ||
    s.panels[0];
  s.state = "idle";
  await st.saveState(env, chatId, s);
  if (!p) return void (await tg.sendMessage(env, chatId, ui.wizFail(s, t(L(s), "isp_nop"))));
  const sess = await ex.panelSession(env, s, p.name);
  if (!sess.ok) return void (await tg.sendMessage(env, chatId, ui.wizFail(s, t(L(s), "no_pass"))));
  const r = await ex.patchSettings(sess.base, sess.cookie, { sni, wsPath: ws });
  await tg.sendMessage(env, chatId, r.ok ? ui.wizDone(s) : ui.wizFail(s, r.err));
}

/* ---------- ✍️ texts ---------- */
async function inTxt(env: Env, chatId: number, text: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const key = (s.tmp.txtKey as string) || "tip";
  const def = /^\/default$/i.test(text.trim());
  const c = s.cfg || {};
  if (def) delete c[key];
  else c[key] = text.trim().slice(0, 300);
  s.cfg = c;
  s.state = "idle";
  await st.saveState(env, chatId, s);
  await tg.sendMessage(env, chatId, def ? t(L(s), "txt_cleared") : t(L(s), "txt_saved"));
  const m = ui.textsMenu(s);
  await tg.sendMessage(env, chatId, m.text, m.kb);
}

/* ---------- 📣 promo ---------- */
async function inPromo(env: Env, chatId: number, text: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const def = /^\/default$/i.test(text.trim());
  const c = s.cfg || {};
  if (def) delete c.promo;
  else c.promo = text.trim().slice(0, 1000);
  s.cfg = c;
  s.state = "idle";
  await st.saveState(env, chatId, s);
  await tg.sendMessage(env, chatId, t(L(s), "promo_saved"));
  const m = ui.promoMenu(s);
  await tg.sendMessage(env, chatId, m.text, m.kb);
}

/* ---------- 📟 subscription status ---------- */
async function inSubLink(env: Env, chatId: number, text: string): Promise<void> {
  const s = await st.getState(env, chatId);
  s.state = "idle";
  await st.saveState(env, chatId, s);
  const link = text.trim();
  let good = false;
  try {
    const u = new URL(link);
    good = u.protocol === "https:" || u.protocol === "http:";
  } catch {
    good = false;
  }
  if (!good) return void (await tg.sendMessage(env, chatId, ui.subResult(s, false, { error: "badurl" })));
  const r = await ex.subStatus(link);
  await tg.sendMessage(env, chatId, ui.subResult(s, r.ok, r));
}

/* ---------- 🔐 pin ---------- */
async function cmdUnlock(env: Env, chatId: number, msgId: number | undefined, text: string): Promise<void> {
  const s = await st.getState(env, chatId);
  if (!s.cfg?.pin) return void (await tg.sendMessage(env, chatId, t(L(s), "pin_no")));
  const pin = text.replace(/^\/unlock\s*/i, "").trim();
  if (!/^\d{4,8}$/.test(pin)) {
    s.state = "await_unlock";
    await st.saveState(env, chatId, s);
    return void (await tg.sendMessage(env, chatId, t(L(s), "pin_ask")));
  }
  return await tryPin(env, chatId, pin);
}

async function inUnlock(env: Env, chatId: number, text: string): Promise<void> {
  if (!/^\d{4,8}$/.test(text.trim())) {
    const s = await st.getState(env, chatId);
    return void (await tg.sendMessage(env, chatId, t(L(s), "pin_ask")));
  }
  return await tryPin(env, chatId, text.trim());
}

async function tryPin(env: Env, chatId: number, pin: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const lang = L(s);
  if (!s.cfg?.pin) {
    s.state = "idle";
    await st.saveState(env, chatId, s);
    return void (await tg.sendMessage(env, chatId, t(lang, "pin_no")));
  }
  const cool = Number(s.cfg.coolAt) || 0;
  if (Date.now() < cool) {
    const left = Math.ceil((cool - Date.now()) / 1000);
    return void (await tg.sendMessage(env, chatId, t(lang, "pin_cool", { s: String(left) })));
  }
  const h = await ex.pinHash(env, pin);
  if (h !== s.cfg.pin) {
    let fails = Number(s.cfg.fails) || 0;
    fails += 1;
    if (fails >= 3) {
      s.cfg.fails = 0;
      s.cfg.coolAt = Date.now() + 30_000;
      await st.saveState(env, chatId, s);
      return void (await tg.sendMessage(env, chatId, t(lang, "pin_cool", { s: "30" })));
    }
    s.cfg.fails = fails;
    await st.saveState(env, chatId, s);
    return void (await tg.sendMessage(env, chatId, t(lang, "pin_wrong", { n: String(3 - fails) })));
  }
  s.cfg.unlockedAt = Date.now();
  s.cfg.fails = 0;
  s.state = "idle";
  await st.saveState(env, chatId, s);
  await tg.sendMessage(env, chatId, t(lang, "pin_unl", { m: String(Math.round(ex.PIN_TTL / 60)) }));
  const m = ui.mainMenu(s, undefined, await isOwner(env, chatId), await adm.isAdmin(env, chatId));
  await tg.sendMessage(env, chatId, m.text, m.kb);
}

async function inPin1(env: Env, chatId: number, text: string): Promise<void> {
  const s = await st.getState(env, chatId);
  if (!/^\d{4,8}$/.test(text.trim())) return void (await tg.sendMessage(env, chatId, t(L(s), "pin_ask")));
  s.tmp.pin1 = text.trim();
  s.state = "await_pin2";
  await st.saveState(env, chatId, s);
  await tg.sendMessage(env, chatId, t(L(s), "pin_again"));
}

async function inPin2(env: Env, chatId: number, text: string): Promise<void> {
  const s = await st.getState(env, chatId);
  if (text.trim() !== (s.tmp.pin1 as string)) {
    s.state = "await_pin1";
    await st.saveState(env, chatId, s);
    return void (await tg.sendMessage(env, chatId, t(L(s), "pin_mismatch")));
  }
  const c = s.cfg || {};
  c.pin = await ex.pinHash(env, text.trim());
  c.unlockedAt = Date.now();
  c.fails = 0;
  s.cfg = c;
  s.state = "idle";
  await st.saveState(env, chatId, s);
  await tg.sendMessage(env, chatId, t(L(s), "pin_set_ok"));
  const m = ui.pinMenu(s);
  await tg.sendMessage(env, chatId, m.text, m.kb);
}
