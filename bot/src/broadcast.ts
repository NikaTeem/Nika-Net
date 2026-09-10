// Nika Net Launcher — پیام همگانی (Broadcast v2).
//
// قالب برندشدهٔ پیام همگانی:
//   📣 پیام همگانی Nika Net
//   این پیام از طرف Nika Net برای همهٔ کاربران ارسال شده است.
//   ──────────────
//   {متن مالک}
//   ──────────────
//   Nika Net · @bot
//
// + دکمهٔ اختیاری (URL) زیر پیام + تاریخچهٔ ارسال‌ها در KV.

import { Env } from "./types";
import * as tg from "./telegram";
import * as fj from "./forcedjoin";

const HISTORY_KEY = "bc:history";
const HISTORY_MAX = 20;

const ALLOWED = [
  "b", "strong", "i", "em", "u", "ins",
  "s", "strike", "del", "code", "pre", "tg-spoiler", "blockquote",
];
const OPEN = new Set(ALLOWED.map((t) => `<${t}>`));
const CLOSE = new Set(ALLOWED.map((t) => `</${t}>`));

// متن را برای parse_mode=HTML امن می‌کند: فقط تگ‌های مجاز می‌مانند؛
// اگر ساختار تگ‌ها خراب/نامتعادل باشد، کل متن به‌صورت ساده (escapشده) برمی‌گردد.
export function sanitizeHtml(text: string): string {
  const raw = String(text || "");
  const escaped = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let s = escaped;
  for (const t of ALLOWED) {
    s = s
      .replace(new RegExp("&lt;" + t + "&gt;", "g"), `<${t}>`)
      .replace(new RegExp("&lt;/" + t + "&gt;", "g"), `</${t}>`);
  }
  s = s.replace(/&lt;a href="([^"]*)"&gt;/g, '<a href="$1">').replace(/&lt;\/a&gt;/g, "</a>");

  // تعادل تگ‌ها
  const stack: string[] = [];
  const re = /<\/?[a-zA-Z][a-zA-Z0-9-]*(\s[^>]*)?>/g;
  let m: RegExpExecArray | null;
  let ok = true;
  while ((m = re.exec(s))) {
    const tag = m[0];
    if (/^<a[\s>]/.test(tag) || tag === "</a>") continue;
    if (OPEN.has(tag)) { stack.push(tag); continue; }
    if (CLOSE.has(tag)) {
      if (!stack.length) { ok = false; break; }
      stack.pop();
    }
  }
  if (stack.length) ok = false;
  const aOpen = (s.match(/<a[\s>]/g) || []).length;
  const aClose = (s.match(/<\/a>/g) || []).length;
  if (aOpen !== aClose) ok = false;

  return ok ? s : escaped;
}

export interface BcOptions {
  buttonText?: string;
  buttonUrl?: string;
}

// پاکت برندشدهٔ پیام همگانی (+ دکمهٔ اختیاری)
export function envelope(text: string, botUsername: string, opts: BcOptions = {}): { text: string; kb?: tg.Kb } {
  const body = sanitizeHtml(text);
  const u = botUsername || "NikaNetLauncher_bot";
  const sep = "──────────────";
  const msg =
    `📣 <b>پیام همگانی Nika Net</b>\n\n` +
    `این پیام از طرف <b>Nika Net</b> برای همهٔ کاربران ارسال شده است.\n` +
    `${sep}\n\n` +
    `${body}\n\n` +
    `${sep}\n` +
    `<b>Nika Net</b> · @${u}`;
  let kb: tg.Kb | undefined;
  if (opts.buttonText && opts.buttonUrl) {
    kb = tg.kb([[{ text: opts.buttonText, url: opts.buttonUrl, emoji: false }]]);
  }
  return { text: msg, kb };
}

export interface BcResult { sent: number; failed: number; total: number; }
export interface BcEntry { at: number; sent: number; failed: number; total: number; text: string; }

export async function broadcastAll(env: Env, text: string, opts: BcOptions = {}): Promise<BcResult> {
  const meta = await fj.botMeta(env);
  const { text: msg, kb } = envelope(text, meta.username, opts);
  const ids = await tg.listUserChatIds(env);
  let sent = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      const r: any = await tg.sendMessage(env, id, msg, kb);
      if (r && r.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }
  await record(env, { at: Date.now(), sent, failed, total: ids.length, text: text.slice(0, 80) });
  return { sent, failed, total: ids.length };
}

// ارسال تست فقط به چت خودِ مالک
export async function testBroadcast(env: Env, ownerId: number, text: string, opts: BcOptions = {}): Promise<boolean> {
  const meta = await fj.botMeta(env);
  const { text: msg, kb } = envelope(text, meta.username, opts);
  try {
    const r: any = await tg.sendMessage(env, ownerId, msg, kb);
    return !!(r && r.ok);
  } catch {
    return false;
  }
}

async function record(env: Env, entry: BcEntry): Promise<void> {
  try {
    const raw = (await env.BOT_KV.get(HISTORY_KEY)) || "[]";
    const arr: BcEntry[] = JSON.parse(raw);
    arr.unshift(entry);
    if (arr.length > HISTORY_MAX) arr.length = HISTORY_MAX;
    await env.BOT_KV.put(HISTORY_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

export async function history(env: Env): Promise<BcEntry[]> {
  try {
    const raw = (await env.BOT_KV.get(HISTORY_KEY)) || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
