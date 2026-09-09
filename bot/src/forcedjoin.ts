// Nika Net Launcher — forced join (عضویت اجباری) engine.
//
// Users must join the configured channel(s)/group(s) before they can use the
// bot. Membership is checked via Telegram getChatMember (the bot must be an
// admin of the target chat — see the owner "make bot admin" flow). Results are
// cached in KV for `recheckHours` to keep the bot fast.

import { Env } from "./types";
import * as tg from "./telegram";

export interface FjConfig {
  enabled: boolean;
  chats: string[];       // "@username" or numeric chat id
  mode: "all" | "any";   // must join ALL chats, or ANY of them
  message: string;       // join prompt text (supports {name}, {chat})
  buttonText: string;    // verify button label
  recheckHours: number;  // 0 = always re-check; N = cache membership for N hours
  exempt: number[];      // extra exempt user ids (owner is always exempt)
}

export const FJ_DEFAULT: FjConfig = {
  enabled: false,
  chats: [],
  mode: "any",
  message: "برای استفاده از ربات، ابتدا در کانال(های) زیر عضو شو 👇",
  buttonText: "✅ عضویت انجام شد — بررسی کن",
  recheckHours: 6,
  exempt: [],
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
  };
  await env.BOT_KV.put(KEY, JSON.stringify(clean));
  return clean;
}

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

async function isJoined(env: Env, userId: number, cfg: FjConfig): Promise<boolean> {
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

/* ---------- gate & prompt ---------- */
export async function gateUser(env: Env, userId: number): Promise<boolean> {
  const cfg = await getConfig(env);
  if (!cfg.enabled || !cfg.chats.length) return true; // feature off → allow
  const owner = await ownerId(env);
  if (userId === owner) return true;                 // owner always passes
  if (cfg.exempt.includes(userId)) return true;       // explicit exempt
  const joined = await isJoined(env, userId, cfg);
  if (joined) return true;
  await sendJoinPrompt(env, userId, cfg);
  return false;
}

export async function sendJoinPrompt(env: Env, userId: number, cfg: FjConfig): Promise<void> {
  // rate-limit: don't spam the join prompt more than once a minute
  const pk = "fj:prompt:" + userId;
  try {
    const last = await env.BOT_KV.get(pk);
    if (last && Date.now() - parseInt(last, 10) < 60_000) return;
  } catch { /* ignore */ }
  const list = cfg.chats.map((c) => `<code>${c}</code>`).join("\n");
  const text = `🔒 <b>عضویت اجباری</b>\n\n${cfg.message}\n\n${list}\n\nبعد از عضویت، دکمهٔ زیر را بزن 👇`;
  const kb = tg.kb([[{ text: cfg.buttonText, cb: "fj:verify", color: "success", emoji: false }]]);
  await tg.sendMessage(env, userId, text, kb).catch(() => {});
  await env.BOT_KV.put(pk, String(Date.now()), { expirationTtl: 120 }).catch(() => {});
}

// Re-check membership on the "verify" button and answer the callback.
export async function verifyAndAnswer(
  env: Env, userId: number, cfg: FjConfig, cqId: string, lang: "fa" | "en"
): Promise<boolean> {
  const joined = await isJoined(env, userId, cfg);
  if (joined) {
    await tg.answerCallback(env, cqId, lang === "fa" ? "✅ عضویت تأیید شد — خوش آمدی!" : "✅ Verified — welcome!", false).catch(() => {});
    return true;
  }
  await tg.answerCallback(env, cqId, lang === "fa" ? "⛔ هنوز عضو نشدی! اول عضو شو بعد دوباره بزن." : "⛔ Not joined yet!", true).catch(() => {});
  return false;
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
