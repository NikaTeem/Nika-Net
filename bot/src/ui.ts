// Nika Net Launcher — "Graphite + Neon" art engine, menus & renderers.
import { Kb, ReplyKb, kb, replyKb, Btn } from "./telegram";
import { UserState, PanelRecord, TokenRecord, SkinId } from "./state";
import { t, Lang } from "./i18n";
import * as adm from "./admin";

declare const NIKA_VERSION: string;
export const VERSION = NIKA_VERSION || "0.4.0";

export const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/* ============================ art engine ✏️ ============================ */

const SPIN = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
export { SPIN };

const THEMES: Record<string, { icon: string; line: string }> = {
  main: { icon: "⚡", line: "━" },
  tokens: { icon: "🔑", line: "━" },
  panels: { icon: "🗂", line: "━" },
  users: { icon: "👥", line: "━" },
  settings: { icon: "🛠", line: "┄" },
  help: { icon: "ℹ️", line: "┄" },
  build: { icon: "🚀", line: "━" },
  danger: { icon: "⛔", line: "━" },
  ok: { icon: "✅", line: "━" },
  art: { icon: "✏️", line: "┄" },
};

function head(theme: string, title: string): string {
  const th = THEMES[theme] || THEMES.main;
  return `<b>${th.icon} ${th.line.repeat(3)} ${title} ${th.line.repeat(3)}</b>`;
}

function div(theme = "main", n = 14): string {
  return (THEMES[theme] || THEMES.main).line.repeat(n);
}

function card(title: string, lines: string[]): string {
  const out = [`┌─ ${title}`, ...lines.map((ln) => `│ ${ln}`), "└" + "─".repeat(18)];
  return out.join("\n");
}

/* ============================ skins 🎨 ============================ */
/* Ported from nika_launcher_pro.HYPER — three art languages on one engine:
   graphite (default mono ink), neon (teal pulse), paper (warm pastel).  */

interface Skin { line: string; dot: string; fill: string; empty: string; lit: string }
export const SKINS: Record<SkinId, Skin> = {
  graphite: { line: "━", dot: "●", fill: "■", empty: "□", lit: "⬢" },
  neon:     { line: "≋", dot: "◉", fill: "█", empty: "░", lit: "✦" },
  paper:    { line: "·", dot: "○", fill: "▪", empty: "▫", lit: "◆" },
};
export const SKIN_ORDER: SkinId[] = ["graphite", "neon", "paper"];

export function skin(s: UserState | null): Skin {
  return SKINS[(s?.skin as SkinId) in SKINS ? (s?.skin as SkinId) : "graphite"];
}

/* HYPER.bar() — a colored progress strip drawn with the skin's own glyphs.
   lit glyphs repeat `done`, then a single tip glyph, then `rest` empties.   */
export function bar(k: Skin, done: number, total: number, width = 10): string {
  const p = Math.max(0, Math.min(1, total > 0 ? done / total : 0));
  const filled = Math.round(p * width);
  return "▕" + k.fill.repeat(filled) + (filled < width ? k.lit : "") + k.empty.repeat(Math.max(0, width - filled - (filled < width ? 1 : 0))) + "▏";
}


export const party = (lines: string[]): string =>
  ["🎉".repeat(8), ...lines, "🎉".repeat(8)].join("\n");

export function meter(pct: number, width = 10, invert = false): string {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  const f = Math.round((p / 100) * width);
  const dot = !invert ? (p < 70 ? "🟢" : p < 90 ? "🟡" : "🔴") : (p < 70 ? "🔴" : p < 90 ? "🟡" : "🟢");
  return `${dot} ${"█".repeat(f)}${"░".repeat(width - f)} ${p}%`;
}

export function makeText(
  title: string,
  body?: string | string[] | null,
  hint?: string | null,
  crumb?: string | null,
  theme = "main"
): string {
  const parts = [head(theme, title)];
  if (crumb) parts.push(`🗺 <code>${esc(crumb)}</code>`);
  parts.push(div(theme));
  if (body) {
    parts.push(Array.isArray(body) ? body.join("\n") : body);
    parts.push(div(theme));
  }
  if (hint) parts.push(hint);
  return parts.join("\n");
}

/* ============================ date & tips 🌍 ============================ */

