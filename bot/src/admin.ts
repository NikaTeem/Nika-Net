// Nika Net Launcher — admin & ban model (promote/demote admins + timed bans).
//
// Roles:
//   owner  → the single bot owner (KV key "owner") — full control.
//   admin  → promoted by the owner — panel access, ban/unban regular users,
//            reply to support/PM — but cannot manage other admins.
//   user   → everyone else.
//
// Storage (Cloudflare KV):
//   "admins"        → JSON array of numeric admin chat ids.
//   "ban:<chatId>"  → JSON BanRecord { chatId, by, byName, reason, at, until }.
//                     `until === 0` means permanent; otherwise epoch ms.
//
// Every mutating action also sends an in-bot Telegram notification to the
// affected user (admin added / admin removed / banned / unbanned), so the
// person always learns about it inside the bot.

import { Env } from "./types";
import * as fj from "./forcedjoin";
import * as st from "./state";
import * as tg from "./telegram";

const ADMINS_KEY = "admins";
const BAN_PREFIX = "ban:";

export type Role = "owner" | "admin" | "user";

export interface BanRecord {
  chatId: number;
  by: number;          // who performed the ban
  byName?: string;     // display name of the performer
  reason: string;      // mandatory reason
  at: number;          // epoch ms when banned
  until: number;       // 0 = permanent, else epoch ms
}

/* ---------------- ownership / roles ---------------- */

export async function isOwner(env: Env, chatId: number): Promise<boolean> {
  return (await fj.ownerId(env)) === chatId;
}

export async function listAdmins(env: Env): Promise<number[]> {
  const raw = await env.BOT_KV.get(ADMINS_KEY);
  if (!raw) return [];
  try {
    const a = JSON.parse(raw);
    return Array.isArray(a) ? a.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  } catch {
    return [];
  }
}

export async function isAdmin(env: Env, chatId: number): Promise<boolean> {
  if (await isOwner(env, chatId)) return true;
  return (await listAdmins(env)).includes(chatId);
}

export async function role(env: Env, chatId: number): Promise<Role> {
  if (await isOwner(env, chatId)) return "owner";
  if ((await listAdmins(env)).includes(chatId)) return "admin";
  return "user";
}

/* ---------------- admin promote / demote (owner-only) ---------------- */

export interface AdmResult { ok: boolean; error?: string; changed?: boolean }

export async function addAdmin(env: Env, chatId: number, by: number): Promise<AdmResult> {
  const owner = await fj.ownerId(env);
  if (owner === null) return { ok: false, error: "مالک ربات مشخص نیست" };
  if (by !== owner) return { ok: false, error: "فقط مالک می‌تواند ادمین اضافه کند" };
  if (chatId === owner) return { ok: false, error: "مالک از قبل بالاترین دسترسی را دارد" };
  if (!Number.isInteger(chatId) || chatId <= 0) return { ok: false, error: "آیدی عددی معتبر نیست" };
  const admins = await listAdmins(env);
  if (admins.includes(chatId)) return { ok: true, changed: false };
  admins.push(chatId);
  await env.BOT_KV.put(ADMINS_KEY, JSON.stringify(admins));
  return { ok: true, changed: true };
}

export async function removeAdmin(env: Env, chatId: number, by: number): Promise<AdmResult> {
  const owner = await fj.ownerId(env);
  if (by !== owner) return { ok: false, error: "فقط مالک می‌تواند ادمین حذف کند" };
  const admins = await listAdmins(env);
  if (!admins.includes(chatId)) return { ok: true, changed: false };
  await env.BOT_KV.put(ADMINS_KEY, JSON.stringify(admins.filter((id) => id !== chatId)));
  return { ok: true, changed: true };
}

/* ---------------- bans ---------------- */

export async function getBan(env: Env, chatId: number): Promise<BanRecord | null> {
  const raw = await env.BOT_KV.get(BAN_PREFIX + chatId);
  if (!raw) return null;
  try {
    const b = JSON.parse(raw) as BanRecord;
    if (b.until && b.until < Date.now()) {
      // expired — clear lazily
      await env.BOT_KV.delete(BAN_PREFIX + chatId).catch(() => {});
      return null;
    }
    return b;
  } catch {
    return null;
  }
}

export async function isBanned(env: Env, chatId: number): Promise<boolean> {
  return (await getBan(env, chatId)) !== null;
}

// `until` is a DURATION in ms from now (0 = permanent) — the record stores the
// absolute expiry timestamp so getBan/listBans can lazily expire it.
export async function setBan(
  env: Env,
  chatId: number,
  opts: { by: number; byName?: string; reason: string; until: number }
): Promise<AdmResult> {
  const reason = String(opts.reason || "").trim();
  if (!reason) return { ok: false, error: "دلیل مسدودسازی اجباری است" };
  const actorRole = await role(env, opts.by);
  if (actorRole === "user") return { ok: false, error: "دسترسی کافی نداری" };
  const targetRole = await role(env, chatId);
  if (targetRole !== "user") return { ok: false, error: "مالک و ادمین‌ها قابل مسدودسازی نیستند" };
  if (!Number.isInteger(chatId) || chatId <= 0) return { ok: false, error: "آیدی عددی معتبر نیست" };
  const rec: BanRecord = {
    chatId,
    by: opts.by,
    byName: opts.byName,
    reason: reason.slice(0, 300),
    at: Date.now(),
    until: opts.until > 0 ? Date.now() + opts.until : 0,
  };
  await env.BOT_KV.put(BAN_PREFIX + chatId, JSON.stringify(rec));
  return { ok: true, changed: true };
}

