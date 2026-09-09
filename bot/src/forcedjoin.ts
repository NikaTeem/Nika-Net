// Nika Net Launcher — forced join (عضویت اجباری) engine.
//
// Users must join the configured channel(s)/group(s) before they can use the
// bot. Membership is checked via Telegram getChatMember (the bot must be an
// admin of the target chat). Results are cached in KV for `recheckHours` to
// keep the bot fast.
//
// Smart extras:
//   • real channel titles via getChat (cached in `chatMeta`)
//   • auto-add / auto-remove chats when the bot is promoted / demoted
//     (my_chat_member updates)
//   • real analytics: blocked / verified counters, 7-day series, event log
//   • anti-spam prompt cooldown, "new users only" grandfathering,
//     custom verify welcome message.

import { Env } from "./types";
import * as tg from "./telegram";
import { t, Lang } from "./i18n";

export interface ChatMeta {
  title: string;
  type?: string;
  username?: string;
  updatedAt?: number;
}

export interface FjConfig {
  enabled: boolean;
  chats: string[];              // "@username" or numeric chat id
  mode: "all" | "any";          // must join ALL chats, or ANY of them
  message: string;              // join prompt text (supports {name}, {chat})
  buttonText: string;           // verify button label
  recheckHours: number;         // 0 = always re-check; N = cache membership for N hours
  exempt: number[];             // extra exempt user ids (owner is always exempt)
  chatMeta: Record<string, ChatMeta>; // cached titles/type/username
  applyTo: "all" | "new";       // "new" = only users who joined after enabling
  legacy: number[];             // grandfathered ids (when applyTo === "new")
  verifyMessage: string;        // welcome text sent after a successful verify ("" = default)
  promptCooldownMin: number;    // minutes between join prompts per user (0 = every message)
}

export const FJ_DEFAULT: FjConfig = {
  enabled: false,
  chats: [],
  mode: "any",
  message: "برای استفاده از ربات، ابتدا در کانال(های) زیر عضو شو 👇",
  buttonText: "✅ عضویت انجام شد — بررسی کن",
  recheckHours: 6,
  exempt: [],
  chatMeta: {},
  applyTo: "all",
  legacy: [],
  verifyMessage: "",
  promptCooldownMin: 2,
};

const KEY = "fj:config";

export async function getConfig(env: Env): Promise<FjConfig> {
  try {
    const raw = await env.BOT_KV.get(KEY);
    if (!raw) return { ...FJ_DEFAULT };
    const c = JSON.parse(raw) as Partial<FjConfig>;
    return {
      enabled: !!c.enabled,
      chats: Array.isArray(c.chats) ? c.chats.map(String).filter(Boolean) : [],
      mode: c.mode === "all" ? "all" : "any",
      message: c.message || FJ_DEFAULT.message,
      buttonText: c.buttonText || FJ_DEFAULT.buttonText,
      recheckHours: Number(c.recheckHours) || 0,
      exempt: Array.isArray(c.exempt) ? c.exempt.map(Number).filter((n) => !Number.isNaN(n)) : [],
      chatMeta: c.chatMeta && typeof c.chatMeta === "object" ? c.chatMeta : {},
      applyTo: c.applyTo === "new" ? "new" : "all",
      legacy: Array.isArray(c.legacy) ? c.legacy.map(Number).filter((n) => !Number.isNaN(n)) : [],
      verifyMessage: typeof c.verifyMessage === "string" ? c.verifyMessage : "",
      promptCooldownMin: Number.isFinite(Number(c.promptCooldownMin)) ? Math.max(0, Math.min(1440, Number(c.promptCooldownMin))) : FJ_DEFAULT.promptCooldownMin,
    };
  } catch {
    return { ...FJ_DEFAULT };
  }
}

