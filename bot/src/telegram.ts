// Nika Net Launcher — Telegram Bot API helpers
import { Env } from "./types";

export interface TgUser { id: number; first_name?: string; last_name?: string; username?: string }
export interface TgChat { id: number; type?: string }
export interface TgMessage { message_id: number; chat: TgChat; from?: TgUser; text?: string }
export interface TgCallbackQuery { id: string; from: TgUser; message?: TgMessage; data?: string }
export interface TgUpdate { update_id: number; message?: TgMessage; callback_query?: TgCallbackQuery }

export type KbButton = { text: string; cb?: string; url?: string };
export type Kb = { inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>> };

export const kb = (rows: KbButton[][]): Kb => ({
  inline_keyboard: rows.map((r) =>
    r.map((b) => ({ text: b.text, ...(b.url ? { url: b.url } : { callback_data: b.cb }) }))
  ),
});

const API = "https://api.telegram.org";

export async function tgApi(env: Env, method: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${API}/bot${env.TELEGRAM_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function sendMessage(env: Env, chatId: number, text: string, markup?: Kb) {
  return tgApi(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(markup ? { reply_markup: markup } : {}),
  });
}

export function answerCallback(env: Env, id: string, text?: string) {
  return tgApi(env, "answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) });
}

// list every chat id that ever interacted with the bot (state keys start with "u:")
export async function listUserChatIds(env: Env): Promise<number[]> {
  const ids: number[] = [];
  let cursor: string | undefined;
  do {
    const list = await env.BOT_KV.list({ prefix: "u:", cursor, limit: 1000 });
    for (const k of list.keys) {
      const id = parseInt(k.name.slice(2), 10);
      if (!Number.isNaN(id)) ids.push(id);
    }
    cursor = (list as any).list_complete ? undefined : (list as any).cursor;
  } while (cursor);
  return ids;
}
