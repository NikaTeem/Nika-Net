// Nika Net Launcher — admin & ban model (promote/demote admins + timed bans).
//
// Roles:
//   owner  → the single bot owner (KV key "owner") — full control.
//   admin  → promoted by the owner — has a SET of scopes (sections):
//            support · users · bans · broadcast · forcedjoin · panel · admins
//   user   → everyone else.
//
// Scopes (what an admin may touch):
//   support    → support tickets + private messages (web panel)
//   users      → view the bot user list (web panel)
//   bans       → ban / unban users (bot + web panel)
//   broadcast  → send broadcast messages (bot + web panel)
//   forcedjoin → manage forced-join chats (web panel)
//   panel      → log in to the web admin panel at all
//   admins     → add/remove admins and edit their scopes (super-admin)
//
// Anti-escalation: an admin WITH `admins` may manage other admins, but can
// only grant scopes they themselves hold, can never grant `admins`, and can
// never touch the owner. Only the owner can grant `admins`.
//
// Storage (Cloudflare KV):
//   "admins"      → JSON array of numeric admin chat ids (kept in sync).
//   "adm:<chatId>"→ JSON AdminRecord { scopes, by, byName, at }.
//   "ban:<chatId>"→ JSON BanRecord { chatId, by, byName, reason, at, until }.
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
const ADMIN_PREFIX = "adm:";

export type Role = "owner" | "admin" | "user";

/* ---------------- scopes ---------------- */

export type Scope = "support" | "users" | "bans" | "broadcast" | "forcedjoin" | "panel" | "admins";

export interface ScopeDef {
  id: Scope;
  emoji: string;
  fa: string;
  en: string;
  descFa: string;
  descEn: string;
}

export const SCOPES: ScopeDef[] = [
  { id: "support", emoji: "🎧", fa: "پشتیبانی", en: "Support", descFa: "پاسخ به تیکت‌ها و پیام‌های شخصی", descEn: "Reply to tickets & DMs" },
  { id: "users", emoji: "👥", fa: "کاربران", en: "Users", descFa: "مشاهدهٔ لیست کاربران ربات", descEn: "View the bot user list" },
  { id: "bans", emoji: "🚫", fa: "مسدودی‌ها", en: "Bans", descFa: "مسدود/رفع مسدودی کاربران", descEn: "Ban / unban users" },
  { id: "broadcast", emoji: "📣", fa: "پیام همگانی", en: "Broadcast", descFa: "ارسال پیام همگانی", descEn: "Send broadcasts" },
  { id: "forcedjoin", emoji: "🔒", fa: "عضویت اجباری", en: "Forced join", descFa: "مدیریت کانال/گروه‌های عضویت اجباری", descEn: "Manage forced-join chats" },
  { id: "panel", emoji: "⚙️", fa: "پنل مدیریت", en: "Web panel", descFa: "ورود به پنل مدیریت وب", descEn: "Log in to the web panel" },
  { id: "admins", emoji: "👑", fa: "مدیریت ادمین‌ها", en: "Manage admins", descFa: "افزودن/حذف ادمین و تغییر دسترسی‌ها", descEn: "Add/remove admins & edit scopes" },
];

export const scopeOf = (id: string): ScopeDef | undefined => SCOPES.find((s) => s.id === id);
export const SCOPES_BY_ID: Record<string, ScopeDef> = Object.fromEntries(SCOPES.map((s) => [s.id, s]));
export const ALL_SCOPES: Scope[] = SCOPES.map((s) => s.id);
export const FULL_ADMIN_SCOPES: Scope[] = SCOPES.filter((s) => s.id !== "admins").map((s) => s.id);

export interface PresetDef { id: string; fa: string; en: string; scopes: Scope[] }

export const PRESETS: PresetDef[] = [
  { id: "support", fa: "🎧 پشتیبان", en: "🎧 Support", scopes: ["support", "users"] },
  { id: "mod", fa: "🛡 مدیر", en: "🛡 Moderator", scopes: ["support", "users", "bans"] },
  { id: "full", fa: "👔 مدیر کامل", en: "👔 Full admin", scopes: FULL_ADMIN_SCOPES },
  { id: "super", fa: "👑 ابرادمین", en: "👑 Super admin", scopes: ALL_SCOPES },
];

