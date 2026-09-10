// Nika Net Launcher — پشتیبانی v3 (هوشمند، با دسته‌بندی خودکار، دلیل بستن و امتیاز).
//
// یک مدل دادهٔ واحد: هر کاربر حداکثر یک «گفتگو» دارد (کلید KV = "sup:<chatId>").
//   - گفتگویی که کاربر شروع کند  → تیکت پشتیبانی (تب «پشتیبانی» در پنل)
//   - گفتگویی که مالک شروع کند   → پیام شخصی   (تب «پیام شخصی» در پنل)
//
// شروع‌کننده (startedBy) هنگام ساخت ثبت می‌شود؛ فقط در دو حالت عوض می‌شود:
//   ۱) کاربر خودش دستهٔ تیکت انتخاب کند (قصد صریح ثبت تیکت)
//   ۲) بدنهٔ تیکت بعد از انتخاب دسته بیاید
// به این ترتیب «ثبت تیکت» همیشه به تب پشتیبانی می‌رود، حتی اگر مالک قبلاً پیام شخصی زده باشد.

import { Env } from "./types";
import * as st from "./state";

export type TicketStatus = "open" | "closed";
export type Dir = "in" | "out";
export type StartedBy = "user" | "owner";

export interface SupportMsg {
  dir: Dir;
  text: string;
  at: number;
}

export interface Ticket {
  id: number;
  startedBy: StartedBy;
  status: TicketStatus;
  unread: number; // پیام‌های کاربر که مالک هنوز نخوانده
  lastAt: number;
  lastText: string;
  lastDir: Dir; // آخرین پیام از کی بود → برای نشانگر «در انتظار کی»
  createdAt: number;
  closedAt?: number;
  closeReason?: string; // شناسهٔ دلیل بستن (solved / duplicate / spam / noreply / other / close_all)
  closeNote?: string;   // یادداشت آزاد پشتیبانی هنگام بستن
  rating?: number;      // امتیاز کاربر ۱ تا ۵ بعد از بستن
  autoCat?: boolean;    // دسته به‌صورت خودکار حدس زده شد
  name: string;
  username: string;
  category?: string;      // شناسهٔ دسته (مثلاً "connect")
  categoryLabel?: string; // برچسب نمایشی دسته (مثلاً "🔌 مشکل اتصال")
  msgs: SupportMsg[];
}

// نوع پیام ورودی کاربر → تعیین‌کنندهٔ پیام تأیید و نوع اعلان مالک
export type IncomingVerdict = "new_ticket" | "reply" | "followup";

const PREFIX = "sup:";
const MAX_MSGS = 300; // فقط آخرین ۳۰۰ پیام هر گفتگو

const clip = (s: string, n: number) => String(s || "").slice(0, n);
const textOf = (s: string) => clip(s, 4096);

// متن را برای parse_mode=HTML تلگرام امن می‌کند
export const escTg = (s: string) =>
  String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------- دلایل بستن تیکت ---------- */
export interface CloseReason { id: string; fa: string }
export const CLOSE_REASONS: CloseReason[] = [
  { id: "solved", fa: "✅ حل شد" },
  { id: "duplicate", fa: "🔁 تکراری" },
  { id: "spam", fa: "🤖 اسپم" },
  { id: "noreply", fa: "⏳ کاربر بی‌پاسخ" },
  { id: "other", fa: "🔕 سایر" },
];
export const closeReasonLabel = (id?: string): string =>
  CLOSE_REASONS.find((c) => c.id === id)?.fa || "✅ بسته شد";

