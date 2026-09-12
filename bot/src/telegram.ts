// Nika Net Launcher — Telegram Bot API helpers (raw JSON, webhook-based).
import { Env } from "./types";

export interface TgUser { id: number; first_name?: string; last_name?: string; username?: string }
export interface TgChat { id: number; type?: string }
export interface TgMessage { message_id: number; chat: TgChat; from?: TgUser; text?: string }
export interface TgCallbackQuery { id: string; from: TgUser; message?: TgMessage; data?: string }
export interface TgChatMemberStatus { status: string; user?: TgUser; is_member?: boolean }
export interface TgChatMemberUpdate {
  chat: TgChat & { title?: string; username?: string };
  from?: TgUser;
  date?: number;
  old_chat_member?: TgChatMemberStatus;
  new_chat_member?: TgChatMemberStatus;
}
export interface TgUpdate { update_id: number; message?: TgMessage; callback_query?: TgCallbackQuery; my_chat_member?: TgChatMemberUpdate; chat_member?: TgChatMemberUpdate }

/* ---------- colored buttons (Bot API 9.0 `style`) ---------- */
export type Color = "primary" | "success" | "danger";

export interface Btn {
  text: string;
  cb?: string;
  url?: string;
  copy?: string;
  color?: Color | string | null; // also accepts فارسی/english aliases & "gray"
  emoji?: string | false; // default "auto" → circle emoji per color
}

interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
  copy_text?: { text: string };
  style?: string;
}

export interface Kb { inline_keyboard: InlineButton[][] }
export interface ReplyKb { keyboard: Array<Array<{ text: string }>>; resize_keyboard: boolean; one_time_keyboard?: boolean }

const CEMOJI: Record<string, string> = { primary: "🔵", success: "🟢", danger: "🔴", "": "⚪" };
const ALIAS: Record<string, string | null> = {
  primary: "primary", blue: "primary", "آبی": "primary",
  success: "success", green: "success", "سبز": "success",
  danger: "danger", red: "danger", "قرمز": "danger",
  gray: null, grey: null, default: null, normal: null,
  "خاکستری": null, "معمولی": null, "": null, none: null, null: null,
};

function ncolor(c: Color | string | null | undefined): string | null {
  if (c === undefined || c === null || c === "") return null;
  const k = String(c).trim().toLowerCase();
  return k in ALIAS ? ALIAS[k] : null;
}

function emojiOf(text: string, style: string | null, emoji: string | false | undefined): string {
  if (emoji === false || emoji === "") return text;
  if (emoji === undefined || emoji === "auto") {
    const e = CEMOJI[style || ""] || "";
    return e ? `${e} ${text}` : text;
  }
  return `${emoji} ${text}`;
}

export function kb(rows: Btn[][]): Kb {
  return {
    inline_keyboard: rows.map((r) =>
      r.map((b) => {
        const style = ncolor(b.color);
        const btn: InlineButton = { text: emojiOf(b.text, style, b.emoji) };
        if (b.copy) btn.copy_text = { text: b.copy };
        else if (b.url) btn.url = b.url;
        else btn.callback_data = b.cb || "noop";
        if (style) btn.style = style;
        return btn;
      })
    ),
  };
}

export function replyKb(rows: Array<Array<{ text: string }>>, oneTime = false): ReplyKb {
  return { keyboard: rows, resize_keyboard: true, one_time_keyboard: oneTime };
}

const API = "https://api.telegram.org";

async function tgApi(env: Env, method: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${API}/bot${env.TELEGRAM_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function sendMessage(env: Env, chatId: number, text: string, markup?: Kb | ReplyKb) {
  return tgApi(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(markup ? { reply_markup: markup } : {}),
  });
}

export function editMessage(env: Env, chatId: number, messageId: number, text: string, markup?: Kb) {
  return tgApi(env, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(markup ? { reply_markup: markup } : {}),
  });
}

export function deleteMessage(env: Env, chatId: number, messageId: number) {
  return tgApi(env, "deleteMessage", { chat_id: chatId, message_id: messageId });
}

export function sendChatAction(env: Env, chatId: number, action = "typing") {
  return tgApi(env, "sendChatAction", { chat_id: chatId, action });
}

export function getChatMember(env: Env, chatId: string | number, userId: number) {
  return tgApi(env, "getChatMember", { chat_id: String(chatId), user_id: userId });
}

export function getChat(env: Env, chatId: string | number) {
  return tgApi(env, "getChat", { chat_id: String(chatId) });
}

// Primary invite link of a supergroup/channel (bot must be admin). Used so
// private groups without a public username still get a clickable join link.
export function exportChatInviteLink(env: Env, chatId: string | number) {
  return tgApi(env, "exportChatInviteLink", { chat_id: String(chatId) });
}

// Default admin rights SUGGESTED when a user adds the bot as admin to a
// group/channel — these are the checkboxes that come pre-ticked in Telegram.
export function setMyDefaultAdministratorRights(env: Env, rights: Record<string, boolean>, forChannels = false) {
  return tgApi(env, "setMyDefaultAdministratorRights", { rights, for_channels: forChannels });
}


export function getUserProfilePhotos(env: Env, userId: number, limit = 1) {
  return tgApi(env, "getUserProfilePhotos", { user_id: userId, limit });
}

export function getFile(env: Env, fileId: string) {
  return tgApi(env, "getFile", { file_id: fileId });
}

export function getMe(env: Env) {
  return tgApi(env, "getMe", {});
}

export function answerCallback(env: Env, id: string, text?: string, alert = false) {
  return tgApi(env, "answerCallbackQuery", {
    callback_query_id: id,
    ...(text ? { text, show_alert: alert } : {}),
  });
}

export function sendDocument(env: Env, chatId: number, filename: string, content: string) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("document", new File([content], filename, { type: "application/javascript" }));
  return fetch(`${API}/bot${env.TELEGRAM_TOKEN}/sendDocument`, { method: "POST", body: form });
}

// دکمهٔ منوی ربات (کنار کادر نوشتن) → لیست دستورها (پشتیبانی به‌صورت کامند /support)
export function setCommandsMenuButton(env: Env) {
  return tgApi(env, "setChatMenuButton", { menu_button: { type: "commands" } });
}

export function setMyCommands(env: Env, commands: Array<{ command: string; description: string }>) {
  return tgApi(env, "setMyCommands", { commands });
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