export const presetOf = (id: string): PresetDef | undefined => PRESETS.find((p) => p.id === id);

interface AdminRecord { scopes: Scope[]; by: number; byName?: string; at: number }

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

/* ---------------- scopes (granular permissions) ---------------- */

async function getRecord(env: Env, chatId: number): Promise<AdminRecord | null> {
  try {
    const raw = await env.BOT_KV.get(ADMIN_PREFIX + chatId);
    if (!raw) return null;
    const r = JSON.parse(raw) as AdminRecord;
    if (!Array.isArray(r.scopes)) return null;
    return { scopes: r.scopes.filter((s) => scopeOf(s)) as Scope[], by: Number(r.by) || 0, byName: r.byName, at: Number(r.at) || 0 };
  } catch {
    return null;
  }
}

async function saveRecord(env: Env, chatId: number, rec: AdminRecord): Promise<void> {
  await env.BOT_KV.put(ADMIN_PREFIX + chatId, JSON.stringify(rec)).catch(() => {});
}

// Effective scopes of a user. Owner → everything. Admin with no explicit
// record → legacy default (everything except `admins`, preserving the old
// "full admin minus manage-admins" behaviour).
export async function scopesOf(env: Env, chatId: number): Promise<Scope[]> {
  if (await isOwner(env, chatId)) return [...ALL_SCOPES];
  if (!(await listAdmins(env)).includes(chatId)) return [];
  const rec = await getRecord(env, chatId);
  return rec ? [...rec.scopes] : [...FULL_ADMIN_SCOPES];
}

export async function can(env: Env, chatId: number, scope: Scope): Promise<boolean> {
  if (await isOwner(env, chatId)) return true;
  if (!(await listAdmins(env)).includes(chatId)) return false;
  const rec = await getRecord(env, chatId);
  const scopes = rec ? rec.scopes : FULL_ADMIN_SCOPES;
  return scopes.includes(scope);
}

// A scope a user may GRANT to others (owner can grant everything).
export async function grantableScopes(env: Env, chatId: number): Promise<Scope[]> {
  const own = await scopesOf(env, chatId);
  if (await isOwner(env, chatId)) return [...own];
  return own.filter((s) => s !== "admins"); // admins can never grant `admins`
}

export async function adminMeta(env: Env, chatId: number): Promise<{ scopes: Scope[]; by: number; byName?: string; at: number } | null> {
  if (await isOwner(env, chatId)) return null; // owner isn't an "admin"
  if (!(await listAdmins(env)).includes(chatId)) return null;
  const rec = await getRecord(env, chatId);
  return rec ? { ...rec } : { scopes: [...FULL_ADMIN_SCOPES], by: 0, at: 0 };
}

// Human labels for a scope list (for summaries & notifications).
export function scopeLabels(scopes: Scope[], lang: "fa" | "en" = "fa"): string[] {
  return scopes.map((s) => {
    const d = scopeOf(s);
    return d ? `${d.emoji} ${lang === "fa" ? d.fa : d.en}` : s;
  });
}

/* ---------------- admin promote / demote (owner or super-admin) ---------------- */

export interface AdmResult { ok: boolean; error?: string; changed?: boolean }

// Whether `actor` may manage admins at all (owner, or admin with `admins`).
async function mayManageAdmins(env: Env, actor: number): Promise<boolean> {
  return (await can(env, actor, "admins"));
}

// Validate a requested scope set against what `actor` is allowed to grant.
async function validateScopes(env: Env, actor: number, scopes: Scope[]): Promise<{ ok: boolean; error?: string; clean: Scope[] }> {
  const clean = Array.from(new Set(scopes)).filter((s) => scopeOf(s)) as Scope[];
  if (await isOwner(env, actor)) return { ok: true, clean };
  const grantable = await grantableScopes(env, actor);
  const illegal = clean.filter((s) => !grantable.includes(s));
  if (illegal.length) {
    const names = scopeLabels(illegal).join("، ");
    return { ok: false, error: `نمی‌توانی این دسترسی را بدهی: ${names}`, clean: [] };
  }
  return { ok: true, clean };
}

