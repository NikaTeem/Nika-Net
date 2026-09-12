// Nika Net Launcher — ورود امن پنل مدیریت (بازسازی تمیز).
//
// یک سیستم ورود دو مرحله‌ای بر پایهٔ کد یک‌بارمصرف تلگرام:
//   ۱) مالک آیدی عددی‌اش را وارد می‌کند → کد ۶ رقمی به چت همان مالک در تلگرام می‌رود.
//   ۲) مالک کد را وارد می‌کند → نشست (HttpOnly cookie) ساخته می‌شود.
//
// همهٔ منطق کد/نشست اینجا متمرکز است؛ adminpanel فقط این توابع را صدا می‌زند.

import { Env } from "./types";
import * as tg from "./telegram";
import * as fj from "./forcedjoin";
import * as st from "./state";
import * as adm from "./admin";

const CODE_KEY = "panel:code:";
const CD_KEY = "panel:cd:";
const SESSION_KEY = "panel:sess:";
const PW_KEY = "panel:password:";
const PWFAIL_KEY = "panel:pwfail:";

const CODE_TTL = 300;      // ۵ دقیقه
const SESSION_TTL = 86400; // ۱ روز
const RESEND_GAP = 12_000; // ۱۲ ثانیه — فاصلهٔ بین دو ارسال واقعی کد
const SEND_ATTEMPTS = 3;   // تلاش مجدد روی محدودیت نرخ تلگرام

const PW_SALT = "nikapanel:v1:"; // ثابت هش رمز عبور
const PW_MAX_TRIES = 5;          // بعد از ۵ تلاش ناموفق، قفل موقت
const PW_LOCK_SECONDS = 600;     // ۱۰ دقیقه

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomCode(): string {
  const b = new Uint8Array(4);
  crypto.getRandomValues(b);
  const n = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
  return String(100000 + (n % 900000));
}

function sessionToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

function readCookie(cookieHeader: string): string {
  const m = (cookieHeader || "").match(/(?:^|;\s*)npanel=([a-f0-9-]+)/);
  return m ? m[1] : "";
}

const codeMessage = (code: string) =>
  `🔐 <b>کد ورود پنل مدیریت</b>\n\n<code>${code}</code>\n\nاین کد تا <b>۵ دقیقه</b> معتبر است. آن را برای کسی نفرست.`;

// اطلاعات عمومی صفحهٔ ورود — مشخص می‌کند کد به کدام اکانت تلگرام می‌رود
export async function loginInfo(env: Env): Promise<{ ownerId: number | null; name: string; username: string }> {
  const owner = await fj.ownerId(env);
  if (owner === null) return { ownerId: null, name: "", username: "" };
  let meta = await st.getMeta(env, owner);
  if (!meta.nameAt || Date.now() - meta.nameAt > 24 * 3600_000 || !meta.firstName) {
    try {
      const r: any = await tg.getChat(env, owner);
      const res = r?.result;
      if (res && res.type === "private") {
        meta.firstName = res.first_name || meta.firstName || "";
        meta.lastName = res.last_name || meta.lastName || "";
        meta.username = res.username || meta.username || "";
        meta.nameAt = Date.now();
        await st.saveMeta(env, owner, meta).catch(() => {});
      }
    } catch {
      /* keep cached meta */
    }
  }
  return {
    ownerId: owner,
    name: [meta.firstName, meta.lastName].filter(Boolean).join(" ").trim(),
    username: meta.username || "",
  };
}

export interface RequestResult {
  ok: boolean;
  sent: boolean;          // آیا همین الان ارسال واقعی انجام شد؟
  bot: string;            // یوزرنیم ربات
  ownerUsername: string;  // یوزرنیم اکانتی که کد به آن می‌رود
  error?: string;
}

// درخواست کد ورود برای مالک — idempotent (کد موجود را دوباره می‌فرستد، نه کد جدید)
export async function requestCode(env: Env, id: number): Promise<RequestResult> {
  const owner = await fj.ownerId(env);
  if (!Number.isInteger(id) || id !== owner) {
    return { ok: false, sent: false, bot: "", ownerUsername: "", error: "فقط مالک ربات می‌تواند وارد شود" };
  }
  const meta = await fj.botMeta(env);
  const om = await st.getMeta(env, id);

  // اگر کد معتبری وجود دارد، همان را می‌فرستیم (بدون ساخت کد جدید)
  let code = (await env.BOT_KV.get(CODE_KEY + id)) || "";
  if (!code) {
    code = randomCode();
    await env.BOT_KV.put(CODE_KEY + id, code, { expirationTtl: CODE_TTL });
  }

  // ضد اسپم نرم: اگر همین چند لحظه پیش فرستاده‌ایم، ارسال تکراری نمی‌کنیم
  const lastSend = parseInt((await env.BOT_KV.get(CD_KEY + id)) || "0", 10) || 0;
  if (lastSend && Date.now() - lastSend < RESEND_GAP) {
    return { ok: true, sent: false, bot: meta.username, ownerUsername: om.username || "" };
  }

  // ارسال با تلاش مجدد خودکار (محدودیت نرخ تلگرام)
  let delivered = false;
  let lastErr = "";
  for (let attempt = 0; attempt < SEND_ATTEMPTS && !delivered; attempt++) {
    try {
      const r: any = await tg.sendMessage(env, id, codeMessage(code));
      if (r?.ok) {
        delivered = true;
        break;
      }
      lastErr = r?.description || "sendMessage failed";
      const retryAfter = Number(r?.parameters?.retry_after);
      if (r?.error_code === 429 && Number.isFinite(retryAfter) && retryAfter > 0) {
        await new Promise((res) => setTimeout(res, Math.min(6, retryAfter) * 1000));
      }
    } catch (e) {
      lastErr = (e as Error)?.message || String(e);
    }
  }

  if (!delivered) {
    await env.BOT_KV.delete(CODE_KEY + id).catch(() => {});
    return {
      ok: false,
      sent: false,
      bot: meta.username,
      ownerUsername: om.username || "",
      error: "ارسال کد به تلگرام ناموفق بود" + (lastErr ? ` (${lastErr})` : "") + ". چند لحظه بعد دوباره تلاش کن.",
    };
  }

  await env.BOT_KV.put(CD_KEY + id, String(Date.now()), { expirationTtl: 60 }).catch(() => {});
  return { ok: true, sent: true, bot: meta.username, ownerUsername: om.username || "" };
}