/* ---------- دسته‌بندی هوشمند بر اساس کلمات کلیدی ---------- */
const CAT_KEYWORDS: Array<{ id: string; fa: string; words: string[] }> = [
  {
    id: "connect", fa: "🔌 مشکل اتصال",
    words: ["اتصال", "وصل", "کانکت", "قطع", "قطعی", "پینگ", "سرور", "نت", "اینترنت", "زیرو", "zero",
      "connect", "connection", "ping", "server", "internet", "offline", "timeout", "دسترسی"],
  },
  {
    id: "buy", fa: "💳 خرید و اشتراک",
    words: ["خرید", "اشتراک", "پرداخت", "کارت", "تومان", "ریال", "تمدید", "قیمت", "فاکتور", "رسید",
      "buy", "purchase", "payment", "pay", "subscribe", "renew", "invoice", "price", "قیمت"],
  },
  {
    id: "account", fa: "👤 حساب و ورود",
    words: ["ورود", "رمز", "پسورد", "حساب", "اکانت", "لاگین", "احراز", "کد ورود", "کد", "هویت",
      "login", "password", "account", "token", "verify", "auth"],
  },
  {
    id: "bug", fa: "⚙️ باگ یا خطا",
    words: ["باگ", "خطا", "ارور", "کرش", "مشکل", "کار نمیکنه", "کار نمی‌کنه", "نمیشه", "هنگ", "فریز", "404", "500",
      "bug", "error", "crash", "broken", "not working", "doesn't work", "issue"],
  },
  {
    id: "idea", fa: "💡 پیشنهاد و انتقاد",
    words: ["پیشنهاد", "انتقاد", "ایده", "بهتر", "لطفا", "کاش", "امکان", "قابلیت",
      "suggestion", "idea", "feature", "improve", "feedback"],
  },
  {
    id: "other", fa: "❓ سوال عمومی",
    words: ["سوال", "چطور", "چجوری", "کجاست", "کی", "چی", "question", "how", "where", "what"],
  },
];