export async function unban(env: Env, chatId: number, by: number): Promise<AdmResult> {
  const actorRole = await role(env, by);
  if (actorRole === "user") return { ok: false, error: "دسترسی کافی نداری" };
  const existed = (await getBan(env, chatId)) !== null;
  await env.BOT_KV.delete(BAN_PREFIX + chatId).catch(() => {});
  return { ok: true, changed: existed };
}

export async function listBans(env: Env): Promise<BanRecord[]> {
  const out: BanRecord[] = [];
  try {
    const listed = await env.BOT_KV.list({ prefix: BAN_PREFIX });
    for (const k of listed.keys) {
      const raw = await env.BOT_KV.get(k.name);
      if (!raw) continue;
      try {
        const b = JSON.parse(raw) as BanRecord;
        if (b.until && b.until < Date.now()) {
          await env.BOT_KV.delete(k.name).catch(() => {});
          continue;
        }
        out.push(b);
      } catch {
        /* skip malformed */
      }
    }
  } catch {
    /* ignore list errors */
  }
  out.sort((a, b) => b.at - a.at);
  return out;
}

/* ---------------- durations ---------------- */

export interface BanDuration { id: string; ms: number; fa: string; en: string }

export const BAN_DURATIONS: BanDuration[] = [
  { id: "1h",   ms: 1 * 3600_000,          fa: "۱ ساعت",   en: "1 hour" },
  { id: "6h",   ms: 6 * 3600_000,          fa: "۶ ساعت",   en: "6 hours" },
  { id: "1d",   ms: 24 * 3600_000,         fa: "۱ روز",    en: "1 day" },
  { id: "3d",   ms: 3 * 24 * 3600_000,     fa: "۳ روز",    en: "3 days" },
  { id: "7d",   ms: 7 * 24 * 3600_000,     fa: "۷ روز",    en: "7 days" },
  { id: "30d",  ms: 30 * 24 * 3600_000,    fa: "۳۰ روز",   en: "30 days" },
  { id: "perm", ms: 0,                     fa: "دائمی",    en: "Permanent" },
];

export const durationOf = (id: string): BanDuration | undefined =>
  BAN_DURATIONS.find((d) => d.id === id);

// human label of an epoch-ms `until` (0 = permanent) — Persian
export function untilLabel(until: number): string {
  if (!until) return "دائمی";
  const d = new Date(until);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ---------------- in-bot notifications ---------------- */

export async function notifyAdminAdded(env: Env, chatId: number): Promise<void> {
  await tg.sendMessage(
    env, chatId,
    "👑 <b>به‌عنوان ادمین Nika Net منصوب شدی!</b>\n\n" +
    "از این به بعد به پنل مدیریت دسترسی داری و می‌تونی به کاربران و تیکت‌های پشتیبانی رسیدگی کنی.\n\n" +
    "ممنون که کنارمونی! 💙"
  ).catch(() => {});
}

export async function notifyAdminRemoved(env: Env, chatId: number): Promise<void> {
  await tg.sendMessage(
    env, chatId,
    "🔔 <b>دسترسی ادمینِ تو در Nika Net برداشته شد.</b>\n\n" +
    "اگر فکر می‌کنی اشتباهی رخ داده، با پشتیبانی در ارتباط باش. 🙏"
  ).catch(() => {});
}

export async function notifyBanned(env: Env, chatId: number, ban: BanRecord): Promise<void> {
  const until = ban.until ? `\n📅 تا: ${untilLabel(ban.until)}` : "\n📅 مدت: دائمی";
  await tg.sendMessage(
    env, chatId,
    "🚫 <b>دسترسی تو به ربات Nika Net مسدود شد.</b>\n\n" +
    `📌 دلیل: ${ban.reason.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}` +
    until +
    "\n\nاگر فکر می‌کنی اشتباهی رخ داده، از طریق کانال رسمی با ما در تماس باش."
  ).catch(() => {});
}

export async function notifyUnbanned(env: Env, chatId: number): Promise<void> {
  await tg.sendMessage(
    env, chatId,
    "✅ <b>دسترسی تو به ربات Nika Net دوباره باز شد!</b>\n\nخوش برگشتی — هر وقت خواستی از منو شروع کن. 🎉"
  ).catch(() => {});
}

// notice a banned user receives when they try to use the bot
export async function banGateNotice(env: Env, chatId: number, ban: BanRecord): Promise<void> {
  const until = ban.until ? `\n📅 تا: ${untilLabel(ban.until)}` : "\n📅 مدت: دائمی";
  await tg.sendMessage(
    env, chatId,
    "🚫 <b>دسترسی تو به ربات مسدود است.</b>\n\n" +
    `📌 دلیل: ${ban.reason.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}` +
    until +
    "\n\nاین پیام به‌صورت خودکار ارسال می‌شود. برای اعتراض از کانال رسمی Nika Net اقدام کن."
  ).catch(() => {});
}

/* ---------------- name resolution helpers (for lists / notifications) ---------------- */

export async function userLabel(env: Env, chatId: number): Promise<string> {
  const meta = await st.getMeta(env, chatId);
  const name = [meta.firstName, meta.lastName].filter(Boolean).join(" ").trim();
  const un = meta.username ? ` (@${meta.username})` : "";
  return name ? `${name}${un}` : (un ? un.trim() : `آیدی ${chatId}`);
}
