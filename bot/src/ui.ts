// Nika Net Launcher — all the beautiful Persian messages & keyboards.

import { Kb, kb } from "./telegram";
import { UserState, PanelRecord } from "./state";
import { CfAccount } from "./cloudflare";

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------- لینک مستقیم توکن با دسترسی‌های آماده ---------- */
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

export const DIV = "──────────────────────";

/* ---------- منوی اصلی ---------- */
export function menu(s: UserState, firstName?: string): { text: string; kb: Kb } {
  const name = firstName ? esc(firstName) : "دوست";
  const saved = s.saved ? "✅ ذخیره شده" : "⚠️ ذخیره نشده";
  const savedLine = s.saved && s.tokenTail ? `${saved} (…${esc(s.tokenTail)})` : saved;
  const text =
    `⚡ <b>NIKA NET</b> · لانچر پنل\n${DIV}\n` +
    `سلام ${name} عزیز! 👋\n\n` +
    `من لانچر <b>Nika Net</b> هستم.\n` +
    `با من می‌تونی روی اکانت Cloudflare خودت پنل پروکسی بسازی — <b>کاملاً رایگان</b> و بدون سرور. ✏️\n\n` +
    `🔑 <b>وضعیت توکن:</b> ${savedLine}\n` +
    `🛠 <b>پنل‌های ساخته‌شده:</b> ${s.panels.length}\n`;
  const kbRows: Kb = kb([
    [{ text: "🔑 لینک مستقیم توکن", url: tokenUrl() }],
    [{ text: "🚀 ساخت پنل جدید", cb: "build" }],
    [{ text: "🗂 پنل‌های من", cb: "panels" }, { text: "🛠 تنظیمات", cb: "settings" }],
    [{ text: "ℹ️ راهنما", cb: "help" }],
  ]);
  return { text, kb: kbRows };
}

/* ---------- ثبت توکن ---------- */
export function tokenPrompt(): { text: string; kb: Kb } {
  const text =
    `🔑 <b>ثبت توکن Cloudflare</b>\n${DIV}\n` +
    `برای ساختن پنل، به یک <b>API Token</b> از اکانت Cloudflare خودت نیاز دارم.\n\n` +
    `👇 برای راحتی، روی دکمهٔ زیر بزن تا با <b>همهٔ دسترسی‌های لازم از قبل انتخاب‌شده</b> وارد صفحهٔ ساخت توکن بشی. فقط کافیه:\n\n` +
    `1️⃣ <b>Continue to summary</b> رو بزنی\n` +
    `2️⃣ بعد <b>Create Token</b> رو بزنی\n` +
    `3️⃣ توکن رو کپی کنی و همین‌جا برام بفرستی\n`;
  return { text, kb: kb([[{ text: "🔑 لینک مستقیم توکن (دسترسی‌ها آماده)", url: tokenUrl() }], [{ text: "🔙 بازگشت", cb: "menu" }]]) };
}

export const checking = (): string => `⏳ در حال بررسی توکن...`;
export const badToken = (): string => `⚠️ این که فرستادی شبیه توکن Cloudflare نیست!\nتوکن معمولاً با حروف و عدد طولانی شروع می‌شه. دوباره امتحان کن.`;

export function tokenInvalid(err?: string): string {
  return `❌ <b>توکن معتبر نیست</b>\n${DIV}\n${esc(err || "مشکل نامشخص")}\n\nمطمئن شو توکن رو کامل کپی کردی. 🔁`;
}

export function saveQuestion(accounts: CfAccount[]): { text: string; kb: Kb } {
  const acc = accounts[0];
  const more = accounts.length > 1 ? `\n➕ (${accounts.length} اکانت پیدا شد — موقع ساخت پنل می‌پرسی کدوم رو می‌خوای)` : "";
  const text =
    `✅ <b>توکن تأیید شد!</b>\n${DIV}\n` +
    `👤 <b>اکانت:</b> ${esc(acc.name)}\n` +
    `🆔 <b>شناسه:</b> <code>${esc(acc.id)}</code>${more}\n\n` +
    `💾 <b>می‌خوای توکنت رو ذخیره کنم؟</b>\n` +
    `اگه ذخیره بشه، برای ساخت پنل‌های بعدی دیگه ازت توکن نمی‌خوام. 🔐\n` +
    `(با رمزنگاری ذخیره می‌شه)`;
  return {
    text,
    kb: kb([[{ text: "✅ بله، ذخیره کن", cb: "save_y" }, { text: "❌ نه، فقط همین دفعه", cb: "save_n" }]]),
  };
}