export async function addAdmin(env: Env, chatId: number, by: number, scopes?: Scope[]): Promise<AdmResult> {
  const owner = await fj.ownerId(env);
  if (owner === null) return { ok: false, error: "مالک ربات مشخص نیست" };
  if (!(await mayManageAdmins(env, by))) return { ok: false, error: "فقط مالک (یا ابرادمین) می‌تواند ادمین اضافه کند" };
  if (chatId === owner) return { ok: false, error: "مالک از قبل بالاترین دسترسی را دارد" };
  if (!Number.isInteger(chatId) || chatId <= 0) return { ok: false, error: "آیدی عددی معتبر نیست" };
  const final = scopes && scopes.length ? scopes : FULL_ADMIN_SCOPES;
  const v = await validateScopes(env, by, final);
  if (!v.ok) return { ok: false, error: v.error };
  const admins = await listAdmins(env);
  if (admins.includes(chatId)) {
    // already admin → update scopes instead of adding
    return await setAdminScopes(env, chatId, by, v.clean);
  }
  admins.push(chatId);
  await env.BOT_KV.put(ADMINS_KEY, JSON.stringify(admins));
  await saveRecord(env, chatId, { scopes: v.clean, by, byName: await nameOf(env, by), at: Date.now() });
  return { ok: true, changed: true };
}

export async function setAdminScopes(env: Env, chatId: number, by: number, scopes: Scope[]): Promise<AdmResult> {
  const owner = await fj.ownerId(env);
  if (owner === null) return { ok: false, error: "مالک ربات مشخص نیست" };
  if (!(await mayManageAdmins(env, by))) return { ok: false, error: "فقط مالک (یا ابرادمین) می‌تواند دسترسی‌ها را تغییر دهد" };
  if (chatId === owner) return { ok: false, error: "مالک از قبل بالاترین دسترسی را دارد" };
  if (!(await listAdmins(env)).includes(chatId)) return { ok: false, error: "این کاربر ادمین نیست" };
  const v = await validateScopes(env, by, scopes);
  if (!v.ok) return { ok: false, error: v.error };
  await saveRecord(env, chatId, { scopes: v.clean, by, byName: await nameOf(env, by), at: Date.now() });
  return { ok: true, changed: true };
}

export async function removeAdmin(env: Env, chatId: number, by: number): Promise<AdmResult> {
  const owner = await fj.ownerId(env);
  if (!(await mayManageAdmins(env, by))) return { ok: false, error: "فقط مالک (یا ابرادمین) می‌تواند ادمین حذف کند" };
  if (chatId === owner) return { ok: false, error: "مالک قابل حذف نیست" };
  const admins = await listAdmins(env);
  if (!admins.includes(chatId)) return { ok: true, changed: false };
  await env.BOT_KV.put(ADMINS_KEY, JSON.stringify(admins.filter((id) => id !== chatId)));
  await env.BOT_KV.delete(ADMIN_PREFIX + chatId).catch(() => {});
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

export async function notifyAdminAdded(env: Env, chatId: number, scopes?: Scope[]): Promise<void> {
  const list = scopes && scopes.length ? scopeLabels(scopes).map((s) => "• " + s).join("\n") : "";
  await tg.sendMessage(
    env, chatId,
    "👑 <b>به‌عنوان ادمین Nika Net منصوب شدی!</b>\n\n" +
    (list ? `🎛 <b>دسترسی‌های تو:</b>\n${list}\n\n` : "") +
    "برای ورود به پنل مدیریت، همان آیدی عددی‌ات را در صفحهٔ ورود وارد کن.\n\n" +
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

// short display name for a user (used in admin records)
export async function nameOf(env: Env, chatId: number): Promise<string> {
  const meta = await st.getMeta(env, chatId);
  const name = [meta.firstName, meta.lastName].filter(Boolean).join(" ").trim();
  return name || (meta.username ? "@" + meta.username : String(chatId));
}