export async function saveConfig(env: Env, c: Partial<FjConfig>): Promise<FjConfig> {
  const prev = await getConfig(env);
  const clean: FjConfig = {
    enabled: typeof c.enabled === "boolean" ? c.enabled : prev.enabled,
    chats: Array.isArray(c.chats) ? Array.from(new Set(c.chats.map(String).filter(Boolean))) : prev.chats,
    mode: c.mode === "all" ? "all" : "any",
    message: typeof c.message === "string" ? c.message : prev.message,
    buttonText: typeof c.buttonText === "string" ? c.buttonText : prev.buttonText,
    recheckHours: Number.isFinite(Number(c.recheckHours)) ? Math.max(0, Math.min(720, Number(c.recheckHours))) : prev.recheckHours,
    exempt: Array.isArray(c.exempt) ? c.exempt.map(Number).filter((n) => !Number.isNaN(n)) : prev.exempt,
    chatMeta: c.chatMeta && typeof c.chatMeta === "object" ? c.chatMeta : prev.chatMeta,
    applyTo: c.applyTo === "new" ? "new" : "all",
    legacy: Array.isArray(c.legacy) ? c.legacy.map(Number).filter((n) => !Number.isNaN(n)) : prev.legacy,
    verifyMessage: typeof c.verifyMessage === "string" ? c.verifyMessage : prev.verifyMessage,
    promptCooldownMin: Number.isFinite(Number(c.promptCooldownMin)) ? Math.max(0, Math.min(1440, Number(c.promptCooldownMin))) : prev.promptCooldownMin,
  };
  await env.BOT_KV.put(KEY, JSON.stringify(clean));
  return clean;
}

/* ---------- tiny html escape (prompt text is HTML) ---------- */
const esc = (s: unknown): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------- chat identifier parsing ---------- */
// Accepts: @username, t.me/username, https://t.me/username, numeric id (-100…),
// plus a raw numeric group id. Returns "@name" or the numeric string.
export function normalizeChat(raw: string): string | null {
  let s = (raw || "").trim();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, "").replace(/^t\.me\//, "").replace(/^telegram\.me\//, "").replace(/^telegram\.dog\//, "");
  if (s.includes("/")) s = s.split("/")[0];
  s = s.replace(/^@/, "").trim();
  if (!s) return null;
  if (/^-?\d{5,}$/.test(s)) return s;
  if (/^[a-zA-Z][a-zA-Z0-9_]{3,31}$/.test(s)) return "@" + s;
  return null;
}

/* ---------- membership ---------- */
export interface ChatCheck {
  chat: string;
  ok: boolean;
  status: string;
  error?: string;
}

export async function checkChat(env: Env, userId: number, chat: string): Promise<ChatCheck> {
  try {
    const r: any = await tg.getChatMember(env, chat, userId);
    const status: string = r?.result?.status || "unknown";
    const ok =
      status === "creator" || status === "administrator" || status === "member" ||
      (status === "restricted" && !!r?.result?.is_member);
    return { chat, ok, status };
  } catch (e: any) {
    return { chat, ok: false, status: "error", error: String(e?.message || e) };
  }
}

// The real prerequisite for forced-join: the BOT itself must be an admin of the
// target chat (otherwise getChatMember on other users returns 400/left).
export async function checkBotAdmin(env: Env, chat: string): Promise<ChatCheck> {
  try {
    const me: any = await tg.getMe(env);
    const botId: number | undefined = me?.result?.id;
    if (!botId) return { chat, ok: false, status: "error", error: "getMe failed" };
    const r: any = await tg.getChatMember(env, chat, botId);
    const status: string = r?.result?.status || "unknown";
    const ok = status === "administrator" || status === "creator";
    return { chat, ok, status };
  } catch (e: any) {
    return { chat, ok: false, status: "error", error: String(e?.message || e) };
  }
}

/* ---------- chat titles (cached) ---------- */
export async function chatTitle(env: Env, chat: string): Promise<ChatMeta> {
  const cfg = await getConfig(env);
  const cached = cfg.chatMeta[chat];
  if (cached && cached.title && cached.title !== chat && Date.now() - (cached.updatedAt || 0) < 6 * 3600_000) {
    return cached;
  }
  let meta: ChatMeta = { title: chat, updatedAt: Date.now() };
  try {
    const r: any = await tg.getChat(env, chat);
    const res = r?.result;
    if (res?.title || res?.first_name) {
      meta = { title: res.title || res.first_name, type: res.type || "", username: res.username, updatedAt: Date.now() };
    }
  } catch { /* keep the raw id */ }
  cfg.chatMeta[chat] = meta;
  await saveConfig(env, cfg);
  return meta;
}

export const chatDisplay = (cfg: FjConfig, chat: string): string =>
  cfg.chatMeta[chat]?.title || chat;

// Backfill missing cached titles so prompts/panel show real channel names.
export async function ensureTitles(env: Env, cfg: FjConfig): Promise<FjConfig> {
  let dirty = false;
  for (const c of cfg.chats) {
    const m = cfg.chatMeta[c];
    if (m && m.title && m.title !== c && Date.now() - (m.updatedAt || 0) < 6 * 3600_000) continue;
    const meta = await chatTitle(env, c);
    cfg.chatMeta[c] = meta;
    dirty = true;
  }
  if (dirty) return await saveConfig(env, cfg);
  return cfg;
}