export const savedYes = (): { text: string; kb: Kb } => ({
  text: `✅ توکن با <b>رمزنگاری</b> ذخیره شد! 🔐\n${DIV}\nحالا هر وقت خواستی می‌تونی پنل بسازی.`,
  kb: kb([[{ text: "🚀 ساخت پنل جدید", cb: "build" }], [{ text: "🔙 منوی اصلی", cb: "menu" }]]),
});

export const savedNo = (): { text: string; kb: Kb } => ({
  text: `👌 باشه، توکن رو ذخیره نمی‌کنم.\nفقط برای همین بار استفاده می‌کنم و بعد از ساخت پنل پاکش می‌کنم.`,
  kb: kb([[{ text: "🚀 ساخت پنل جدید", cb: "build" }], [{ text: "🔙 منوی اصلی", cb: "menu" }]]),
});

/* ---------- ساخت پنل ---------- */
export const namePrompt = (): string =>
  `🚀 <b>ساخت پنل جدید</b>\n${DIV}\n` +
  `یه اسم برای پنلت بفرست ✍️\n\n` +
  `این اسم توی آدرس پنل میاد:\n` +
  `<code>https://{name}.{subdomain}.workers.dev/admin</code>\n\n` +
  `قواعد: حروف کوچک انگلیسی، عدد و خط تیره (-)، بین ۳ تا ۳۲ کاراکتر.\n` +
  `مثلاً: <code>nika-one</code>`;

export const invalidName = (): string =>
  `⚠️ این اسم قابل قبول نیست!\nفقط حروف کوچک انگلیسی (a-z)، عدد و خط تیره (-)، بین ۳ تا ۳۲ کاراکتر.\n\nدوباره بفرست:`;

export const chooseAccount = (accounts: CfAccount[]): { text: string; kb: Kb } => ({
  text: `🗂 <b>چند تا اکانت پیدا کردم!</b>\n${DIV}\nکدوم اکانت رو برای ساخت پنل می‌خوای؟`,
  kb: kb(accounts.map((a, i) => [{ text: `👤 ${a.name}`, cb: `acc:${i}` }]).concat([[{ text: "🔙 بازگشت", cb: "menu" }]])),
});

export const building = (): string => `⏳ در حال ساخت پنل... چند ثانیه طول می‌کشه ✏️`;

export const needSubdomain = (): string =>
  `ℹ️ <b>یه قدم کوچیک مونده</b>\n${DIV}\n` +
  `اکانت Cloudflare تو هنوز <b>زیردامنهٔ workers.dev</b> نداره.\n\n` +
  `یه اسم یکتا بفرست تا برات ثبتش کنم (فقط حروف کوچک و عدد، مثل <code>nika2026</code>).\n` +
  `این زیردامنه یک‌بار ساخته می‌شه و بعداً برای همهٔ پنل‌هات استفاده می‌شه.`;

export const invalidSub = (): string =>
  `⚠️ این اسم قابل قبول نیست!\nفقط حروف کوچک انگلیسی و عدد (بدون خط تیره)، بین ۳ تا ۳۲ کاراکتر. دوباره بفرست:`;

export function buildSuccess(name: string, sub: string): { text: string; kb: Kb } {
  const url = `https://${name}.${sub}.workers.dev/admin`;
  return {
    text:
      `✅ <b>پنل ساخته شد!</b> 🎉\n${DIV}\n` +
      `🌐 <b>آدرس پنل:</b>\n<code>${esc(url)}</code>\n\n` +
      `🔐 بار اول که وارد بشی، خودت رمز ادمین رو تعیین می‌کنی.\n` +
      `📡 پروتکل‌ها: <b>VLESS · Trojan · WARP</b>\n\n` +
      `بزن بریم! ✏️`,
    kb: kb([[{ text: "🔗 باز کردن پنل", url }], [{ text: "🗂 پنل‌های من", cb: "panels" }, { text: "🔙 منوی اصلی", cb: "menu" }]]),
  };
}