// حدس دستهٔ تیکت از متن آزاد کاربر — اگر هیچ کلمه‌ای پیدا نشد null برمی‌گردد.
export function guessCategory(text: string): { id: string; label: string } | null {
  const t = String(text || "").toLowerCase();
  if (!t) return null;
  let best: { id: string; label: string; score: number } | null = null;
  for (const cat of CAT_KEYWORDS) {
    let score = 0;
    for (const w of cat.words) {
      if (t.includes(w)) score += w.length > 3 ? 2 : 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { id: cat.id, label: cat.fa, score };
  }
  return best ? { id: best.id, label: best.label } : null;
}

// مهاجرت گفتگوهای قدیمی: فیلد `kind` (نسخه‌های قبلی) → `startedBy`
function normalize(raw: any): Ticket {
  let startedBy: StartedBy = raw.startedBy;
  if (!startedBy) startedBy = raw.kind === "dm" ? "owner" : "user";
  return {
    id: raw.id,
    startedBy,
    status: raw.status === "closed" ? "closed" : "open",
    unread: Number(raw.unread) || 0,
    lastAt: Number(raw.lastAt) || 0,
    lastText: String(raw.lastText || ""),
    lastDir: raw.lastDir === "out" ? "out" : "in",
    createdAt: Number(raw.createdAt) || raw.lastAt || Date.now(),
    closedAt: raw.closedAt || undefined,
    closeReason: raw.closeReason || undefined,
    closeNote: raw.closeNote || undefined,
    rating: Number.isFinite(Number(raw.rating)) ? Number(raw.rating) : undefined,
    autoCat: !!raw.autoCat,
    name: String(raw.name || ""),
    username: String(raw.username || ""),
    category: raw.category || undefined,
    categoryLabel: raw.categoryLabel || undefined,
    msgs: Array.isArray(raw.msgs) ? raw.msgs.slice(-MAX_MSGS) : [],
  };
}

export async function getTicket(env: Env, id: number): Promise<Ticket | null> {
  try {
    const raw = await env.BOT_KV.get(PREFIX + id);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

async function putTicket(env: Env, t: Ticket): Promise<void> {
  try {
    await env.BOT_KV.put(PREFIX + t.id, JSON.stringify(t));
  } catch {
    /* ignore */
  }
}

interface Who {
  firstName?: string;
  lastName?: string;
  username?: string;
}

function emptyTicket(id: number, startedBy: StartedBy, who?: Who): Ticket {
  return {
    id,
    startedBy,
    status: "open",
    unread: 0,
    lastAt: Date.now(),
    lastText: "",
    lastDir: "in",
    createdAt: Date.now(),
    name: [who?.firstName, who?.lastName].filter(Boolean).join(" ").trim(),
    username: who?.username || "",
    msgs: [],
  };
}

// پیام ورودی کاربر → ثبت + تعیین نوع (برای تأیید و اعلان)
// opts.asTicket = true یعنی کاربر قصد صریح ثبت تیکت داشته (انتخاب دسته یا بدنهٔ تیکت):
// در این حالت اگر گفتگوی قبلی «پیام شخصی» (شروع‌شده توسط مالک) بود، به تیکت تبدیل می‌شود.
export async function recordIncoming(
  env: Env,
  id: number,
  text: string,
  who?: Who,
  opts: { asTicket?: boolean } = {}
): Promise<{ verdict: IncomingVerdict; ticket: Ticket }> {
  let t = await getTicket(env, id);
  let verdict: IncomingVerdict;
  if (!t) {
    t = emptyTicket(id, "user", who);
    verdict = "new_ticket";
  } else {
    const last = t.msgs[t.msgs.length - 1];
    verdict = last && last.dir === "out" ? "reply" : "followup";
    if (opts.asTicket && t.startedBy !== "user") {
      t.startedBy = "user"; // کاربر تیکت باز کرده → از پیام شخصی به پشتیبانی
      verdict = "new_ticket";
    }
    if (!t.name) t.name = [who?.firstName, who?.lastName].filter(Boolean).join(" ").trim();
    if (!t.username) t.username = who?.username || "";
  }
  t.msgs.push({ dir: "in", text: textOf(text), at: Date.now() });
  if (t.msgs.length > MAX_MSGS) t.msgs = t.msgs.slice(-MAX_MSGS);
  t.lastAt = Date.now();
  t.lastText = clip(text, 120);
  t.lastDir = "in";
  t.unread = (t.unread || 0) + 1;
  t.status = "open"; // پیام جدید کاربر، گفتگو را دوباره باز می‌کند
  t.closedAt = undefined;
  t.closeReason = undefined;
  t.closeNote = undefined;
  // دسته‌بندی هوشمند: اگر دسته‌ای انتخاب نشده، از متن حدس بزن
  if (!t.category) {
    const g = guessCategory(text);
    if (g) {
      t.category = g.id;
      t.categoryLabel = g.label;
      t.autoCat = true;
    }
  }
  await putTicket(env, t);
  return { verdict, ticket: t };
}

// پیام خروجی مالک/پشتیبانی → ثبت در گفتگو (startedBy فقط اگر گفتگو تازه ساخته شود)
export async function recordOutgoing(
  env: Env,
  id: number,
  text: string,
  startedBy: StartedBy = "owner"
): Promise<Ticket> {
  let t = await getTicket(env, id);
  if (!t) t = emptyTicket(id, startedBy);
  t.msgs.push({ dir: "out", text: textOf(text), at: Date.now() });
  if (t.msgs.length > MAX_MSGS) t.msgs = t.msgs.slice(-MAX_MSGS);
  t.lastAt = Date.now();
  t.lastText = clip(text, 120);
  t.lastDir = "out";
  t.unread = 0;
  t.status = "open";
  await putTicket(env, t);
  return t;
}

// انتخاب دستهٔ تیکت: گفتگو را می‌سازد (یا باز می‌کند) و دسته را ثبت می‌کند.
// اگر گفتگوی قبلی «پیام شخصی» بود، به تیکت پشتیبانی تبدیل می‌شود.
export async function openCategory(
  env: Env,
  id: number,
  catId: string,
  catLabel: string,
  who?: Who
): Promise<Ticket> {
  let t = await getTicket(env, id);
  if (!t) t = emptyTicket(id, "user", who);
  if (t.startedBy !== "user") t.startedBy = "user"; // انتخاب دسته = قصد ثبت تیکت
  if (!t.name) t.name = [who?.firstName, who?.lastName].filter(Boolean).join(" ").trim();
  if (!t.username) t.username = who?.username || "";
  t.category = catId;
  t.categoryLabel = catLabel;
  t.autoCat = false;
  t.status = "open";
  t.lastAt = Date.now();
  await putTicket(env, t);
  return t;
}

// شروع «پیام شخصی» از پنل — اگر گفتگویی نبود، با startedBy=owner ساخته می‌شود.
export async function ensureThread(env: Env, id: number): Promise<void> {
  const t = await getTicket(env, id);
  if (!t) {
    const meta = await st.getMeta(env, id);
    await putTicket(
      env,
      emptyTicket(id, "owner", {
        firstName: meta?.firstName,
        lastName: meta?.lastName,
        username: meta?.username,
      })
    );
  }
}

export async function markRead(env: Env, id: number): Promise<void> {
  const t = await getTicket(env, id);
  if (t && t.unread) {
    t.unread = 0;
    await putTicket(env, t);
  }
}

export async function setStatus(env: Env, id: number, status: TicketStatus): Promise<Ticket | null> {
  const t = await getTicket(env, id);
  if (!t) return null;
  t.status = status;
  await putTicket(env, t);
  return t;
}

// بستن تیکت با دلیل + یادداشت (اختیاری)
export async function closeTicket(env: Env, id: number, reason?: string, note?: string): Promise<Ticket | null> {
  const t = await getTicket(env, id);
  if (!t) return null;
  t.status = "closed";
  t.closedAt = Date.now();
  t.closeReason = reason || "solved";
  t.closeNote = note?.trim().slice(0, 300) || undefined;
  await putTicket(env, t);
  return t;
}

// بازکردن دوبارهٔ تیکت
export async function reopenTicket(env: Env, id: number): Promise<Ticket | null> {
  const t = await getTicket(env, id);
  if (!t) return null;
  t.status = "open";
  t.closedAt = undefined;
  t.closeReason = undefined;
  t.closeNote = undefined;
  t.lastAt = Date.now();
  await putTicket(env, t);
  return t;
}

export async function setRating(env: Env, id: number, rating: number): Promise<Ticket | null> {
  const t = await getTicket(env, id);
  if (!t) return null;
  const r = Math.max(1, Math.min(5, Math.round(rating)));
  t.rating = r;
  await putTicket(env, t);
  return t;
}

export interface TicketMeta {
  id: number;
  startedBy: StartedBy;
  status: TicketStatus;
  unread: number;
  lastAt: number;
  lastText: string;
  lastDir: Dir;
  createdAt: number;
  closedAt?: number;
  closeReason?: string;
  rating?: number;
  autoCat?: boolean;
  name: string;
  username: string;
  category?: string;
  categoryLabel?: string;
}

// لیست گفتگوها — با فیلتر دید: "pm" (شروع‌شده توسط مالک) یا "tickets" (شروع‌شده توسط کاربر)
export async function listTickets(
  env: Env,
  view?: "pm" | "tickets"
): Promise<{ tickets: TicketMeta[]; open: number; unread: number }> {
  const out: TicketMeta[] = [];
  let cursor: string | undefined;
  do {
    const list = await env.BOT_KV.list({ prefix: PREFIX, cursor, limit: 1000 });
    for (const k of list.keys) {
      const id = parseInt(k.name.slice(PREFIX.length), 10);
      if (Number.isNaN(id)) continue;
      try {
        const raw = await env.BOT_KV.get(k.name);
        if (!raw) continue;
        const t = normalize(JSON.parse(raw));
        if (view === "pm" && t.startedBy !== "owner") continue;
        if (view === "tickets" && t.startedBy !== "user") continue;
        out.push({
          id: t.id,
          startedBy: t.startedBy,
          status: t.status,
          unread: t.unread,
          lastAt: t.lastAt,
          lastText: t.lastText,
          lastDir: t.lastDir,
          createdAt: t.createdAt,
          closedAt: t.closedAt,
          closeReason: t.closeReason,
          rating: t.rating,
          autoCat: t.autoCat,
          name: t.name,
          username: t.username,
          category: t.category,
          categoryLabel: t.categoryLabel,
        });
      } catch {
        /* skip corrupt */
      }
    }
    cursor = (list as any).list_complete ? undefined : (list as any).cursor;
  } while (cursor);
  out.sort((a, b) => b.lastAt - a.lastAt);
  const open = out.filter((t) => t.status === "open").length;
  const unread = out.reduce((s, t) => s + (t.unread || 0), 0);
  return { tickets: out, open, unread };
}

// بستن همهٔ تیکت‌های باز (فقط تیکت‌های کاربران، نه پیام‌های شخصی)
export async function closeAll(env: Env): Promise<number> {
  const { tickets } = await listTickets(env, "tickets");
  let n = 0;
  for (const t of tickets) {
    if (t.status === "open") {
      await closeTicket(env, t.id, "close_all");
      n++;
    }
  }
  return n;
}