/* ---------- add / remove (validated) ---------- */
export async function addChat(env: Env, raw: string): Promise<{ ok: boolean; chat?: string; title?: string; error?: string }> {
  const chat = normalizeChat(raw);
  if (!chat) return { ok: false, error: "bad-format" };
  const check = await checkBotAdmin(env, chat);
  if (!check.ok) {
    return { ok: false, chat, error: check.status === "error" ? "not-visible" : "bot-not-admin" };
  }
  const cfg = await getConfig(env);
  const meta = await chatTitle(env, chat);
  if (!cfg.chats.includes(chat)) cfg.chats.push(chat);
  cfg.chatMeta[chat] = meta;
  await saveConfig(env, cfg);
  return { ok: true, chat, title: meta.title };
}

export async function removeChat(env: Env, chat: string): Promise<FjConfig> {
  const cfg = await getConfig(env);
  cfg.chats = cfg.chats.filter((c) => c !== chat);
  return await saveConfig(env, cfg);
}

/* ---------- membership (cached) ---------- */
export async function isJoined(env: Env, userId: number, cfg: FjConfig): Promise<boolean> {
  const cacheKey = "fj:ok:" + userId;
  if (cfg.recheckHours > 0) {
    try {
      const raw = await env.BOT_KV.get(cacheKey);
      if (raw) {
        const c = JSON.parse(raw) as { at: number; chats: string[] };
        if (Date.now() - c.at < cfg.recheckHours * 3600_000 && JSON.stringify(c.chats) === JSON.stringify(cfg.chats)) {
          return true;
        }
      }
    } catch { /* ignore */ }
  }
  let ok = false;
  if (cfg.mode === "all") {
    ok = cfg.chats.length > 0;
    for (const ch of cfg.chats) {
      const r = await checkChat(env, userId, ch);
      if (!r.ok) { ok = false; break; }
    }
  } else {
    for (const ch of cfg.chats) {
      const r = await checkChat(env, userId, ch);
      if (r.ok) { ok = true; break; }
    }
  }
  if (ok && cfg.recheckHours > 0) {
    await env.BOT_KV.put(cacheKey, JSON.stringify({ at: Date.now(), chats: cfg.chats }), {
      expirationTtl: Math.max(60, cfg.recheckHours * 3600),
    }).catch(() => {});
  }
  return ok;
}

// cheap "is this user already known-joined?" for the panel (no API calls)
export async function isCachedJoined(env: Env, userId: number, cfg: FjConfig): Promise<boolean> {
  try {
    const raw = await env.BOT_KV.get("fj:ok:" + userId);
    if (!raw) return false;
    const c = JSON.parse(raw) as { at: number; chats: string[] };
    return JSON.stringify(c.chats) === JSON.stringify(cfg.chats);
  } catch {
    return false;
  }
}

/* ---------- analytics (all real, no fake data) ---------- */
interface StatCounters { blocked: number; verified: number }
const STATS_KEY = "fj:stats";
const LOG_KEY = "fj:log";

export interface FjEvent {
  t?: number;
  ev: "blocked" | "verified" | "chat_added" | "chat_removed" | "exempted" | "unexempted";
  uid?: number;
  chat?: string;
  extra?: string;
}