const FA_D = "۰۱۲۳۴۵۶۷۸۹";
const FA_M = ["", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const FA_W = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

export const fa_num = (n: number | string): string =>
  String(n).replace(/\d/g, (d) => FA_D[+d]);

function g2j(gy: number, gm: number, gd: number): [number, number, number] {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy > 1600) { jy = 979; gy -= 1600; } else { jy = 0; gy -= 621; }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + gdm[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  if (days < 186) return [jy, 1 + Math.floor(days / 31), 1 + (days % 31)];
  return [jy, 7 + Math.floor((days - 186) / 30), 1 + ((days - 186) % 30)];
}

export function todayStr(lang: Lang): string {
  const now = new Date(Date.now() + 3.5 * 3600_000); // Tehran
  if (lang === "fa") {
    const [jy, jm, jd] = g2j(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
    const wd = FA_W[(now.getUTCDay() + 1) % 7];
    const hm = `${fa_num(String(now.getUTCHours()).padStart(2, "0"))}:${fa_num(String(now.getUTCMinutes()).padStart(2, "0"))}`;
    return `${wd} ${fa_num(jd)} ${FA_M[jm]} ${fa_num(jy)} ⏰ ${hm}`;
  }
  const p = (x: number) => String(x).padStart(2, "0");
  return `${now.getUTCFullYear()}-${p(now.getUTCMonth() + 1)}-${p(now.getUTCDate())} ⏰ ${p(now.getUTCHours())}:${p(now.getUTCMinutes())} (Tehran)`;
}

export function fmtDate(ts: number, lang: Lang): string {
  try {
    if (lang === "fa") {
      const d = new Date(ts + 3.5 * 3600_000);
      const [jy, jm, jd] = g2j(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      return `${fa_num(jd)} ${FA_M[jm]} ${fa_num(jy)}`;
    }
    return new Date(ts).toISOString().slice(0, 10);
  } catch {
    return "?";
  }
}

const TIPS_FA = [
  "توکن رو از لینک مستقیم با دسترسی آماده بساز — ۳۰ ثانیه‌ست! 🔑",
  "بعد از هر آپدیت گیت‌هاب، پنل رو از «🔄 بروزرسانی» تازه کن. 📦",
  "اسم پنل کوتاه بذار؛ توی آدرس میاد و تایپش راحته. ✍️",
  "با «💚 بررسی سلامت» همه پنل‌ها رو یه‌جا پینگ کن.",
  "رمز ادمین پنل رو ذخیره کن تا هر بار نخواد. 🔐",
  "توکن قدیمی‌تر از ۳۰ روز؟ نوسازیش کن، امنیت اوله! 🛡",
  "لینک ساب رو با دکمه 📋 کپی کن، نه تایپ!",
  "قبل از دادن لینک به بقیه، یه پنل تست جدا بساز. 🧪",
];
const TIPS_EN = [
  "Create the token via direct link — 30 seconds! 🔑",
  "Refresh panels via “🔄 Update” after every GitHub update. 📦",
  "Keep panel names short — they're in the URL. ✍️",
  "Ping all panels at once with “💚 Health check”.",
  "Save the panel admin password to skip typing. 🔐",
  "Token older than 30 days? Renew it! 🛡",
  "Copy sub links with 📋, don't type them!",
  "Build a separate test panel first. 🧪",
];

export function tip(lang: Lang): string {
  const arr = lang === "fa" ? TIPS_FA : TIPS_EN;
  const now = new Date(Date.now() + 3.5 * 3600_000);
  const doy = Math.floor((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 0)) / 86400_000);
  return arr[doy % arr.length];
}

/* ============================ token link 🔑 ============================ */

export function tokenUrl(): string {
  const perms = JSON.stringify([
    { key: "workers_scripts", type: "edit" },
    { key: "workers_kv_storage", type: "edit" },
    { key: "workers_routes", type: "edit" },
    { key: "d1", type: "edit" },
    { key: "account_settings", type: "read" },
    { key: "user_details", type: "read" },
    { key: "memberships", type: "read" },
  ]);
  return (
    "https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=" +
    encodeURIComponent(perms) +
    "&accountId=*&zoneId=all&name=" +
    encodeURIComponent("Nika Net")
  );
}

/* ============================ helpers 🃏 ============================ */

const L = (s: UserState | null): Lang => (s?.lang === "en" ? "en" : "fa");

function activeTok(s: UserState): TokenRecord | undefined {
  return s.activeToken ? s.tokens[s.activeToken] : undefined;
}

export const healthDot = (p: PanelRecord): string =>
  !p.health ? "⚪" : p.health.ok ? "🟢" : "🔴";

function healthLine(p: PanelRecord): string {
  const h = p.health;
  if (!h || h.ms < 0) return "⚪ ?";
  if (!h.ok) return "🔴 down";
  return `${meter(Math.min(100, (h.ms * 100) / 1500), 8)} · ${h.ms}ms`;
}

export function subLinks(base: string, u: { uuid?: string }): { base64: string; clash: string; singbox: string } {
  const tok = (u.uuid || "").replace(/-/g, "").slice(0, 12);
  return { base64: `${base}/sub/${tok}`, clash: `${base}/sub/${tok}.yaml`, singbox: `${base}/sub/${tok}.json` };
}

function usagePct(u: { quota?: number; used?: number }): number {
  const q = Number(u.quota) || 0;
  const used = Number(u.used) || 0;
  return q > 0 ? Math.min(100, Math.round((used * 100) / q)) : 0;
}

export function stepsBar(lang: Lang, cur: number, total = 4): string {
  const labels = t(lang, "w_steps").split(",");
  const dots = "━━".repeat(0) + Array.from({ length: total }, (_, i) => (i < cur ? "●" : "○")).join("━━");
  return `${dots}\n📌 ${labels[cur - 1] || ""} (${lang === "fa" ? fa_num(cur) : cur}/${lang === "fa" ? fa_num(total) : total})`;
}

function n(s: UserState | null, v: number | string): string {
  return L(s) === "fa" ? fa_num(v) : String(v);
}

function pageRow(lang: Lang, page: number, total: number, prefix: string): Btn[] {
  const nav: Btn[] = [];
  if (page < total - 1) nav.push({ text: t(lang, "next"), cb: `${prefix}:${page + 1}`, color: "primary", emoji: false });
  nav.push({ text: `• ${lang === "fa" ? fa_num(page + 1) : page + 1}/${lang === "fa" ? fa_num(total) : total} •`, cb: "noop", color: "gray", emoji: false });
  if (page > 0) nav.push({ text: t(lang, "prev"), cb: `${prefix}:${page - 1}`, color: "primary", emoji: false });
  return nav;
}

/* ============================ reply keyboard ⌨️ ============================ */

export function replyMenu(s: UserState): ReplyKb {
  const lang = L(s);
  const supBtn = { text: lang === "fa" ? "🎧 پشتیبانی" : "🎧 Support" };
  if (lang === "fa") {
    return replyKb([[{ text: "🚀 ساخت پنل" }], [{ text: "🗂 پنل‌ها" }, { text: "🏠 منو" }], [supBtn]]);
  }
  return replyKb([[{ text: "🚀 New panel" }], [{ text: "🗂 Panels" }, { text: "🏠 Menu" }], [supBtn]]);
}

export const REPLY_LABELS: Record<string, "menu" | "panels" | "new" | "support"> = {
  "🏠 منو": "menu", "🏠 Menu": "menu",
  "🗂 پنل‌ها": "panels", "🗂 Panels": "panels",
  "🚀 ساخت پنل": "new", "🚀 New panel": "new",
  "🎧 پشتیبانی": "support", "🎧 Support": "support",
};

/* ============================ پشتیبانی 🎧 ============================ */

export interface SupportCat { id: string; fa: string; en: string }

export const SUPPORT_CATS: SupportCat[] = [
  { id: "connect", fa: "🔌 مشکل اتصال", en: "🔌 Connection issue" },
  { id: "buy", fa: "💳 خرید و اشتراک", en: "💳 Purchase & subscription" },
  { id: "account", fa: "👤 حساب و ورود", en: "👤 Account & login" },
  { id: "bug", fa: "⚙️ باگ یا خطا", en: "⚙️ Bug or error" },
  { id: "idea", fa: "💡 پیشنهاد و انتقاد", en: "💡 Suggestion & feedback" },
  { id: "other", fa: "❓ سوال عمومی", en: "❓ General question" },
];

export const catOf = (id: string): SupportCat | undefined => SUPPORT_CATS.find((c) => c.id === id);

// منوی انتخاب دستهٔ تیکت (جایگزین Mini App پشتیبانی)
export function supportMenu(s: UserState): { text: string; kb: Kb } {
  const lang = L(s);
  const title = lang === "fa" ? "پشتیبانی Nika Net" : "Nika Net Support";
  const body =
    lang === "fa"
      ? ["سلام! 👋", "", "موضوع تیکتت رو انتخاب کن تا سریع‌تر کمکت کنیم:"].join("\n")
      : ["Hi! 👋", "", "Pick a topic for your ticket so we can help faster:"].join("\n");
  const rows: Btn[][] = [];
  for (let i = 0; i < SUPPORT_CATS.length; i += 2) {
    const a = SUPPORT_CATS[i];
    const b = SUPPORT_CATS[i + 1];
    const row: Btn[] = [{ text: lang === "fa" ? a.fa : a.en, cb: `sup:cat:${a.id}`, color: "primary", emoji: false }];
    if (b) row.push({ text: lang === "fa" ? b.fa : b.en, cb: `sup:cat:${b.id}`, color: "primary", emoji: false });
    rows.push(row);
  }
  rows.push([{ text: lang === "fa" ? "🏠 بازگشت به منو" : "🏠 Back to menu", cb: "menu:main", color: "gray", emoji: false }]);
  return {
    text: makeText(title, body, lang === "fa" ? "یک گزینه را انتخاب کن" : "Pick one", lang === "fa" ? "پشتیبانی" : "Support", "help"),
    kb: kb(rows),
  };
}

// پس از انتخاب دسته — کاربر توضیحش را می‌نویسد
export function supportChosen(s: UserState, cat: SupportCat): string {
  return L(s) === "fa"
    ? `🎫 <b>دستهٔ «${esc(cat.fa)}» انتخاب شد.</b>\n\nحالا مشکل یا سؤالت رو بنویس — مستقیم به تیم پشتیبانی می‌رسه و جوابش رو همین‌جا می‌گیری. 📬`
    : `🎫 <b>Category “${esc(cat.en)}” selected.</b>\n\nNow describe your issue — it goes straight to our team and you'll get the answer right here. 📬`;
}

// تأیید ثبت تیکت — متن دقیق درخواستی مالک
export function supportAck(): string {
  return "🎫 تیکتت ثبت شد دوست من در سریع ترین زمان تیکتت جواب داده میشه";
}

// تأیید پاسخ کاربر به پیام شخصی/پشتیبانی (بعد از ارسال پیامش)
export function pmReplyAck(): string {
  return "✅ <b>پیام شما ارسال شد!</b>\n\nجوابت رو خیلی زود می‌دم؛ اگر هم ندادم، دارم روی پروژه کار می‌کنم — شرمنده 🙏";
}

// تأیید کوتاه برای پیام‌های پشت‌سرهم کاربر — تا گفتگو هیچ‌وقت «مرده» به نظر نرسد
export function followupAck(): string {
  return "✅ <b>رسید!</b>\nپیامت به همین گفتگو اضافه شد — هر وقت خواستی ادامه بده. 📬";
}

// پیام راهنما هنگام زدن دکمهٔ «پاسخ دادن» (قبل از نوشتن)
export function pmReplyPrompt(): string {
  return "✍️ جوابت رو همین‌جا بنویس، مستقیم به Nika Net می‌رسه. 📬";
}

// اعلان به مالک هنگام پیام کاربر — تیکت جدید یا پاسخ جدید
export function supportNotify(ticket: { id?: number; name?: string; username?: string; categoryLabel?: string; autoCat?: boolean }, text: string, created = true): string {
  const who = ticket.name ? `<b>${esc(ticket.name)}</b>` : "کاربر ناشناس";
  const un = ticket.username ? ` (@${esc(ticket.username)})` : "";
  const tid = ticket.id ? ` · #${ticket.id}` : "";
  const cat = ticket.categoryLabel
    ? ` · 🏷 ${esc(ticket.categoryLabel)}${ticket.autoCat ? " <i>(هوشمند)</i>" : ""}`
    : "";
  const snippet = esc(text.slice(0, 140));
  const head = created ? "🎫 <b>تیکت جدید پشتیبانی</b>" : "💬 <b>پاسخ جدید کاربر</b>";
  const hint = created
    ? "برای پاسخ، پنل مدیریت → بخش «پشتیبانی» را باز کن."
    : "برای جواب دادن، پنل مدیریت → «پشتیبانی» یا «پیام شخصی» را باز کن.";
  return `${head}\n\n👤 ${who}${un}${tid}${cat}\n💬 ${snippet}\n\n${hint}`;
}

// پاکت «پیام شخصی» مالک → کاربر: هدر حریم خصوصی + متن + راهنمای پاسخ
export function pmEnvelope(escapedText: string): string {
  return [
    "🔒 <b>پیام خصوصی از Nika Net</b>",
    "این پیام خصوصی است و خودِ Nika Net به شما پیام داده.",
    "نگران نباشید — هیچ‌کس قرار نیست چت ما را ببیند.",
    "",
    "──────────────",
    escapedText,
    "──────────────",
    "↩️ برای پاسخ، دکمهٔ «پاسخ دادن» را بزن یا همین‌جا بنویس.",
  ].join("\n");
}

// پاکت پاسخ پشتیبانی → کاربر: هدر رسمی پشتیبانی + متن + راهنمای ادامهٔ گفتگو
export function supportEnvelope(escapedText: string): string {
  return [
    "🎧 <b>پشتیبانی Nika Net</b>",
    "این پاسخ رسمی تیم پشتیبانی به تیکت شماست.",
    "",
    "──────────────",
    escapedText,
    "──────────────",
    "↩️ برای ادامهٔ گفتگو، دکمهٔ «پاسخ دادن» را بزن یا همین‌جا بنویس.",
  ].join("\n");
}

// پیام «بسته شدن تیکت» به کاربر — با دلیل و یادداشت (در صورت وجود)
export function supportCloseNotice(t: { id: number; categoryLabel?: string; closeReason?: string }, note?: string): string {
  const cat = t.categoryLabel ? ` · ${esc(t.categoryLabel)}` : "";
  const reason = closeReasonLabelFa(t.closeReason);
  const noteLine = note ? `\n💬 یادداشت پشتیبانی: ${esc(note)}` : "";
  return [
    "🔒 <b>تیکت شما بسته شد</b>",
    "",
    `👤 تیکت #${t.id}${cat}`,
    `📌 وضعیت: ${reason}${noteLine}`,
    "",
    "──────────────",
    "اگر مشکل هنوز ادامه داره، همین‌جا پیام بده — تیکتت دوباره باز می‌شه. 🌱",
  ].join("\n");
}

// پیام «باز شدن دوبارهٔ تیکت» به کاربر
export function supportReopenNotice(t: { id: number }): string {
  return [
    "✅ <b>تیکت شما دوباره باز شد</b>",
    "",
    `👤 تیکت #${t.id}`,
    "تیم پشتیبانی دوباره در حال بررسی مشکل شماست. 🙏",
  ].join("\n");
}

// راهنمای پاسخ هنگام زدن دکمهٔ «پاسخ دادن» روی پاسخ پشتیبانی
export function supportReplyPrompt(): string {
  return "✍️ جوابت رو همین‌جا بنویس — مستقیم به تیکت پشتیبانی اضافه می‌شه. 📬";
}

// سؤال امتیاز بعد از بسته شدن تیکت
export function ratingQuestion(t: { id: number }): { text: string; kb: Kb } {
  return {
    text: [
      "⭐ <b>تجربه‌ات چطور بود؟</b>",
      "",
      `به تیکت #${t.id} از ۱ تا ۵ ستاره بده تا بتونیم بهتر شیم:`,
    ].join("\n"),
    kb: kb([[
      { text: "⭐", cb: `sup:rate:${t.id}:1`, color: null, emoji: false },
      { text: "⭐⭐", cb: `sup:rate:${t.id}:2`, color: null, emoji: false },
      { text: "⭐⭐⭐", cb: `sup:rate:${t.id}:3`, color: null, emoji: false },
      { text: "⭐⭐⭐⭐", cb: `sup:rate:${t.id}:4`, color: null, emoji: false },
      { text: "⭐⭐⭐⭐⭐", cb: `sup:rate:${t.id}:5`, color: null, emoji: false },
    ]]),
  };
}

export function ratingThanks(rating: number): string {
  return `⭐ ممنون از امتیازت (${"⭐".repeat(rating)}) — نظرت برامون مهمه! 💙`;
}

// برچسب فارسی دلیل بستن (برای استفاده در پیام‌ها، بدون وابستگی به support.ts)
function closeReasonLabelFa(id?: string): string {
  const map: Record<string, string> = {
    solved: "✅ حل شد",
    duplicate: "🔁 تکراری",
    spam: "🤖 اسپم",
    noreply: "⏳ کاربر بی‌پاسخ",
    other: "🔕 سایر",
    close_all: "✅ بسته شد",
  };
  return map[id || ""] || "✅ بسته شد";
}

/* ============================ main menu ⚡ ============================ */

export function mainMenu(s: UserState, firstName?: string, isOwner = false, isAdminFlag = false): { text: string; kb: Kb } {
  const lang = L(s);
  const name = firstName ? esc(firstName) : "دوست";
  const at = activeTok(s);
  const atv = at ? `${esc(at.name)} (…${esc(at.tail)})` : t(lang, "tok_none");
  const c = s.cfg || {};
  const hello = typeof c.hello === "string" && c.hello.trim() ? (c.hello as string).trim() : t(lang, "main_hello", { name: `<b>${name}</b>` });
  const dash = card(`📊 ${hello}`, [
    `${t(lang, "main_tok")}: <b>${atv}</b>`,
    `${t(lang, "main_panels")}: <b>${n(s, s.panels.length)}</b>`,
    `${t(lang, "main_ver")}: <b><code>${VERSION}</code></b>`,
    `${t(lang, "main_today")}: ${todayStr(lang)}`,
  ]);
  const customTip = typeof c.tip === "string" && c.tip.trim() ? (c.tip as string).trim() : tip(lang);
  const desc = typeof c.desc === "string" && c.desc.trim() ? (c.desc as string).trim() : t(lang, "main_desc");
  const body = [desc, "", dash, "", card(`${t(lang, "main_tip")} 💡`, [customTip])].join("\n");
  const rows: Btn[][] = [
    [{ text: t(lang, "b_new"), cb: "do:build", color: "success", emoji: false }],
    [
      { text: t(lang, "b_panels"), cb: "panels:0", color: "primary", emoji: false },
      { text: t(lang, "b_tokens"), cb: "menu:tokens", color: "primary", emoji: false },
    ],
    [
      { text: t(lang, "b_users"), cb: "do:users", color: "success", emoji: false },
      { text: t(lang, "b_settings"), cb: "menu:settings", color: "gray", emoji: false },
    ],
    [{ text: t(lang, "upd_all"), cb: "upd:all", color: "primary", emoji: false }],
    [
      { text: t(lang, "tools_btn"), cb: "menu:tools", color: "primary", emoji: false },
      { text: t(lang, "road_btn"), cb: "menu:road", color: "gray", emoji: false },
    ],
    [
      { text: t(lang, "b_help"), cb: "menu:help", color: "gray", emoji: false },
      { text: lang === "fa" ? "🎧 پشتیبانی" : "🎧 Support", cb: "menu:support", color: "primary", emoji: false },
    ],
  ];
  // مالک فقط — مدیریت بات (عضویت اجباری + ادمین کردن در کانال)
  if (isOwner) {
    rows.push([{ text: t(lang, "o_menu"), cb: "menu:owner", color: "danger", emoji: false }]);
  } else if (isAdminFlag) {
    // ادمین (غیرمالک) — مدیریت ادمین‌ها و مسدودی‌ها
    rows.push([{ text: t(lang, "a_menu"), cb: "menu:adm", color: "danger", emoji: false }]);
  }
  return { text: makeText(t(lang, "main_title"), body, t(lang, "choose"), t(lang, "main_crumb"), "main"), kb: kb(rows) };
}

/* ============================ tokens 🔑 ============================ */

export function tokensMenu(s: UserState): { text: string; kb: Kb } {
  const lang = L(s);
  if (Object.keys(s.tokens).length === 0) {
    return {
      text: makeText(t(lang, "tok_title"), t(lang, "tok_empty"), t(lang, "choose"), t(lang, "tok_crumb"), "tokens"),
      kb: kb([
        [{ text: t(lang, "tok_add"), cb: "tok:add", color: "success", emoji: false }],
        [{ text: t(lang, "tok_link"), url: tokenUrl(), color: "primary", emoji: false }],
        [{ text: t(lang, "back"), cb: "menu:main", color: "gray", emoji: false }],
      ]),
    };
  }
  const cards: string[] = [];
  for (const [tid, tk] of Object.entries(s.tokens)) {
    const on = tid === s.activeToken;
    const age = Math.floor((Date.now() - tk.created) / 86400_000);
    const lines = [`${t(lang, "tok_age")}: ${n(s, age)}d`, meter(Math.min(100, (age * 100) / 90), 8)];
    if (on) lines.push(t(lang, "tok_active"));
    if (age >= 30) lines.push(t(lang, "tok_old"));
    cards.push(card(`${on ? "✅" : "🔑"} ${esc(tk.name)} (…${esc(tk.tail)})`, lines));
  }
  cards.push(t(lang, "tok_hint"));
  const rows: Btn[][] = [];
  for (const [tid, tk] of Object.entries(s.tokens)) {
    const on = tid === s.activeToken;
    rows.push([
      { text: `${on ? "✅ " : ""}${esc(tk.name)}`, cb: `tok:use:${tid}`, color: on ? "success" : "gray", emoji: false },
      { text: "❌", cb: `tok:del:${tid}`, color: "danger", emoji: false },
    ]);
  }
  rows.push([{ text: t(lang, "tok_add"), cb: "tok:add", color: "success", emoji: false }]);
  rows.push([{ text: t(lang, "tok_link"), url: tokenUrl(), color: "primary", emoji: false }]);
  rows.push([{ text: t(lang, "back"), cb: "menu:main", color: "gray", emoji: false }]);
  return { text: makeText(t(lang, "tok_title"), cards.join("\n\n"), t(lang, "choose"), t(lang, "tok_crumb"), "tokens"), kb: kb(rows) };
}

/* ============================ settings ⚙️ ============================ */

export function settingsMenu(s: UserState): { text: string; kb: Kb } {
  const lang = L(s);
  const cur = (s.skin as SkinId) in SKINS ? (s.skin as SkinId) : "graphite";
  const body = [
    card(`📦 ${t(lang, "set_bundle")}`, [`<code>${VERSION}</code>`]),
    "",
    card(`🎨 ${t(lang, "set_skin")}`, [`${SKINS[cur].lit} ${t(lang, "skin_" + cur)}`]),
    "",
    card("📊 Stats", [t(lang, "set_stats", { tok: n(s, Object.keys(s.tokens).length), pan: n(s, s.panels.length), b: n(s, s.builds) })]),
  ].join("\n");
  const rows: Btn[][] = [
    [{ text: t(lang, "set_lang"), cb: "do:lang", color: "primary", emoji: false }],
    [{ text: t(lang, "set_skin"), cb: "do:skin", color: "success", emoji: false }],
    [{ text: t(lang, "set_bundle_get"), cb: "do:getbundle", color: "gray", emoji: false }],
    [{ text: t(lang, "tools_btn"), cb: "menu:tools", color: "primary", emoji: false }],
    [
      { text: t(lang, "txt_btn"), cb: "menu:texts", color: "gray", emoji: false },
      { text: t(lang, "promo_btn"), cb: "menu:promo", color: "gray", emoji: false },
    ],
    [{ text: t(lang, "pin_btn"), cb: "menu:pin", color: "danger", emoji: false }],
    [{ text: t(lang, "back"), cb: "menu:main", color: "gray", emoji: false }],
  ];
  return { text: makeText(t(lang, "set_title"), body, t(lang, "choose"), t(lang, "set_crumb"), "settings"), kb: kb(rows) };
}

export function skinsMenu(s: UserState): { text: string; kb: Kb } {
  const lang = L(s);
  const k = skin(s);
  const cur = (s.skin as SkinId) in SKINS ? (s.skin as SkinId) : "graphite";
  const demos: [SkinId, number][] = [["graphite", 7], ["neon", 5], ["paper", 8]];
  const preview = demos
    .map(([id, done]) => {
      const kk = SKINS[id];
      const mark = id === cur ? kk.lit : kk.dot;
      return `<code>${mark} ${t(lang, "skin_" + id)}\n  ${bar(kk, done, 10, 10)}</code>`;
    })
    .join("\n");
  const body = [
    card(`${k.lit} ${t(lang, "set_skin")} · ${t(lang, "skin_" + cur)}`, [preview]),
  ].join("\n");
  const rows: Btn[][] = [
    [{ text: t(lang, "skin_graphite"), cb: "skin:graphite", color: cur === "graphite" ? "primary" : "gray", emoji: false },
     { text: t(lang, "skin_neon"), cb: "skin:neon", color: cur === "neon" ? "success" : "gray", emoji: false }],
    [{ text: t(lang, "skin_paper"), cb: "skin:paper", color: cur === "paper" ? "danger" : "gray", emoji: false },
     { text: t(lang, "back"), cb: "menu:settings", color: "gray", emoji: false }],
  ];
  return { text: makeText(t(lang, "skin_pick"), body, t(lang, "choose"), t(lang, "set_crumb"), "settings"), kb: kb(rows) };
}

/* ============================ help ℹ️ ============================ */

export function helpMenu(s: UserState): { text: string; kb: Kb } {
  const lang = L(s);
  return {
    text: makeText(t(lang, "h_title"), t(lang, "h_body"), t(lang, "choose"), t(lang, "h_crumb"), "help"),
    kb: kb([[{ text: t(lang, "back"), cb: "menu:main", color: "gray", emoji: false }]]),
  };
}

/* ============================ owner 🛡 (مالک فقط) ============================ */

export interface BotMeta { username: string; origin: string }
export interface FjView {
  enabled: boolean; chats: string[]; mode: string; recheckHours: number; exempt: number[];
  chatMeta?: Record<string, { title?: string }>;
  applyTo?: "all" | "new"; legacy?: number[];
}

export function ownerMenu(s: UserState, meta: BotMeta): { text: string; kb: Kb } {
  const lang = L(s);
  const body = [
    t(lang, "o_desc"),
    "",
    card("🔒 " + t(lang, "o_fj"), [t(lang, "o_fj_d")]),
    "",
    card("🔗 " + t(lang, "o_admin"), [t(lang, "o_admin_d")]),
  ].join("\n");
  const rows: Btn[][] = [
    [{
      text: t(lang, "o_admin_btn"),
      url: `https://t.me/${meta.username}?startchannel&admin=post_messages+edit_messages+delete_messages+invite_users+restrict_members+promote_members+change_info`,
      color: "primary", emoji: false,
    }],
    [{ text: t(lang, "fj_group_t"), cb: "fj:group", color: "success", emoji: false }],
    [{ text: t(lang, "o_fj_set"), cb: "fj:setchat", color: "success", emoji: false }],
    [{ text: t(lang, "o_fj_status"), cb: "fj:status", color: "gray", emoji: false }],
    [{ text: lang === "fa" ? "👑 مدیریت ادمین‌ها و مسدودی‌ها" : "👑 Admins & bans", cb: "menu:adm", color: "danger", emoji: false }],
    [{ text: t(lang, "o_panel"), url: `${meta.origin}/panel`, color: "primary", emoji: false }],
    [{ text: t(lang, "back"), cb: "menu:main", color: "gray", emoji: false }],
  ];
  return { text: makeText(t(lang, "o_title"), body, t(lang, "choose"), t(lang, "o_crumb"), "owner"), kb: kb(rows) };
}

/* ============================ مدیریت ادمین‌ها و مسدودی‌ها 👑🚫 ============================ */

export function adminMenu(
  s: UserState,
  meta: BotMeta,
  isOwnerFlag: boolean,
  scopes: string[],
  adminsCount: number,
  bansCount: number
): { text: string; kb: Kb } {
  const lang = L(s);
  const has = (sc: string) => isOwnerFlag || scopes.includes(sc);
  const cards: string[] = [];
  if (has("admins")) {
    cards.push(card("👥 " + (lang === "fa" ? "ادمین‌ها" : "Admins"),
      [lang === "fa" ? `تعداد: ${fa_num(adminsCount)} نفر` : `Count: ${adminsCount}`]));
  }
  if (has("bans")) {
    cards.push(card("🚫 " + (lang === "fa" ? "مسدودی‌ها" : "Bans"),
      [lang === "fa" ? `تعداد: ${fa_num(bansCount)} مسدود فعال` : `Count: ${bansCount} active`]));
  }
  if (cards.length) cards.push("");
  cards.push(
    lang === "fa"
      ? "🎛 <b>دسترسی‌های تو:</b> " + (scopes.length ? scopeChips(s, scopes) : "—")
      : "🎛 <b>Your permissions:</b> " + (scopes.length ? scopeChips(s, scopes) : "—")
  );
  const rows: Btn[][] = [];
  if (has("admins")) {
    rows.push([{ text: lang === "fa" ? "👑 افزودن ادمین" : "👑 Add admin", cb: "adm:add", color: "success", emoji: false }]);
    rows.push([{ text: lang === "fa" ? "👥 لیست ادمین‌ها" : "👥 Admin list", cb: "adm:list", color: "primary", emoji: false }]);
  }
  if (has("bans")) {
    rows.push([{ text: lang === "fa" ? "🚫 مسدود کردن کاربر" : "🚫 Ban user", cb: "ban:new", color: "danger", emoji: false }]);
    rows.push([{ text: lang === "fa" ? "📋 مسدودهای فعال" : "📋 Active bans", cb: "ban:list", color: "gray", emoji: false }]);
  }
  if (has("panel")) {
    rows.push([{ text: lang === "fa" ? "⚙️ پنل مدیریت (وب)" : "⚙️ Admin panel (web)", url: `${meta.origin}/panel`, color: "primary", emoji: false }]);
  }
  rows.push([{ text: lang === "fa" ? "🔙 بازگشت" : "🔙 Back", cb: isOwnerFlag ? "menu:owner" : "menu:main", color: "gray", emoji: false }]);
  return { text: makeText(lang === "fa" ? "مدیریت ربات" : "Bot admin", cards.join("\n"), t(lang, "choose"), lang === "fa" ? "مدیریت" : "Admin", "danger"), kb: kb(rows) };
}

// chips of the user's own scopes, e.g. "🎧 پشتیبانی · 🚫 مسدودی‌ها"
function scopeChips(s: UserState, scopes: string[]): string {
  const lang = L(s);
  return scopes.length
    ? scopes.map((sc) => {
        const d = adm.SCOPES_BY_ID[sc];
        return d ? `${d.emoji} ${lang === "fa" ? d.fa : d.en}` : sc;
      }).join(" · ")
    : (lang === "fa" ? "هیچ" : "none");
}

export function scopePicker(
  s: UserState,
  opts: { name: string; scopes: string[]; isNew: boolean; grantable?: string[] }
): { text: string; kb: Kb } {
  const lang = L(s);
  const on = new Set(opts.scopes);
  const grantable = opts.grantable ? new Set(opts.grantable) : null;
  const summary = opts.scopes.length
    ? opts.scopes.map((sc) => {
        const d = adm.SCOPES_BY_ID[sc];
        return d ? `${d.emoji} ${lang === "fa" ? d.fa : d.en}` : sc;
      }).join(" · ")
    : (lang === "fa" ? "هیچ دسترسی — فقط عنوان ادمین" : "no permissions — title only");
  const body = [
    (lang === "fa"
      ? `👤 ادمین: <b>${esc(opts.name)}</b>\n\n🎛 هر بخش را بزن تا روشن/خاموش شود:`
      : `👤 Admin: <b>${esc(opts.name)}</b>\n\n🎛 Tap each section to toggle it:`),
    "",
    card("🧩 " + (lang === "fa" ? "پریست‌های آماده" : "Presets"),
      [lang === "fa" ? "با یک لمس یک نقش کامل اعمال کن:" : "Apply a whole role with one tap:"]),
    "",
    card("📦 " + (lang === "fa" ? "خلاصهٔ دسترسی‌ها" : "Summary"), [summary]),
  ].join("\n");

  const rows: Btn[][] = [];
  const presetBtns: Btn[] = [];
  for (const p of adm.PRESETS) {
    if (grantable && p.scopes.some((sc) => !grantable.has(sc))) continue; // preset grants more than allowed
    presetBtns.push({ text: lang === "fa" ? p.fa : p.en, cb: `ar:preset:${p.id}`, color: "gray", emoji: false });
    if (presetBtns.length === 2) { rows.push(presetBtns.splice(0, 2)); }
  }
  if (presetBtns.length) rows.push(presetBtns);

  const toggleBtns: Btn[] = [];
  for (const sc of adm.SCOPES) {
    if (grantable && !grantable.has(sc.id)) continue; // can't grant this scope
    const checked = on.has(sc.id);
    toggleBtns.push({
      text: `${checked ? "✅" : "⬜"} ${sc.emoji} ${lang === "fa" ? sc.fa : sc.en}`,
      cb: `ar:toggle:${sc.id}`,
      color: checked ? "success" : "gray",
      emoji: false,
    });
    if (toggleBtns.length === 2) { rows.push(toggleBtns.splice(0, 2)); }
  }
  if (toggleBtns.length) rows.push(toggleBtns);

  rows.push([
    { text: opts.isNew
      ? (lang === "fa" ? "✅ تأیید و افزودن ادمین" : "✅ Confirm & add admin")
      : (lang === "fa" ? "✅ ذخیرهٔ تغییرات" : "✅ Save changes"),
      cb: "ar:confirm", color: "success", emoji: false },
    { text: lang === "fa" ? "❌ انصراف" : "❌ Cancel", cb: "ar:cancel", color: "danger", emoji: false },
  ]);
  return {
    text: makeText(lang === "fa" ? "تعیین دسترسی ادمین" : "Set admin permissions", body, t(lang, "choose"), lang === "fa" ? "مدیریت" : "Admin", "danger"),
    kb: kb(rows),
  };
}

export const adminAskId = (s: UserState): string =>
  L(s) === "fa"
    ? "👑 <b>افزودن ادمین</b>\n\nپیام کاربر موردنظر را <b>فوروارد</b> کن، یا آیدی عددی‌اش را همین‌جا بفرست.\n\nبعد از آن می‌توانی دقیقاً تعیین کنی به کدام بخش‌های ربات دسترسی داشته باشد."
    : "👑 <b>Add admin</b>\n\nForward a message from the target user, or send their numeric ID here.\n\nThen you pick exactly which sections they can access.";

export const banAskId = (s: UserState): string =>
  L(s) === "fa"
    ? "🚫 <b>مسدود کردن کاربر</b>\n\nپیام کاربر را <b>فوروارد</b> کن، یا آیدی عددی‌اش را بفرست.\n\nبعد از آن مدت و دلیل را می‌پرسم."
    : "🚫 <b>Ban user</b>\n\nForward a message from the user, or send their numeric ID.\n\nI'll then ask for the duration and reason.";

export const banAskDuration = (s: UserState, who: string): { text: string; kb: Kb } => {
  const lang = L(s);
  const rows: Btn[][] = [];
  for (let i = 0; i < adm.BAN_DURATIONS.length; i += 2) {
    const a = adm.BAN_DURATIONS[i];
    const b = adm.BAN_DURATIONS[i + 1];
    const row: Btn[] = [{ text: lang === "fa" ? a.fa : a.en, cb: `ban:dur:${a.id}`, color: "danger", emoji: false }];
    if (b) row.push({ text: lang === "fa" ? b.fa : b.en, cb: `ban:dur:${b.id}`, color: "danger", emoji: false });
    rows.push(row);
  }
  rows.push([{ text: lang === "fa" ? "🔙 انصراف" : "🔙 Cancel", cb: "menu:adm", color: "gray", emoji: false }]);
  return {
    text: makeText(
      lang === "fa" ? "مسدودسازی" : "Ban",
      (lang === "fa" ? "👤 کاربر: " : "👤 User: ") + `<b>${esc(who)}</b>\n\n` +
        (lang === "fa" ? "مدت مسدودی را انتخاب کن:" : "Pick the ban duration:"),
      null, lang === "fa" ? "مدیریت" : "Admin", "danger"
    ),
    kb: kb(rows),
  };
};

export const banAskReason = (s: UserState, who: string, durationLabel: string): string =>
  L(s) === "fa"
    ? `🚫 <b>مسدود کردن «${esc(who)}»</b>\n📅 مدت: ${esc(durationLabel)}\n\n<b>دلیل مسدودسازی را بنویس (اجباری):</b>`
    : `🚫 <b>Ban “${esc(who)}”</b>\n📅 Duration: ${esc(durationLabel)}\n\n<b>Write the reason (required):</b>`;

export const banDone = (s: UserState, who: string, durationLabel: string): string =>
  L(s) === "fa"
    ? `✅ <b>«${esc(who)}» مسدود شد.</b>\n📅 مدت: ${esc(durationLabel)}\n\nداخل ربات به خودش اطلاع داده شد.`
    : `✅ <b>“${esc(who)}” banned.</b>\n📅 Duration: ${esc(durationLabel)}\n\nThey were notified inside the bot.`;

export const unbanDone = (s: UserState, who: string): string =>
  L(s) === "fa"
    ? `✅ <b>مسدودی «${esc(who)}» برداشته شد.</b>\nداخل ربات به خودش اطلاع داده شد.`
    : `✅ <b>“${esc(who)}” unbanned.</b>\nThey were notified inside the bot.`;

export const adminAdded = (s: UserState, who: string): string =>
  L(s) === "fa"
    ? `👑 <b>«${esc(who)}» به‌عنوان ادمین اضافه شد.</b>\nداخل ربات به خودش اطلاع داده شد.`
    : `👑 <b>“${esc(who)}” is now an admin.</b>\nThey were notified inside the bot.`;

export const adminRemoved = (s: UserState, who: string): string =>
  L(s) === "fa"
    ? `🔔 <b>دسترسی ادمینِ «${esc(who)}» برداشته شد.</b>\nداخل ربات به خودش اطلاع داده شد.`
    : `🔔 <b>“${esc(who)}” was removed from admins.</b>\nThey were notified inside the bot.`;

export const admAlready = (s: UserState, who: string): string =>
  L(s) === "fa"
    ? `ℹ️ «${esc(who)}» از قبل ادمین است.`
    : `ℹ️ “${esc(who)}” is already an admin.`;

export function adminList(
  s: UserState,
  admins: Array<{ id: number; label: string; scopes: string[] }>,
  canEdit: boolean
): { text: string; kb: Kb } {
  const lang = L(s);
  const body = admins.length
    ? admins.map((a, i) =>
        `${lang === "fa" ? fa_num(i + 1) : i + 1}) <b>${esc(a.label)}</b> · <code>${a.id}</code>\n   🎛 ${scopeChips(s, a.scopes)}`
      ).join("\n\n")
    : (lang === "fa" ? "هنوز ادمینی اضافه نشده." : "No admins yet.");
  const rows: Btn[][] = [];
  for (const a of admins) {
    const row: Btn[] = [];
    if (canEdit) {
      row.push({ text: lang === "fa" ? "⚙️ دسترسی‌ها" : "⚙️ Permissions", cb: `ar:edit:${a.id}`, color: "primary", emoji: false });
      row.push({ text: "🔔", cb: `adm:del:${a.id}`, color: "danger", emoji: false });
    }
    if (row.length) rows.push(row);
  }
  rows.push([{ text: lang === "fa" ? "🔙 بازگشت" : "🔙 Back", cb: "menu:adm", color: "gray", emoji: false }]);
  return {
    text: makeText(lang === "fa" ? "لیست ادمین‌ها" : "Admin list", body, t(lang, "choose"), lang === "fa" ? "مدیریت" : "Admin", "danger"),
    kb: kb(rows),
  };
}

export const adminScopesSaved = (s: UserState, who: string, scopes: string[]): string => {
  const lang = L(s);
  const chips = scopes.length ? scopeChips(s, scopes) : (lang === "fa" ? "هیچ" : "none");
  return lang === "fa"
    ? `✅ <b>دسترسی‌های «${esc(who)}» ذخیره شد.</b>\n🎛 ${chips}`
    : `✅ <b>“${esc(who)}” permissions saved.</b>\n🎛 ${chips}`;
};

export const adminScopesCanceled = (s: UserState): string =>
  L(s) === "fa" ? "↩️ انجام نشد — تغییری اعمال نشد." : "↩️ Canceled — nothing changed.";

export function banList(
  s: UserState,
  bans: Array<{ id: number; label: string; reason: string; until: string }>
): { text: string; kb: Kb } {
  const lang = L(s);
  const body = bans.length
    ? bans.map((b, i) =>
        `${lang === "fa" ? fa_num(i + 1) : i + 1}) <b>${esc(b.label)}</b> · <code>${b.id}</code>\n   📌 ${esc(b.reason)}\n   📅 ${esc(b.until)}`
      ).join("\n\n")
    : (lang === "fa" ? "هیچ مسدود فعالی وجود ندارد." : "No active bans.");
  const rows: Btn[][] = [];
  for (const b of bans) {
    rows.push([{ text: (lang === "fa" ? "✅ رفع مسدودی " : "✅ Unban ") + esc(b.label), cb: `ban:unban:${b.id}`, color: "success", emoji: false }]);
  }
  rows.push([{ text: lang === "fa" ? "🔙 بازگشت" : "🔙 Back", cb: "menu:adm", color: "gray", emoji: false }]);
  return {
    text: makeText(lang === "fa" ? "مسدودهای فعال" : "Active bans", body, t(lang, "choose"), lang === "fa" ? "مدیریت" : "Admin", "danger"),
    kb: kb(rows),
  };
}

export const fjAskChat = (s: UserState): string => t(L(s), "fj_ask");
export const fjBadChat = (s: UserState): string => t(L(s), "fj_bad");
export const fjCantSee = (s: UserState, chat: string): string => t(L(s), "fj_cant", { c: esc(chat) });
export const fjSetOk = (s: UserState, chat: string): string => t(L(s), "fj_set_ok", { c: esc(chat) });

export function fjStatusMenu(s: UserState, cfg: FjView): { text: string; kb: Kb } {
  const lang = L(s);
  const chatsLine = cfg.chats.length
    ? cfg.chats.map((c) => "• " + (cfg.chatMeta?.[c]?.title ? esc(cfg.chatMeta[c].title!) : "<code>" + esc(c) + "</code>")).join("\n")
    : "—";
  const lines = [
    `${t(lang, "fj_st_en")}: ${cfg.enabled ? "✅ " + t(lang, "fj_on") : "⛔ " + t(lang, "fj_off")}`,
    `${t(lang, "fj_st_chats")}:\n${chatsLine}`,
    `${t(lang, "fj_st_mode")}: ${cfg.mode === "all" ? t(lang, "fj_all") : t(lang, "fj_any")}`,
    `${t(lang, "fj_st_re")}: ${cfg.recheckHours === 0 ? t(lang, "fj_always") : String(cfg.recheckHours) + "h"}`,
  ];
  const rows: Btn[][] = [
    [{ text: t(lang, "o_fj_set"), cb: "fj:setchat", color: "success", emoji: false }],
    [{ text: t(lang, "back"), cb: "menu:owner", color: "gray", emoji: false }],
  ];
  return { text: makeText(t(lang, "o_fj_status"), lines.join("\n"), t(lang, "choose"), t(lang, "o_crumb"), "owner"), kb: kb(rows) };
}

/* ============================ add bot to group (owner) ============================ */

export function fjGroupMenu(s: UserState, username: string): { text: string; kb: Kb } {
  const lang = L(s);
  const link = `https://t.me/${username}?startgroup&admin=invite_users`;
  const body = [
    t(lang, "fj_group_desc"),
    "",
    card("🛡 " + (lang === "fa" ? "دسترسی‌ها" : "Permissions"),
      [lang === "fa"
        ? "✅ «دعوت کاربران» — برای ساخت لینک عضویتِ گروه‌های خصوصی\n🚫 بقیه (حذف پیام، بن، پین، تغییر اطلاعات و…) خاموش"
        : "✅ “Invite users” — needed to generate join links for private groups\n🚫 Everything else (delete, ban, pin, change info…) stays off"]),
  ].join("\n");
  const rows: Btn[][] = [
    [{ text: t(lang, "fj_group_add"), url: link, color: "success", emoji: false }],
    [{ text: t(lang, "fj_group_rights"), cb: "fj:setrights", color: "primary", emoji: false }],
    [{ text: t(lang, "back"), cb: "menu:owner", color: "gray", emoji: false }],
  ];
  return { text: makeText(t(lang, "fj_group_t"), body, t(lang, "choose"), t(lang, "o_crumb"), "owner"), kb: kb(rows) };
}

/* ============================ panels 🗂 ============================ */

export function panelsList(s: UserState, page = 0): { text: string; kb: Kb } {
  const lang = L(s);
  if (!s.panels.length) {
    return {
      text: makeText(t(lang, "pan_title"), t(lang, "pan_empty"), t(lang, "choose"), t(lang, "pan_crumb"), "panels"),
      kb: kb([
        [{ text: t(lang, "pan_new"), cb: "do:build", color: "success", emoji: false }],
        [{ text: t(lang, "back"), cb: "menu:main", color: "gray", emoji: false }],
      ]),
    };
  }
  const PER = 5;
  const total = Math.max(1, Math.ceil(s.panels.length / PER));
  page = Math.max(0, Math.min(page, total - 1));
  const chunk = s.panels.slice(page * PER, (page + 1) * PER);
  const cards = chunk.map((p) =>
    card(`${healthDot(p)} ${esc(p.name)}`, [`🌐 <code>${esc(p.url)}</code>`, `💚 ${healthLine(p)}`])
  );
  const rows: Btn[][] = chunk.map((p) => [{ text: `${healthDot(p)} ${esc(p.name)}`, cb: `panel:${p.name}`, color: "primary", emoji: false }]);
  if (total > 1) rows.push(pageRow(lang, page, total, "panels"));
  rows.push([{ text: t(lang, "pan_health"), cb: "do:health", color: "success", emoji: false }]);
  rows.push([
    { text: t(lang, "pan_new"), cb: "do:build", color: "success", emoji: false },
    { text: t(lang, "back"), cb: "menu:main", color: "gray", emoji: false },
  ]);
  return {
    text: makeText(`${t(lang, "pan_title")} (${n(s, s.panels.length)})`, cards.join("\n\n"), t(lang, "choose"), t(lang, "pan_crumb"), "panels"),
    kb: kb(rows),
  };
}

export function panelDetail(s: UserState, name: string): { text: string; kb: Kb } {
  const lang = L(s);
  const p = s.panels.find((x) => x.name === name);
  if (!p) {
    return {
      text: makeText("?", "?", null, null, "danger"),
      kb: kb([[{ text: t(lang, "back"), cb: "panels:0", color: "gray", emoji: false }]]),
    };
  }
  const body = card(`${healthDot(p)} ${esc(name)}`, [
    `🌐 <code>${esc(p.url)}</code>`,
    `👤 ${esc(p.accountName || "?")}`,
    `📦 ${t(lang, "pd_ver")}: <code>${esc(p.bundleVer || "?")}</code>`,
    `📅 ${t(lang, "pd_created")}: ${fmtDate(p.createdAt, lang)}`,
    `💚 ${t(lang, "pd_health")}: ${healthLine(p)}`,
  ]);
  const rows: Btn[][] = [
    [{ text: t(lang, "pd_open"), url: p.url, color: "primary", emoji: false }],
    [{ text: t(lang, "pd_users"), cb: `pusers:${name}`, color: "success", emoji: false }],
    [{ text: t(lang, "pd_update"), cb: `pupd:${name}`, color: "primary", emoji: false }],
    [{ text: t(lang, "pd_delete"), cb: `pdel:${name}`, color: "danger", emoji: false }],
    [{ text: t(lang, "back"), cb: "panels:0", color: "gray", emoji: false }],
  ];
  return { text: makeText(esc(name), body, t(lang, "choose"), `${t(lang, "pan_crumb")} ‹ ${esc(name)}`, "panels"), kb: kb(rows) };
}

/* ============================ users 👥 ============================ */

export function usersList(
  s: UserState,
  pname: string,
  users: Array<{ id: string; name: string; quota?: number; used?: number; days?: number; active?: boolean }>,
  page = 0
): { text: string; kb: Kb } {
  const lang = L(s);
  const PER = 5;
  const total = Math.max(1, Math.ceil(users.length / PER));
  page = Math.max(0, Math.min(page, total - 1));
  const chunk = users.slice(page * PER, (page + 1) * PER);
  const body = users.length
    ? chunk
        .map((x) =>
          card(`${x.active ? "🟢" : "🔴"} ${esc(x.name)}`, [
            `📦 ${meter(usagePct(x), 8)}`,
            `${t(lang, "u_days")}: <b>${n(s, x.days ?? "?")}</b>`,
          ])
        )
        .join("\n\n")
    : t(lang, "u_empty");
  const rows: Btn[][] = chunk.map((x) => [{ text: `${x.active ? "🟢" : "🔴"} ${esc(x.name)}`, cb: `user:${x.id}`, color: "primary", emoji: false }]);
  if (total > 1) rows.push(pageRow(lang, page, total, `users:${pname}`));
  rows.push([{ text: t(lang, "u_new"), cb: `unew:${pname}`, color: "success", emoji: false }]);
  rows.push([{ text: t(lang, "back"), cb: `panel:${pname}`, color: "gray", emoji: false }]);
  return {
    text: makeText(t(lang, "u_title", { n: esc(pname) }), body, t(lang, "choose"), `${t(lang, "pan_crumb")} ‹ ${esc(pname)}`, "users"),
    kb: kb(rows),
  };
}

export function userDetail(
  s: UserState,
  pname: string,
  x: { id: string; name: string; quota?: number; used?: number; days?: number; active?: boolean },
  page: number
): { text: string; kb: Kb } {
  const lang = L(s);
  const base = s.panels.find((p) => p.name === pname)?.base || "";
  const links = subLinks(base, x as any);
  const body = card(`🙂 ${esc(x.name)}`, [
    `📦 ${t(lang, "u_quota")}: <b>${n(s, x.quota ?? "?")}GB</b>`,
    `${t(lang, "u_used")}: ${meter(usagePct(x), 8)}`,
    `📅 ${t(lang, "u_days")}: <b>${n(s, x.days ?? "?")}</b>`,
    `${t(lang, "u_state")}: <b>${x.active ? t(lang, "u_on") : t(lang, "u_off")}</b>`,
    `📡 <code>${esc(links.base64)}</code>`,
  ]);
  const rows: Btn[][] = [
    [
      { text: t(lang, "sub_link"), url: links.base64, color: "primary", emoji: false },
      { text: t(lang, "u_copy"), copy: links.base64, color: "gray", emoji: false },
    ],
    [
      { text: "📡 base64", url: links.base64, color: "primary", emoji: false },
      { text: "⛵ Clash", url: links.clash, color: "primary", emoji: false },
      { text: "📦 S-box", url: links.singbox, color: "primary", emoji: false },
    ],
    [{ text: t(lang, "u_del"), cb: `udel:${x.id}`, color: "danger", emoji: false }],
    [{ text: t(lang, "back"), cb: `users:${pname}:${page}`, color: "gray", emoji: false }],
  ];
  return { text: makeText(esc(x.name), body, t(lang, "choose"), `${t(lang, "pan_crumb")} ‹ ${esc(pname)}`, "users"), kb: kb(rows) };
}

/* ============================ prompts 🧩 ============================ */

export function tokenPrompt(s: UserState): { text: string; kb: Kb } {
  const lang = L(s);
  return {
    text: makeText("🔑", t(lang, "tok_ask"), null, null, "tokens"),
    kb: kb([
      [{ text: t(lang, "tok_link"), url: tokenUrl(), color: "primary", emoji: false }],
      [{ text: t(lang, "back"), cb: "menu:tokens", color: "gray", emoji: false }],
    ]),
  };
}

export function saveQuestion(s: UserState, accountName: string, accountCount: number): { text: string; kb: Kb } {
  const lang = L(s);
  const more = accountCount > 1 ? `\n➕ (${n(s, accountCount)} ${lang === "fa" ? "اکانت پیدا شد" : "accounts found"} — ${lang === "fa" ? "موقع ساخت پنل می‌پرسم کدوم رو می‌خوای" : "I'll ask which one when building"})` : "";
  const text = makeText(
    "🔐",
    `👤 <b>${esc(accountName)}</b>${more}\n\n💾 <b>${lang === "fa" ? "می‌خوای توکنت رو ذخیره کنم؟" : "Save your token?"}</b>\n${lang === "fa" ? "اگه ذخیره بشه، برای پنل‌های بعدی دیگه ازت توکن نمی‌خوام. 🔐 (با رمزنگاری ذخیره می‌شه)" : "If saved, I won't ask again for future panels. 🔐 (stored encrypted)"}`,
    null,
    null,
    "ok"
  );
  return {
    text,
    kb: kb([
      [{ text: t(lang, "a_yes"), cb: "save_y", color: "success", emoji: false }],
      [{ text: t(lang, "a_no"), cb: "save_n", color: "gray", emoji: false }],
    ]),
  };
}

export function chooseAccount(s: UserState, accounts: Array<{ id: string; name: string }>): { text: string; kb: Kb } {
  const lang = L(s);
  const rows: Btn[][] = accounts.map((a, i) => [{ text: `👤 ${esc(a.name)}`, cb: `acc:${i}`, color: "primary", emoji: false }]);
  rows.push([{ text: t(lang, "cancel"), cb: "menu:main", color: "gray", emoji: false }]);
  return { text: makeText("🗂", t(lang, "b_choose_acc"), t(lang, "choose"), null, "build"), kb: kb(rows) };
}

export function namePrompt(s: UserState, suggest?: string): { text: string; kb: Kb } {
  const lang = L(s);
  let text = makeText(t(lang, "b_new"), t(lang, "b_name"), null, `${t(lang, "main_crumb")} ‹ 🚀`, "build");
  if (suggest) text += `\n\n${card(`🎲 ${t(lang, "b_suggest")}`, [`<code>${esc(suggest)}</code>`])}`;
  const rows: Btn[][] = [[{ text: t(lang, "b_rand"), cb: "do:randname", color: "primary", emoji: false }]];
  if (suggest) {
    rows.push([
      { text: t(lang, "b_use"), cb: "do:usesuggest", color: "success", emoji: false },
      { text: t(lang, "b_another"), cb: "do:randname", color: "gray", emoji: false },
    ]);
  }
  rows.push([{ text: t(lang, "cancel"), cb: "menu:main", color: "gray", emoji: false }]);
  return { text, kb: kb(rows) };
}

export function buildConfirm(
  s: UserState,
  data: { name: string; accountName: string; url: string; ver: string }
): { text: string; kb: Kb } {
  const lang = L(s);
  const body = card(`📛 <code>${esc(data.name)}</code>`, [
    `👤 ${esc(data.accountName)}`,
    `🌐 <code>${esc(data.url)}</code>`,
    `📦 <code>${esc(data.ver)}</code> · ${stepsBar(lang, 4)}`,
  ]);
  return {
    text: makeText(t(lang, "b_confirm"), body, null, null, "build"),
    kb: kb([
      [{ text: t(lang, "b_build"), cb: "do:buildyes", color: "success", emoji: false }],
      [{ text: t(lang, "cancel"), cb: "menu:main", color: "gray", emoji: false }],
    ]),
  };
}

export function buildSuccess(s: UserState, name: string, sub: string): { text: string; kb: Kb } {
  const lang = L(s);
  const base = `https://${name}.${sub}.workers.dev`;
  const url = `${base}/admin`;
  return {
    text: party([
      `<b>${t(lang, "b_done", { n: esc(name) })}</b>`,
      `🌐 <code>${esc(url)}</code>`,
      "",
      t(lang, "b_done_sub"),
    ]),
    kb: kb([
      [{ text: t(lang, "pd_open"), url, color: "primary", emoji: false }],
      [{ text: `📋 ${t(lang, "u_copy")}`, copy: url, color: "gray", emoji: false }],
      [
        { text: t(lang, "b_panels"), cb: "panels:0", color: "success", emoji: false },
        { text: t(lang, "back"), cb: "menu:main", color: "gray", emoji: false },
      ],
    ]),
  };
}

/* ---------- small one-liners ---------- */

export const checking = (s: UserState): string => `⏳ ${t(L(s), "tok_checking")}`;
export const badToken = (s: UserState): string => t(L(s), "tok_bad");
export const tokenInvalid = (s: UserState, err?: string): string =>
  makeText("⛔", t(L(s), "tok_invalid", { e: esc(err || "?") }), null, null, "danger");
export const invalidName = (s: UserState): string => t(L(s), "b_name_bad");
export const invalidSub = (s: UserState): string => t(L(s), "b_sub_bad");
export const building = (s: UserState): string => `⏳ ${t(L(s), "tok_checking")}`;
export const needSubdomain = (s: UserState): string =>
  makeText("ℹ️", t(L(s), "b_need_sub"), null, null, "build");
export const buildError = (s: UserState, err?: string): string =>
  makeText(t(L(s), "b_fail"), `<code>${esc(err || "?")}</code>`, null, null, "danger");
export const cooldown = (s: UserState, m: number): string =>
  t(L(s), "b_cool", { m: L(s) === "fa" ? fa_num(m) : m });

export function confirmMenu(
  lang: Lang,
  actionCb: string,
  cancelCb: string,
  question: string,
  danger = true
): { text: string; kb: Kb } {
  return {
    text: makeText("⚠️", question, null, null, danger ? "danger" : "ok"),
    kb: kb([
      [{ text: t(lang, "yes_do"), cb: actionCb, color: danger ? "danger" : "success", emoji: false }],
      [{ text: t(lang, "back"), cb: cancelCb, color: "gray", emoji: false }],
    ]),
  };
}

export const askPanelPass = (s: UserState, pname: string): { text: string; kb: Kb } => {
  const lang = L(s);
  return {
    text: makeText("🔐", t(lang, "a_ask_pass", { n: esc(pname) }), null, null, "users"),
    kb: kb([[{ text: t(lang, "cancel"), cb: `panel:${pname}`, color: "gray", emoji: false }]]),
  };
};

export const askUname = (s: UserState, pname: string): { text: string; kb: Kb } => {
  const lang = L(s);
  return {
    text: makeText("➕", t(lang, "u_ask_name"), null, null, "users"),
    kb: kb([[{ text: t(lang, "cancel"), cb: `users:${pname}:0`, color: "gray", emoji: false }]]),
  };
};

export const badNum = (s: UserState): string => t(L(s), "u_bad_num");

export const pingResult = (s: UserState, ms: number): string =>
  `🏓 ${t(L(s), "ping_res", { ms: L(s) === "fa" ? fa_num(ms) : ms })}\n${meter(Math.min(100, (ms * 100) / 2000), 10)}`;

export const tokenSavedBanner = (s: UserState, acc: string): string =>
  makeText("🔐", t(L(s), "tok_saved", { acc: esc(acc) }), null, null, "ok");

/* ---------- update announcement (sent to every user on release) ---------- */
export function updateAnnouncement(version: string, notes: string): string {
  const body = notes ? `\n${esc(notes)}\n` : "\n";
  return (
    `🚀 <b>اپدیت جدید اومد دوست من!</b> ✏️\n\n` +
    `نسخهٔ <b>${esc(version)}</b> پنل <b>Nika Net</b> آماده‌ست.${body}` +
    `میتونی همین الان پنلت رو بروز کنی:\n` +
    `🖥 از داخل پنل → بخش «بروزرسانی»\n` +
    `🤖 یا ربات → دکمهٔ زیر ⬇️\n\n` +
    `با مهر، تیم Nika Net 💜`
  );
}

/* ============================ HYPER ✨ tools 🧰 ============================ */
/* Ported from nika_launcher_pro — every tool reads REAL panel/API data.   */

export function toolsMenu(s: UserState): { text: string; kb: Kb } {
  const lang = L(s);
  const body = [t(lang, "tools_desc"), ""].join("\n");
  const rows: Btn[][] = [
    [
      { text: t(lang, "voice_btn"), cb: "menu:voice", color: "primary", emoji: false },
      { text: t(lang, "cf_btn"), cb: "menu:cf", color: "success", emoji: false },
    ],
    [
      { text: t(lang, "mtx_btn"), cb: "menu:mtx", color: "primary", emoji: false },
      { text: t(lang, "warp_btn"), cb: "menu:warp", color: "success", emoji: false },
    ],
    [
      { text: t(lang, "wiz_btn"), cb: "menu:wiz", color: "danger", emoji: false },
      { text: t(lang, "isp_btn"), cb: "menu:isp", color: "gray", emoji: false },
    ],
    [
      { text: t(lang, "doh_btn"), cb: "menu:doh", color: "gray", emoji: false },
      { text: t(lang, "frag_btn"), cb: "menu:frag", color: "gray", emoji: false },
    ],
    [
      { text: t(lang, "sub_btn"), cb: "sub:ask", color: "gray", emoji: false },
      { text: t(lang, "tour_btn"), cb: "tour:0", color: "primary", emoji: false },
    ],
    [{ text: t(lang, "back"), cb: "menu:settings", color: "gray", emoji: false }],
  ];
  return { text: makeText(t(lang, "tools_t"), body, t(lang, "choose"), t(lang, "tools_crumb"), "settings"), kb: kb(rows) };
}

/* 🎙 voice — read a panel's live status (login + GET /api/status) */
export function voiceMenu(s: UserState, authed: string[]): { text: string; kb: Kb } {
  const lang = L(s);
  if (!s.panels.length) {
    return { text: makeText(t(lang, "voice_t"), t(lang, "mtx_none"), t(lang, "choose"), t(lang, "tools_crumb"), "danger"), kb: kb([[{ text: t(lang, "back"), cb: "menu:tools", color: "gray", emoji: false }]]) };
  }
  const lines: string[] = [];
  const rows: Btn[][] = [];
  for (const p of s.panels) {
    const ok = authed.includes(p.name);
    lines.push(`• ${ok ? "🎙" : "🔒"} ${esc(p.name)}`);
    rows.push([{ text: `${ok ? "🎙 " : "🔒 "}${esc(p.name)}`, cb: ok ? `voice:${p.name}` : `panel:${p.name}`, color: ok ? "primary" : "gray", emoji: false }]);
  }
  rows.push([{ text: t(lang, "back"), cb: "menu:tools", color: "gray", emoji: false }]);
  return { text: makeText(t(lang, "voice_t"), [t(lang, "voice_pick"), "", lines.join("\n")], t(lang, "choose"), t(lang, "tools_crumb"), "main"), kb: kb(rows) };
}

export function voiceResult(s: UserState, pname: string, st: Record<string, unknown>): string {
  const lang = L(s);
  const nv = (v: unknown) => n(s, Number(v) || 0);
  const protos = (st.protocols && typeof st.protocols === "object" ? Object.entries(st.protocols as Record<string, boolean>).filter(([, on]) => on).map(([k]) => k.toUpperCase()).join(" · ") : "—");
  const body = [
    `${t(lang, "voice_ver")}: <b><code>${esc(st.version || "?")}</code></b>`,
    `${t(lang, "voice_users")}: <b>${nv(st.users)}</b> (${t(lang, "voice_ok")})`,
    `${t(lang, "voice_req")}: <b>${nv(st.requestsToday)}</b>`,
    `${t(lang, "voice_used")}: <b>${nv(st.usedGb)} GB</b>`,
    `${t(lang, "voice_proto")}: <b>${esc(protos)}</b>`,
  ].join("\n");
  return makeText(`🎙 ${t(lang, "voice_t")} · ${esc(pname)}`, body, t(lang, "choose"), t(lang, "tools_crumb"), "ok");
}

/* 📊 cf quota — sum of requestsToday across authed panels vs 100k free cap */
export function cfMenu(s: UserState, entries: { name: string; r: number | null }[]): { text: string; kb: Kb } {
  const lang = L(s);
  if (!entries.length) {
    return { text: makeText(t(lang, "cf_t"), t(lang, "cf_none"), t(lang, "choose"), t(lang, "tools_crumb"), "danger"), kb: kb([[{ text: t(lang, "back"), cb: "menu:tools", color: "gray", emoji: false }]]) };
  }
  const CF_LIMIT = 100_000, CF_WARN = 0.8;
  const total = entries.reduce((a, e) => a + (e.r || 0), 0);
  const pct = Math.min(100, Math.round((total / CF_LIMIT) * 100));
  const lines: string[] = [];
  for (const e of entries) {
    lines.push(t(lang, "cf_line", { dot: e.r === null ? "🔒" : "🎯", n: esc(e.name), v: n(s, e.r || 0) }));
  }
  lines.push("", meter(pct, 10));
  lines.push(pct >= CF_WARN * 100 ? t(lang, "cf_warn", { pc: n(s, pct) }) : t(lang, "cf_ok"));
  return { text: makeText(t(lang, "cf_t"), lines, t(lang, "choose"), t(lang, "tools_crumb"), "main"), kb: kb([[{ text: t(lang, "back"), cb: "menu:tools", color: "gray", emoji: false }]]) };
}

/* 🧮 matrix — users/active/requests across panels */
export function mtxMenu(s: UserState, entries: { name: string; users: number; active: number; r: number | null }[]): { text: string; kb: Kb } {
  const lang = L(s);
  if (!entries.length) {
    return { text: makeText(t(lang, "mtx_t"), t(lang, "mtx_none"), t(lang, "choose"), t(lang, "tools_crumb"), "danger"), kb: kb([[{ text: t(lang, "back"), cb: "menu:tools", color: "gray", emoji: false }]]) };
  }
  const uTot = entries.reduce((a, e) => a + e.users, 0);
  const aTot = entries.reduce((a, e) => a + e.active, 0);
  const rTot = entries.reduce((a, e) => a + (e.r || 0), 0);
  const lines = entries.map((e) => t(lang, "mtx_line", { dot: e.r === null ? "🔒" : "🎯", n: esc(e.name), u: n(s, e.users), a: n(s, e.active), r: n(s, e.r || 0) }));
  lines.push("", t(lang, "mtx_tot", { u: n(s, uTot), g: n(s, 0), r: n(s, rTot) }));
  return { text: makeText(t(lang, "mtx_t"), lines, t(lang, "choose"), t(lang, "tools_crumb"), "main"), kb: kb([[{ text: t(lang, "back"), cb: "menu:tools", color: "gray", emoji: false }]]) };
}

/* ⛓ warp — list users of a panel + toggle the protocol */
export function warpMenu(s: UserState, pname: string, users: any[], warpOn: boolean): { text: string; kb: Kb } {
  const lang = L(s);
  const lines = [warpOn ? t(lang, "warp_on") : t(lang, "warp_off"), "", t(lang, "warp_pick", { n: esc(pname) })];
  const rows: Btn[][] = [];
  for (const u of users.slice(0, 10)) {
    rows.push([{ text: `${warpOn ? "⛓" : "🔒"} ${esc(u.name || u.id || "?")}`, cb: `warp:g:${pname}:${u.id}`, color: warpOn ? "primary" : "gray", emoji: false }]);
  }
  rows.push([{ text: warpOn ? t(lang, "warp_off_btn") : t(lang, "warp_on_btn"), cb: `warp:en:${pname}`, color: warpOn ? "gray" : "success", emoji: false }]);
  rows.push([{ text: t(lang, "back"), cb: "menu:tools", color: "gray", emoji: false }]);
  return { text: makeText(t(lang, "warp_t"), lines, t(lang, "warp_cap"), t(lang, "tools_crumb"), "main"), kb: kb(rows) };
}

export function warpConf(s: UserState, pname: string, uname: string, conf: string): { text: string; kb: Kb } {
  const lang = L(s);
  return {
    text: makeText(`⛓ WARP · ${esc(uname)}`, `<code>${esc(conf)}</code>`, t(lang, "warp_cap"), t(lang, "tools_crumb"), "ok"),
    kb: kb([
      [{ text: "📋", copy: conf, color: "primary", emoji: false }, { text: t(lang, "back"), cb: `warp:${pname}`, color: "gray", emoji: false }],
    ]),
  };
}

/* 🕵️ wiz — camouflage SNI + WS path */
export function wizAsk(s: UserState, step: 0 | 1): { text: string; kb: Kb } {
  const lang = L(s);
  const q = step === 0 ? t(lang, "wiz_ask_sni") : t(lang, "wiz_ask_ws");
  return {
    text: makeText(t(lang, "wiz_t"), q, null, t(lang, "tools_crumb"), "danger"),
    kb: kb([[{ text: t(lang, "cancel"), cb: "menu:tools", color: "gray", emoji: false }]]),
  };
}

export const wizDone = (s: UserState): string => makeText(t(L(s), "wiz_t"), t(L(s), "wiz_done"), t(L(s), "choose"), t(L(s), "tools_crumb"), "ok");
export const wizFail = (s: UserState, err: string): string => makeText(t(L(s), "wiz_t"), t(L(s), "wiz_fail", { e: esc(err) }), null, t(L(s), "tools_crumb"), "danger");

/* 📡 isp — operator presets */
export function ispMenu(s: UserState): { text: string; kb: Kb } {
  const lang = L(s);
  const rows: Btn[][] = [];
  const PRESETS: Record<string, { fa: string; en: string; flag: string; sni: string[] }> = {
    mci: { fa: "همراه اول", en: "MCI", flag: "🟢", sni: ["www.speedtest.net", "api.telegram.org", "ftp.mci.ir"] },
    irancell: { fa: "ایرانسل", en: "Irancell", flag: "🟣", sni: ["www.speedtest.net", "t.me", "mtnirancell.ir"] },
    rightel: { fa: "رایتل", en: "Rightel", flag: "🔵", sni: ["www.speedtest.net", "rightel.ir", "t.me"] },
    tci: { fa: "اسیاتک/مخابرات", en: "TCI", flag: "🟠", sni: ["www.speedtest.net", "tci.ir", "ftp.tci.ir"] },
  };
  const lines: string[] = [t(lang, "isp_hint"), ""];
  for (const [key, p] of Object.entries(PRESETS)) {
    lines.push(`${p.flag} ${lang === "fa" ? p.fa : p.en} → <code>${esc(p.sni[0])}</code>`);
    rows.push([{ text: `${p.flag} ${lang === "fa" ? p.fa : p.en}`, cb: `isp:${key}`, color: "primary", emoji: false }]);
  }
  rows.push([{ text: t(lang, "back"), cb: "menu:tools", color: "gray", emoji: false }]);
  return { text: makeText(t(lang, "isp_t"), lines, t(lang, "choose"), t(lang, "tools_crumb"), "main"), kb: kb(rows) };
}

export const ispApplied = (s: UserState, pname: string, sni: string): string =>
  makeText(t(L(s), "isp_t"), t(L(s), "isp_applied", { p: esc(pname), v: esc(sni) }), t(L(s), "choose"), t(L(s), "tools_crumb"), "ok");
export const ispNop = (s: UserState): string =>
  makeText(t(L(s), "isp_t"), t(L(s), "isp_nop"), t(L(s), "choose"), t(L(s), "tools_crumb"), "danger");

/* 🛡 doh — private DNS hosts */
export function dohMenu(s: UserState): { text: string; kb: Kb } {
  const lang = L(s);
  const hosts = [["AdGuard", "dns.adguard-dns.com"], ["NextDNS", "dns.nextdns.io"], ["ControlD", "freedns.controld.com/p2"]];
  const rows: Btn[][] = hosts.map(([label, host]) => [
    { text: `🛡 ${label}`, copy: host, color: "primary", emoji: false },
  ]);
  rows.push([{ text: t(lang, "back"), cb: "menu:tools", color: "gray", emoji: false }]);
  return { text: makeText(t(lang, "doh_t"), t(lang, "doh_hint"), t(lang, "choose"), t(lang, "tools_crumb"), "main"), kb: kb(rows) };
}

/* 🧩 fragment preset */
export function fragMenu(s: UserState): { text: string; kb: Kb } {
  const lang = L(s);
  return {
    text: makeText(t(lang, "frag_t"), t(lang, "frag_b"), t(lang, "choose"), t(lang, "tools_crumb"), "main"),
    kb: kb([
      [{ text: t(lang, "frag_ok"), copy: "v2rayNG → Settings → TLS → Fragment:\npackets=tlshello\nlength=100-200\ninterval=10-20\n\nsing-box outbounds:\n'fragment': {\"packets\": \"tlshello\", \"length\": \"100-200\", \"interval\": \"10-20\"}", color: "primary", emoji: false }],
      [{ text: t(lang, "back"), cb: "menu:tools", color: "gray", emoji: false }],
    ]),
  };
}

/* 🗺 roadmap (live) */
export function roadMenu(s: UserState, body: string): { text: string; kb: Kb } {
  const lang = L(s);
  return {
    text: makeText(t(lang, "road_t"), body || t(lang, "road_fail"), null, null, "art"),
    kb: kb([
      [{ text: t(lang, "road_btn"), url: "https://github.com/NikaTeem/Nika-Net/blob/main/ROADMAP.md", color: "primary", emoji: false }],
      [{ text: t(lang, "back"), cb: "menu:tools", color: "gray", emoji: false }],
    ]),
  };
}

/* 🎓 tour */
export function tourMenu(s: UserState, step: number): { text: string; kb: Kb } {
  const lang = L(s);
  const steps = [t(lang, "tour_0"), t(lang, "tour_1"), t(lang, "tour_2")];
  const last = step >= steps.length - 1;
  const body = steps[Math.min(step, steps.length - 1)];
  const rows: Btn[][] = [[
    last
      ? { text: t(lang, "back"), cb: "menu:tools", color: "success", emoji: false }
      : { text: t(lang, "next"), cb: `tour:${step + 1}`, color: "primary", emoji: false },
    { text: `${n(s, Math.min(step, steps.length - 1) + 1)}/${n(s, steps.length)}`, cb: "noop", color: "gray", emoji: false },
  ]];
  if (step > 0 && !last) rows[0].unshift({ text: t(lang, "prev"), cb: `tour:${step - 1}`, color: "gray", emoji: false });
  return { text: makeText(t(lang, "tour_title"), body, t(lang, "choose"), t(lang, "tools_crumb"), "help"), kb: kb(rows) };
}

/* ✍️ texts (personal overrides) */
export function textsMenu(s: UserState): { text: string; kb: Kb } {
  const lang = L(s);
  const c = s.cfg || {};
  const has = (k: string) => typeof c[k] === "string" && (c[k] as string).trim() !== "";
  const mk = (k: string) => (has(k) ? t(lang, "txt_mine") : t(lang, "txt_def"));
  const rows: Btn[][] = [
    [{ text: `${t(lang, "txt_w")} (${mk("hello")})`, cb: "txt:hello", color: has("hello") ? "success" : "gray", emoji: false }],
    [{ text: `${t(lang, "txt_menu")} (${mk("desc")})`, cb: "txt:desc", color: has("desc") ? "success" : "gray", emoji: false }],
    [{ text: `${t(lang, "txt_tip")} (${mk("tip")})`, cb: "txt:tip", color: has("tip") ? "success" : "gray", emoji: false }],
    [{ text: t(lang, "txt_clear"), cb: "txt:clear", color: "danger", emoji: false }],
    [{ text: t(lang, "back"), cb: "menu:settings", color: "gray", emoji: false }],
  ];
  return { text: makeText(t(lang, "txt_t"), t(lang, "txt_ask"), t(lang, "choose"), t(lang, "set_crumb"), "settings"), kb: kb(rows) };
}

/* 📣 promo (channel post after /start) */
export function promoMenu(s: UserState): { text: string; kb: Kb } {
  const lang = L(s);
  const cur = (s.cfg?.promo as string) || "";
  const body = cur ? [t(lang, "promo_saved"), "", cur].join("\n") : t(lang, "promo_ask");
  const rows: Btn[][] = [
    [{ text: "✏️", cb: "promo:edit", color: "primary", emoji: false }],
    [{ text: "🗑", cb: "promo:del", color: "danger", emoji: false }],
    [{ text: t(lang, "back"), cb: "menu:settings", color: "gray", emoji: false }],
  ];
  return { text: makeText(t(lang, "promo_t"), body, t(lang, "choose"), t(lang, "set_crumb"), "settings"), kb: kb(rows) };
}

/* 🔐 pin */
export function pinMenu(s: UserState): { text: string; kb: Kb } {
  const lang = L(s);
  const on = !!s.cfg?.pin;
  const body = [t(lang, "pin_status", { s: on ? t(lang, "pin_on") : t(lang, "pin_off") })];
  const rows: Btn[][] = [
    [{ text: on ? t(lang, "pin_off_btn") : t(lang, "pin_set_btn"), cb: on ? "pin:off" : "pin:set", color: on ? "danger" : "success", emoji: false }],
    [{ text: t(lang, "back"), cb: "menu:settings", color: "gray", emoji: false }],
  ];
  return { text: makeText(t(lang, "pin_t"), body, t(lang, "choose"), t(lang, "set_crumb"), "settings"), kb: kb(rows) };
}

/* 📟 subscription status */
export function subAskMenu(s: UserState): { text: string; kb: Kb } {
  const lang = L(s);
  return {
    text: makeText(t(lang, "sub_t"), t(lang, "sub_ask"), t(lang, "sub_hint"), t(lang, "tools_crumb"), "main"),
    kb: kb([[{ text: t(lang, "cancel"), cb: "menu:tools", color: "gray", emoji: false }]]),
  };
}

export function subResult(s: UserState, ok: boolean, data: { name?: string; proto?: string; error?: string }): string {
  const lang = L(s);
  if (!ok) return makeText(t(lang, "sub_t"), t(lang, "sub_nokey"), data.error ? `(${esc(data.error)})` : null, t(lang, "tools_crumb"), "danger");
  const lines = [t(lang, "sub_line", { n: esc(data.name || "—"), proto: esc(data.proto || "base64") })];
  return makeText(t(lang, "sub_t"), lines, t(lang, "sub_hint"), t(lang, "tools_crumb"), "ok");
}

/* 👑 easter egg */
export const queen = (): string =>
  `👑 ${t("fa", "easter")}`;