// تأیید کد → ساخت نشست. در صورت موفقیت، توکن نشست برمی‌گرداند (نه کد).
export async function verifyCode(env: Env, id: number, code: string): Promise<string | null> {
  const owner = await fj.ownerId(env);
  if (!Number.isInteger(id) || id !== owner) return null;
  const saved = (await env.BOT_KV.get(CODE_KEY + id)) || "";
  if (!saved || String(code || "").trim() !== saved) return null;
  await env.BOT_KV.delete(CODE_KEY + id).catch(() => {});
  const token = sessionToken();
  await env.BOT_KV.put(SESSION_KEY + token, String(id), { expirationTtl: SESSION_TTL });
  return token;
}

// خواندن مالکِ نشست از کوکی درخواست
export async function sessionOwner(env: Env, cookieHeader: string): Promise<number | null> {
  const token = readCookie(cookieHeader);
  if (!token) return null;
  const raw = await env.BOT_KV.get(SESSION_KEY + token);
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

// نقش کاربرِ نشست: owner / admin / null (کد تلگرام فقط مالک؛ رمز عبور مالک + ادمین‌ها)
// دسترسی به پنل نیازمند اسکوپ `panel` است (مالک همیشه دارد).
export async function sessionRole(env: Env, cookieHeader: string): Promise<"owner" | "admin" | null> {
  const id = await sessionOwner(env, cookieHeader);
  if (id === null) return null;
  const r = await adm.role(env, id);
  if (r === "user") return null;
  if (r === "owner") return "owner";
  return (await adm.can(env, id, "panel")) ? "admin" : null;
}

// خروج: حذف نشست
export async function destroySession(env: Env, cookieHeader: string): Promise<void> {
  const token = readCookie(cookieHeader);
  if (token) await env.BOT_KV.delete(SESSION_KEY + token).catch(() => {});
}

/* ---------- ورود با رمز عبور (جایگزین کد تلگرام) ---------- */

export async function hasPassword(env: Env): Promise<boolean> {
  return !!(await env.BOT_KV.get(PW_KEY));
}

// ورود با «آیدی عددی + رمز عبور» → در موفقیت توکن نشست برمی‌گرداند
// (مالک + ادمین‌ها می‌توانند با رمز عبور وارد شوند)
export async function passwordLogin(env: Env, id: number, password: string): Promise<string | null> {
  if (!Number.isInteger(id)) return null;
  if (!(await adm.can(env, id, "panel"))) return null; // فقط مالک یا ادمینِ دارای دسترسی پنل
  const fails = parseInt((await env.BOT_KV.get(PWFAIL_KEY + id)) || "0", 10) || 0;
  if (fails >= PW_MAX_TRIES) return null; // قفل موقت
  const stored = (await env.BOT_KV.get(PW_KEY)) || "";
  if (!stored) return null;
  const hash = await sha256Hex(PW_SALT + String(password || ""));
  if (hash !== stored) {
    await env.BOT_KV.put(PWFAIL_KEY + id, String(fails + 1), { expirationTtl: PW_LOCK_SECONDS }).catch(() => {});
    return null;
  }
  await env.BOT_KV.delete(PWFAIL_KEY + id).catch(() => {});
  const token = sessionToken();
  await env.BOT_KV.put(SESSION_KEY + token, String(id), { expirationTtl: SESSION_TTL });
  return token;
}

// تغییر/تنظیم رمز عبور (فقط مالک، حداقل ۶ کاراکتر)
export async function setPassword(env: Env, id: number, password: string): Promise<boolean> {
  const owner = await fj.ownerId(env);
  if (!Number.isInteger(id) || id !== owner) return false;
  const p = String(password || "").trim();
  if (p.length < 6) return false;
  const hash = await sha256Hex(PW_SALT + p);
  await env.BOT_KV.put(PW_KEY, hash).catch(() => {});
  await env.BOT_KV.delete(PWFAIL_KEY + id).catch(() => {});
  return true;
}