export interface FjStats {
  blocked: number;
  verified: number;
  days: { date: string; label: string; blocked: number; verified: number }[];
  log: FjEvent[];
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function getCounters(env: Env): Promise<StatCounters> {
  try {
    const raw = await env.BOT_KV.get(STATS_KEY);
    if (!raw) return { blocked: 0, verified: 0 };
    const j = JSON.parse(raw);
    return { blocked: Number(j.blocked) || 0, verified: Number(j.verified) || 0 };
  } catch {
    return { blocked: 0, verified: 0 };
  }
}

export async function recordEvent(env: Env, ev: FjEvent): Promise<void> {
  if (!ev.t) ev.t = Date.now();
  const c = await getCounters(env);
  if (ev.ev === "blocked") c.blocked++;
  else if (ev.ev === "verified") c.verified++;
  await env.BOT_KV.put(STATS_KEY, JSON.stringify(c)).catch(() => {});

  // per-day unique buckets (chart + "blocked today")
  if (ev.ev === "blocked" || ev.ev === "verified") {
    const dk = "fj:day:" + dayKey(new Date());
    try {
      const raw = await env.BOT_KV.get(dk);
      const day = raw ? JSON.parse(raw) : { blocked: [], verified: [] };
      const arr = ev.ev === "blocked" ? day.blocked : day.verified;
      if (Array.isArray(arr) && ev.uid !== undefined && !arr.includes(ev.uid)) arr.push(ev.uid);
      if (day.blocked.length > 2000) day.blocked = day.blocked.slice(-2000);
      if (day.verified.length > 2000) day.verified = day.verified.slice(-2000);
      await env.BOT_KV.put(dk, JSON.stringify(day), { expirationTtl: 32 * 86400 }).catch(() => {});
    } catch { /* ignore */ }
  }

  // rolling event log (last 100)
  try {
    const raw = await env.BOT_KV.get(LOG_KEY);
    const log: FjEvent[] = raw ? JSON.parse(raw) : [];
    log.push(ev);
    while (log.length > 100) log.shift();
    await env.BOT_KV.put(LOG_KEY, JSON.stringify(log)).catch(() => {});
  } catch { /* ignore */ }
}

const FA_DAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

export async function stats(env: Env, days = 7): Promise<FjStats> {
  const c = await getCounters(env);
  const out: FjStats = { blocked: c.blocked, verified: c.verified, days: [], log: [] };
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const dk = "fj:day:" + dayKey(d);
    let blocked = 0, verified = 0;
    try {
      const raw = await env.BOT_KV.get(dk);
      if (raw) {
        const j = JSON.parse(raw);
        blocked = (j.blocked || []).length;
        verified = (j.verified || []).length;
      }
    } catch { /* ignore */ }
    out.days.push({
      date: dk,
      label: FA_DAYS[d.getDay()],
      blocked,
      verified,
    });
  }
  try {
    const raw = await env.BOT_KV.get(LOG_KEY);
    if (raw) out.log = (JSON.parse(raw) as FjEvent[]).slice(-14).reverse();
  } catch { /* ignore */ }
  return out;
}

/* ---------- gate & prompt ---------- */
export async function gateUser(env: Env, userId: number, lang?: Lang): Promise<boolean> {
  const cfg = await getConfig(env);
  if (!cfg.enabled || !cfg.chats.length) return true; // feature off → allow
  const owner = await ownerId(env);
  if (userId === owner) return true;                 // owner always passes
  if (cfg.exempt.includes(userId)) return true;       // explicit exempt
  if (cfg.applyTo === "new" && cfg.legacy.includes(userId)) return true; // grandfathered
  const joined = await isJoined(env, userId, cfg);
  if (joined) return true;
  await sendJoinPrompt(env, userId, cfg, lang);
  return false;
}

export async function sendJoinPrompt(env: Env, userId: number, cfg: FjConfig, lang?: Lang): Promise<void> {
  const L: Lang = lang === "en" ? "en" : "fa";
  cfg = await ensureTitles(env, cfg);
  // rate-limit: don't spam the join prompt more than once per cooldown window
  const pk = "fj:prompt:" + userId;
  try {
    const last = await env.BOT_KV.get(pk);
    if (last && Date.now() - parseInt(last, 10) < cfg.promptCooldownMin * 60_000) return;
  } catch { /* ignore */ }

  const rows: tg.Btn[][] = [];
  const list: string[] = [];
  for (const c of cfg.chats) {
    const meta = cfg.chatMeta[c];
    const title = esc(meta?.title || c);
    list.push(`└ «<b>${title}</b>» ${c.startsWith("@") ? "— <code>" + esc(c) + "</code>" : ""}`);
    if (meta?.username) {
      rows.push([{ text: "🔗 " + title, url: `https://t.me/${meta.username}`, color: "primary", emoji: false }]);
    }
  }
  const text =
    `🔒 <b>${t(L, "fj_gate_title")}</b>\n\n` +
    `${cfg.message}\n\n` +
    `📌 <b>${t(L, "fj_gate_list")}:</b>\n${list.join("\n")}\n\n` +
    t(L, "fj_gate_after");
  rows.push([{ text: cfg.buttonText, cb: "fj:verify", color: "success", emoji: false }]);
  await tg.sendMessage(env, userId, text, tg.kb(rows)).catch(() => {});
  await env.BOT_KV.put(pk, String(Date.now()), { expirationTtl: Math.max(120, cfg.promptCooldownMin * 120) }).catch(() => {});
  await recordEvent(env, { ev: "blocked", uid: userId });
}