export const buildError = (err?: string): string =>
  `❌ <b>ساخت پنل ناموفق بود</b>\n${DIV}\n${esc(err || "خطای نامشخص")}\n\nدوباره امتحان کن.`;

/* ---------- پنل‌های من ---------- */
export function panelsList(panels: PanelRecord[]): { text: string; kb: Kb } {
  if (!panels.length) {
    return {
      text: `🗂 <b>پنل‌های من</b>\n${DIV}\nهنوز پنلی نساختی! 🫥\nبا «🚀 ساخت پنل جدید» شروع کن.`,
      kb: kb([[{ text: "🚀 ساخت پنل جدید", cb: "build" }], [{ text: "🔙 منوی اصلی", cb: "menu" }]]),
    };
  }
  const lines = panels.map((p, i) => `${i + 1}. <a href="${esc(p.url)}">${esc(p.name)}</a>`).join("\n");
  return {
    text: `🗂 <b>پنل‌های من</b>\n${DIV}\n${lines}\n\nروی هر کدوم بزن تا باز بشه.`,
    kb: kb([
      ...panels.map((p) => [{ text: `🔗 ${p.name}`, url: p.url }]),
      [{ text: "🚀 ساخت پنل جدید", cb: "build" }, { text: "🔙 منوی اصلی", cb: "menu" }],
    ]),
  };
}

/* ---------- تنظیمات ---------- */
export function settings(s: UserState): { text: string; kb: Kb } {
  const tokenLine = s.saved && s.tokenTail
    ? `🔑 <b>توکن ذخیره‌شده:</b> …${esc(s.tokenTail)}`
    : `🔑 <b>توکن ذخیره‌شده:</b> ندارد`;
  const text = `🛠 <b>تنظیمات</b>\n${DIV}\n${tokenLine}\n\n🛡 توکن با رمزنگاری AES-GCM ذخیره می‌شه.`;
  const rows: Kb = kb([
    ...(s.saved ? [[{ text: "❌ حذف توکن ذخیره‌شده", cb: "del_token" }] as Array<{text:string; cb?:string; url?:string}>] : []),
    [{ text: "🔑 ثبت توکن جدید", cb: "token" }],
    [{ text: "🔙 منوی اصلی", cb: "menu" }],
  ]);
  return { text, kb: rows };
}

export const tokenDeleted = (): string => `🗑 توکن ذخیره‌شده حذف شد.\nبرای ساخت پنل بعدی دوباره توکن می‌خوام.`;

/* ---------- راهنما ---------- */
export const help = (): { text: string; kb: Kb } => ({
  text:
    `ℹ️ <b>راهنمای Nika Net Launcher</b>\n${DIV}\n` +
    `<b>۱) گرفتن توکن Cloudflare</b>\n` +
    `روی «🔑 لینک مستقیم توکن» بزن — همهٔ دسترسی‌ها از قبل انتخاب شده. فقط:\n` +
    `<code>Continue to summary</code> → <code>Create Token</code> → کپی توکن → برام بفرست.\n\n` +
    `<b>۲) ساخت پنل</b>\n` +
    `«🚀 ساخت پنل جدید» بزن، اسم پنل رو بفرست — من پنل رو با KV و همه‌چیز می‌سازم و آدرسش رو می‌دم.\n\n` +
    `<b>۳) ورود به پنل</b>\n` +
    `اولین بار رمز ادمین رو خودت تعیین می‌کنی، بعد کاربر بساز و لینک اشتراک بگیر.\n\n` +
    `🔒 توکن‌ها با رمزنگاری ذخیره می‌شن و فقط مال خودت‌ان.`,
  kb: kb([[{ text: "🔙 منوی اصلی", cb: "menu" }]]),
});
