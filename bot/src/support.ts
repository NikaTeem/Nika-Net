// Nika Net Launcher — پشتیبانی / تیکت‌ها (صندوق واحد برای تیکت کاربران + پیام شخصی مالک).
// Users send free text to the bot → it becomes a ticket. The owner answers from
// the web panel (/panel) → the bot relays the reply to the user's private chat.
// Conversations live in KV under the "sup:" prefix (one key per user chat id).

import { Env } from "./types";
import * as st from "./state";

export type TicketStatus = "open" | "closed";

export interface SupportMsg {
  dir: "in" | "out"; // in = از کاربر · out = از پشتیبانی (مالک)
  text: string;
  at: number;
}

export interface Ticket {
  id: number; // Telegram user chat id
  kind: "ticket" | "dm"; // ticket = کاربر شروع کرده · dm = پیام شخصی مالک
  status: TicketStatus;
  unread: number; // پیام‌های کاربر که مالک هنوز نخوانده
  lastAt: number;
  lastText: string;
  name: string;
  username: string;
  category?: string; // دستهٔ انتخاب‌شده (شناسه)
  categoryLabel?: string; // برچسب فارسی/انگلیسی دسته
  msgs: SupportMsg[];
}

const PREFIX = "sup:";
const MAX_MSGS = 300; // فقط آخرین ۳۰۰ پیام هر گفتگو نگه داشته می‌شود

const clip = (s: string, n: number) => String(s || "").slice(0, n);
const textOf = (s: string) => clip(s, 4096);

// متن را برای parse_mode=HTML تلگرام امن می‌کند
export const escTg = (s: string) =>
  String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function getTicket(env: Env, id: number): Promise<Ticket | null> {
  try {
    const raw = await env.BOT_KV.get(PREFIX + id);
    return raw ? (JSON.parse(raw) as Ticket) : null;
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

export async function addUserMessage(
  env: Env,
  id: number,
  text: string,
  who?: Who
): Promise<{ created: boolean; firstUserMessage: boolean; isReply: boolean; ticket: Ticket }> {
  let t = await getTicket(env, id);
  const created = !t;
  if (!t) {
    t = { id, kind: "ticket", status: "open", unread: 0, lastAt: 0, lastText: "", name: "", username: "", msgs: [] };
  }
  if (!t.name) t.name = [who?.firstName, who?.lastName].filter(Boolean).join(" ").trim();
  if (!t.username) t.username = who?.username || "";
  // اولین پیام واقعی کاربر (برای پیام «تیکت ثبت شد»)
  const firstUserMessage = !t.msgs.some((m) => m.dir === "in");
  // پاسخ به پیام مالک/پشتیبانی (برای پیام «پیام شما ارسال شد»)
  const isReply = t.msgs.length > 0 && t.msgs[t.msgs.length - 1].dir === "out";
  t.msgs.push({ dir: "in", text: textOf(text), at: Date.now() });
  if (t.msgs.length > MAX_MSGS) t.msgs = t.msgs.slice(-MAX_MSGS);
  t.lastAt = Date.now();
  t.lastText = clip(text, 120);
  t.unread = (t.unread || 0) + 1;
  t.status = "open"; // پیام جدید کاربر، تیکت را دوباره باز می‌کند
  await putTicket(env, t);
  return { created, firstUserMessage, isReply, ticket: t };
}

export async function addOwnerMessage(env: Env, id: number, text: string): Promise<Ticket> {
  let t = await getTicket(env, id);
  if (!t) {
    t = { id, kind: "dm", status: "open", unread: 0, lastAt: 0, lastText: "", name: "", username: "", msgs: [] };
  }
  t.msgs.push({ dir: "out", text: textOf(text), at: Date.now() });
  if (t.msgs.length > MAX_MSGS) t.msgs = t.msgs.slice(-MAX_MSGS);
  t.lastAt = Date.now();
  t.lastText = clip(text, 120);
  t.unread = 0;
  t.status = "open";
  await putTicket(env, t);
  return t;
}

// ساخت یک گفتگوی خالی (پیام شخصی مالک) — نام/یوزرنیم کاربر را از متادیتا پر می‌کند
// تا در پنل به‌جای آیدی عددی، پروفایل کاربر دیده شود.
export async function ensureThread(env: Env, id: number): Promise<void> {
  const t = await getTicket(env, id);
  if (!t) {
    const meta = await st.getMeta(env, id);
    await putTicket(env, {
      id,
      kind: "dm",
      status: "open",
      unread: 0,
      lastAt: Date.now(),
      lastText: "",
      name: [meta?.firstName, meta?.lastName].filter(Boolean).join(" ").trim(),
      username: meta?.username || "",
      msgs: [],
    });
    return;
  }
  // بک‌فیل: گفتگوهای قدیمی که فقط آیدی عددی دارند
  if (!t.name && !t.username) {
    const meta = await st.getMeta(env, id);
    if (meta) {
      t.name = [meta.firstName, meta.lastName].filter(Boolean).join(" ").trim();
      t.username = meta.username || "";
      await putTicket(env, t);
    }
  }
}

// انتخاب دستهٔ تیکت: اگر گفتگوی بازی نباشد می‌سازد و دسته را ثبت می‌کند.
// (جایگزین Mini App پشتیبانی — تیکت با انتخاب دسته شروع می‌شود.)
export async function openCategory(
  env: Env,
  id: number,
  catId: string,
  catLabel: string,
  who?: Who
): Promise<Ticket> {
  let t = await getTicket(env, id);
  if (!t || t.status === "closed") {
    t = {
      id,
      kind: "ticket",
      status: "open",
      unread: 0,
      lastAt: Date.now(),
      lastText: "🏷 " + catLabel,
      name: [who?.firstName, who?.lastName].filter(Boolean).join(" ").trim(),
      username: who?.username || "",
      msgs: [],
    };
  } else {
    t.status = "open";
  }
  if (!t.name) t.name = [who?.firstName, who?.lastName].filter(Boolean).join(" ").trim();
  if (!t.username) t.username = who?.username || "";
  t.category = catId;
  t.categoryLabel = catLabel;
  t.kind = "ticket"; // کاربر صریحاً تیکت پشتیبانی باز کرده → در تب «پشتیبانی» پنل دیده شود
  t.lastAt = Date.now();
  await putTicket(env, t);
  return t;
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

export interface TicketMeta {
  id: number;
  kind: "ticket" | "dm";
  status: TicketStatus;
  unread: number;
  lastAt: number;
  lastText: string;
  name: string;
  username: string;
  category?: string;
  categoryLabel?: string;
}

export async function listTickets(env: Env, kind?: "ticket" | "dm"): Promise<{ tickets: TicketMeta[]; open: number; unread: number }> {
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
        const t = JSON.parse(raw) as Ticket;
        if (kind && (t.kind || "ticket") !== kind) continue;
        out.push({
          id: t.id,
          kind: t.kind || "ticket",
          status: t.status || "open",
          unread: t.unread || 0,
          lastAt: t.lastAt || 0,
          lastText: t.lastText || "",
          name: t.name || "",
          username: t.username || "",
          category: t.category || "",
          categoryLabel: t.categoryLabel || "",
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
