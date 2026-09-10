// Nika Net Launcher — "Graphite + Neon" art engine, menus & renderers.
import { Kb, ReplyKb, kb, replyKb, Btn } from "./telegram";
import { UserState, PanelRecord, TokenRecord, SkinId } from "./state";
import { t, Lang } from "./i18n";

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

export function replyMenu(s: UserState, appUrl?: string): ReplyKb {
  const lang = L(s);
  const supBtn = appUrl
    ? { text: lang === "fa" ? "🎧 پشتیبانی" : "🎧 Support", web_app: { url: appUrl } }
    : { text: lang === "fa" ? "🎧 پشتیبانی" : "🎧 Support" };
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

export function supportIntro(s: UserState, appUrl?: string): { text: string; kb: Kb } {
  const lang = L(s);
  const title = lang === "fa" ? "پشتیبانی Nika Net" : "Nika Net Support";
  const body =
    lang === "fa"
      ? [
          "سلام! 👋 به پشتیبانی Nika Net خوش اومدی.",
          "",
          "دو راه برای ارتباط با ما داری:",
          "• 📱 دکمهٔ زیر رو بزن تا اپ پشتیبانی (چت زنده) باز بشه — مثل یک چت واقعی.",
          "• یا همین‌جا پیامت رو تایپ کن و بفرست؛ پیامت مستقیم به تیم پشتیبانی می‌رسه و جوابش رو همین‌جا (پی‌وی خودت) دریافت می‌کنی. 📬",
        ].join("\n")
      : [
          "Hi! 👋 Welcome to Nika Net support.",
          "",
          "Two ways to reach us:",
          "• 📱 Tap the button below to open the support app (live chat) — just like a real chat.",
          "• Or type your message right here; it goes straight to our team and you'll get the answer right here in your own chat. 📬",
        ].join("\n");
  const rows: Btn[][] = [];
  if (appUrl) rows.push([{ text: lang === "fa" ? "📱 باز کردن اپ پشتیبانی" : "📱 Open support app", web_app: appUrl, color: "primary", emoji: false }]);
  rows.push([{ text: lang === "fa" ? "🏠 بازگشت به منو" : "🏠 Back to menu", cb: "menu:main", color: "gray", emoji: false }]);
  return {
    text: makeText(title, body, lang === "fa" ? "پیامت رو بنویس…" : "Type your message…", lang === "fa" ? "پشتیبانی" : "Support", "help"),
    kb: kb(rows),
  };
}

// تأیید ثبت تیکت (فقط برای اولین پیام هر تیکت)
export function supportAck(s: UserState): string {
  return L(s) === "fa"
    ? "🎫 <b>تیکت تو ثبت شد!</b>\n\nتیم پشتیبانی Nika Net به‌زودی همین‌جا جوابت رو می‌ده. اگه جزئیات بیشتری داری، همین‌جا ادامه بده. 📬"
    : "🎫 <b>Your ticket has been submitted!</b>\n\nThe Nika Net support team will reply to you right here soon. Feel free to add more details. 📬";
}

// اعلان به مالک هنگام ثبت تیکت جدید
export function supportNotify(ticket: { name?: string; username?: string }, text: string): string {
  const who = ticket.name ? `<b>${esc(ticket.name)}</b>` : "کاربر ناشناس";
  const un = ticket.username ? ` (@${esc(ticket.username)})` : "";
  const snippet = esc(text.slice(0, 140));
  return `🎫 <b>تیکت جدید پشتیبانی</b>\n\n👤 ${who}${un}\n💬 ${snippet}\n\nبرای پاسخ، پنل مدیریت → بخش «پشتیبانی» را باز کن.`;
}

/* ============================ main menu ⚡ ============================ */

export function mainMenu(s: UserState, firstName?: string, isOwner = false, meta?: BotMeta): { text: string; kb: Kb } {
  const lang = L(s);
  const name = firstName ? esc(firstName) : "دوست";
  const at = activeTok(s);
  const atv = at ? `${esc(at.name)} (…${esc(at.tail)})` : t(lang, "tok_none");
  const dash = card(`📊 ${t(lang, "main_hello", { name: `<b>${name}</b>` })}`, [
    `${t(lang, "main_tok")}: <b>${atv}</b>`,
    `${t(lang, "main_panels")}: <b>${n(s, s.panels.length)}</b>`,
    `${t(lang, "main_ver")}: <b><code>${VERSION}</code></b>`,
    `${t(lang, "main_today")}: ${todayStr(lang)}`,
  ]);
  const body = [t(lang, "main_desc"), "", dash, "", card(`${t(lang, "main_tip")} 💡`, [tip(lang)])].join("\n");
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
    [{ text: t(lang, "b_help"), cb: "menu:help", color: "gray", emoji: false }],
  ];
  // اپ پشتیبانی (Mini App تلگرام)
  if (meta?.origin) {
    rows.push([{ text: lang === "fa" ? "🎧 پشتیبانی" : "🎧 Support", web_app: `${meta.origin}/app/support`, color: "primary", emoji: false }]);
  }
  // مالک فقط — مدیریت بات (عضویت اجباری + ادمین کردن در کانال)
  if (isOwner) {
    rows.push([{ text: t(lang, "o_menu"), cb: "menu:owner", color: "danger", emoji: false }]);
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
    [{ text: t(lang, "o_fj_set"), cb: "fj:setchat", color: "success", emoji: false }],
    [{ text: t(lang, "o_fj_status"), cb: "fj:status", color: "gray", emoji: false }],
    [{ text: t(lang, "o_panel"), url: `${meta.origin}/panel`, color: "primary", emoji: false }],
    [{ text: t(lang, "back"), cb: "menu:main", color: "gray", emoji: false }],
  ];
  return { text: makeText(t(lang, "o_title"), body, t(lang, "choose"), t(lang, "o_crumb"), "owner"), kb: kb(rows) };
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