// Re-check membership on the "verify" button and answer the callback.
export async function verifyAndAnswer(
  env: Env, userId: number, cfg: FjConfig, cqId: string, lang: "fa" | "en"
): Promise<boolean> {
  const joined = await isJoined(env, userId, cfg);
  if (joined) {
    await recordEvent(env, { ev: "verified", uid: userId });
    await tg.answerCallback(env, cqId, t(lang, "fj_verify_ok"), false).catch(() => {});
    return true;
  }
  await tg.answerCallback(env, cqId, t(lang, "fj_verify_fail"), true).catch(() => {});
  return false;
}

/* ---------- auto add/remove via my_chat_member ---------- */
export async function onBotChatMember(env: Env, upd: any): Promise<void> {
  try {
    const chat = upd?.chat;
    const chatId = String(chat?.id ?? "");
    if (!chatId) return;
    const fromId: number | undefined = upd?.from?.id;
    const newStatus: string = upd?.new_chat_member?.status || "";
    const owner = await ownerId(env);

    if ((newStatus === "administrator" || newStatus === "creator") && fromId === owner) {
      const cfg = await getConfig(env);
      const meta = await chatTitle(env, chatId);
      if (!cfg.chats.includes(chatId)) cfg.chats.push(chatId);
      cfg.chatMeta[chatId] = meta;
      const firstEnable = !cfg.enabled && cfg.chats.length > 0;
      cfg.enabled = true;
      await saveConfig(env, cfg);
      await recordEvent(env, { ev: "chat_added", uid: owner, chat: chatId, extra: meta.title });
      await tg.sendMessage(
        env, owner,
        `🤖 ربات در کانال «<b>${esc(meta.title)}</b>» ادمین شد.\n` +
        `✅ خودکار به عضویت اجباری اضافه شد${firstEnable ? " و عضویت اجباری <b>فعال</b> شد" : ""}.\n` +
        `برای تنظیم دقیق (شرط any/all، پیام، معاف‌ها و آمار) به پنل برو: /panel` +
        (firstEnable ? "\n\n⛔ از حالا کاربرانی که عضو این کانال نباشند از ربات مسدود می‌شوند." : "")
      ).catch(() => {});
    } else if ((newStatus === "left" || newStatus === "kicked")) {
      const cfg = await getConfig(env);
      if (cfg.chats.includes(chatId)) {
        const title = cfg.chatMeta[chatId]?.title || chatId;
        cfg.chats = cfg.chats.filter((c) => c !== chatId);
        await saveConfig(env, cfg);
        await recordEvent(env, { ev: "chat_removed", uid: fromId, chat: chatId, extra: title });
        await tg.sendMessage(env, owner, `⚠️ ربات از کانال «<b>${esc(title)}</b>» حذف شد و از لیست عضویت اجباری برداشته شد.`).catch(() => {});
      }
    }
  } catch (e) {
    console.error("onBotChatMember error", e);
  }
}

/* ---------- owner id ---------- */
export async function ownerId(env: Env): Promise<number> {
  const raw = await env.BOT_KV.get("owner");
  if (raw) { const n = parseInt(raw, 10); if (!Number.isNaN(n)) return n; }
  return 8940829322; // product owner (default)
}

/* ---------- bot meta (username + panel origin) ---------- */
export async function botMeta(env: Env): Promise<{ username: string; origin: string }> {
  let username = (await env.BOT_KV.get("meta:username")) || "";
  if (!username) {
    try {
      const r: any = await tg.getMe(env);
      username = r?.result?.username || "NikaNetLauncher_bot";
      await env.BOT_KV.put("meta:username", username).catch(() => {});
    } catch {
      username = "NikaNetLauncher_bot";
    }
  }
  let origin = (await env.BOT_KV.get("meta:origin")) || "";
  if (!origin) origin = "https://nika-launcher.nikanetteem.workers.dev";
  return { username, origin };
}

export async function setOrigin(env: Env, origin: string): Promise<void> {
  const cur = (await env.BOT_KV.get("meta:origin")) || "";
  if (cur !== origin) await env.BOT_KV.put("meta:origin", origin).catch(() => {});
}

export const adminDeepLink = (username: string) =>
  `https://t.me/${username}?startchannel&admin=post_messages+edit_messages+delete_messages+invite_users+restrict_members+promote_members+change_info`;
