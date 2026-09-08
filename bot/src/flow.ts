// Nika Net Launcher — the conversation state machine.

import { Env } from "./types";
import * as tg from "./telegram";
import * as st from "./state";
import * as cf from "./cloudflare";
import * as ui from "./ui";
import { encryptText, decryptText } from "./crypto";

declare const PANEL_BUNDLE: string;
const BUNDLE = PANEL_BUNDLE; // single reference → esbuild inlines the panel once

export async function handleUpdate(env: Env, update: tg.TgUpdate): Promise<void> {
  try {
    if (update.callback_query) return await handleCallback(env, update.callback_query);
    if (update.message) return await handleMessage(env, update.message);
  } catch (e) {
    console.error("update error", e);
  }
}

/* ---------------- broadcast (owner-only) ---------------- */
export async function broadcastAll(env: Env, text: string): Promise<{ sent: number; total: number }> {
  const ids = await tg.listUserChatIds(env);
  let sent = 0;
  for (const id of ids) {
    try {
      await tg.sendMessage(env, id, text);
      sent++;
    } catch {
      /* skip blocked/unreachable */
    }
  }
  return { sent, total: ids.length };
}

/* ---------------- messages ---------------- */
async function handleMessage(env: Env, msg: tg.TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // claim ownership on first /start
  if (text === "/start" || text.toLowerCase() === "start") {
    const owner = await st.getOwner(env);
    if (owner === null) await st.setOwner(env, chatId);
    const s = await st.getState(env, chatId);
    s.state = "idle";
    await st.saveState(env, chatId, s);
    const m = ui.menu(s, msg.from?.first_name);
    await tg.sendMessage(env, chatId, m.text, m.kb);
    return;
  }

  // broadcast announcement (owner only)
  if (text.startsWith("/broadcast")) {
    const owner = await st.getOwner(env);
    if (owner !== chatId) {
      await tg.sendMessage(env, chatId, "⛔ این دستور فقط برای سازندهٔ ربات است.");
      return;
    }
    const payload = text.replace(/^\/broadcast\s*/, "").trim();
    if (!payload) {
      await tg.sendMessage(env, chatId, "📣 <b>پیام همگانی</b>\n\nبرای ارسال به همه، این‌طور بنویس:\n<code>/broadcast متن پیام</code>");
      return;
    }
    await tg.sendMessage(env, chatId, "📣 در حال ارسال به همهٔ کاربران…");
    const r = await broadcastAll(env, payload);
    await tg.sendMessage(env, chatId, `✅ پیام به <b>${r.sent}</b> از ${r.total} کاربر ارسال شد.`);
    return;
  }

  const s = await st.getState(env, chatId);
  switch (s.state) {
    case "await_token":
      return await handleTokenInput(env, chatId, text);
    case "await_name":
      return await handleNameInput(env, chatId, text);
    case "await_subdomain":
      return await handleSubdomainInput(env, chatId, text);
    default: {
      const m = ui.menu(s, msg.from?.first_name);
      return await tg.sendMessage(env, chatId, m.text, m.kb);
    }
  }
}

async function handleTokenInput(env: Env, chatId: number, raw: string): Promise<void> {
  const token = raw.replace(/[“”"'`]/g, "").trim();
  if (token.length < 20) return void (await tg.sendMessage(env, chatId, ui.badToken()));

  await tg.sendMessage(env, chatId, ui.checking());
  const res = await cf.verifyAndListAccounts(token);
  if (!res.ok) return void (await tg.sendMessage(env, chatId, ui.tokenInvalid(res.err)));

  const s = await st.getState(env, chatId);
  s.tokenEnc = await encryptText(env.NIKA_SECRET, token);
  s.tokenTail = token.slice(-4);
  s.accounts = res.accounts;
  s.accountId = res.accounts.length === 1 ? res.accounts[0].id : undefined;
  s.state = "await_save";
  await st.saveState(env, chatId, s);

  const m = ui.saveQuestion(res.accounts);
  await tg.sendMessage(env, chatId, m.text, m.kb);
}

async function handleNameInput(env: Env, chatId: number, raw: string): Promise<void> {
  const name = raw.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(name)) {
    return void (await tg.sendMessage(env, chatId, ui.invalidName()));
  }
  const s = await st.getState(env, chatId);
  if (!s.tokenEnc) {
    s.state = "await_token";
    await st.saveState(env, chatId, s);
    const m = ui.tokenPrompt();
    return void (await tg.sendMessage(env, chatId, m.text, m.kb));
  }
  s.pendingName = name;
  s.state = "idle";
  await st.saveState(env, chatId, s);

  await tg.sendMessage(env, chatId, ui.building());
  try {
    const token = await decryptText(env.NIKA_SECRET, s.tokenEnc);
    const accountId = s.accountId || s.accounts?.[0]?.id;
    if (!accountId) throw new Error("اکانت مشخص نشد");

    let sub = await cf.getSubdomain(token, accountId);
    if (!sub) {
      s.state = "await_subdomain";
      await st.saveState(env, chatId, s);
      return void (await tg.sendMessage(env, chatId, ui.needSubdomain()));
    }
    await finishBuild(env, chatId, token, accountId, sub, name);
  } catch (e: any) {
    await tg.sendMessage(env, chatId, ui.buildError(e?.message || String(e)));
  }
}

async function handleSubdomainInput(env: Env, chatId: number, raw: string): Promise<void> {
  const sub = raw.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9]{2,62}$/.test(sub)) {
    return void (await tg.sendMessage(env, chatId, ui.invalidSub()));
  }
  const s = await st.getState(env, chatId);
  if (!s.tokenEnc || !s.pendingName) {
    s.state = "idle";
    await st.saveState(env, chatId, s);
    return;
  }
  await tg.sendMessage(env, chatId, ui.building());
  try {
    const token = await decryptText(env.NIKA_SECRET, s.tokenEnc);
    const accountId = s.accountId || s.accounts?.[0]?.id;
    if (!accountId) throw new Error("اکانت مشخص نشد");
    const r = await cf.registerSubdomain(token, accountId, sub);
    if (!r.ok) throw new Error(r.err || "ثبت زیردامنه ناموفق بود");
    await finishBuild(env, chatId, token, accountId, sub, s.pendingName);
  } catch (e: any) {
    await tg.sendMessage(env, chatId, ui.buildError(e?.message || String(e)));
  }
}

async function finishBuild(
  env: Env,
  chatId: number,
  token: string,
  accountId: string,
  sub: string,
  name: string
): Promise<void> {
  const kvId = await cf.createKvNamespace(token, accountId, `nika-${name}-kv`);
  if (!kvId) throw new Error("ساخت KV namespace ناموفق بود");

  const up = await cf.uploadWorker(token, accountId, name, BUNDLE, [
    { type: "kv_namespace", name: "NIKA_KV", namespace_id: kvId },
  ]);
  if (!up.ok) throw new Error(up.err || "آپلود ورکر ناموفق بود");

  const en = await cf.enableWorkersDev(token, accountId, name);
  if (!en.ok) throw new Error(en.err || "فعال‌سازی آدرس workers.dev ناموفق بود");

  const s = await st.getState(env, chatId);
  s.panels.push({ name, url: `https://${name}.${sub}.workers.dev/admin`, account: accountId, createdAt: Date.now() });
  if (!s.saved) {
    s.tokenEnc = undefined;
    s.tokenTail = undefined;
  }
  s.state = "idle";
  s.pendingName = undefined;
  await st.saveState(env, chatId, s);

  const m = ui.buildSuccess(name, sub);
  await tg.sendMessage(env, chatId, m.text, m.kb);
}

/* ---------------- update existing panels ---------------- */
async function updatePanels(env: Env, chatId: number): Promise<void> {
  const s = await st.getState(env, chatId);
  if (!s.panels.length) {
    const m = ui.updateNoPanels();
    return void (await tg.sendMessage(env, chatId, m.text, m.kb));
  }
  if (!s.tokenEnc) {
    s.state = "await_token";
    await st.saveState(env, chatId, s);
    const m = ui.tokenPrompt();
    return void (await tg.sendMessage(env, chatId, m.text, m.kb));
  }
  await tg.sendMessage(env, chatId, ui.updateUpgrading(s.panels.length));
  try {
    const token = await decryptText(env.NIKA_SECRET, s.tokenEnc);
    const results: Array<{ name: string; ok: boolean }> = [];
    for (const p of s.panels) {
      try {
        const kvId = await cf.findKvId(token, p.account, [`nika-${p.name}-kv`, `${p.name}-kv`]);
        const bindings = kvId ? [{ type: "kv_namespace", name: "NIKA_KV", namespace_id: kvId }] : [];
        const up = await cf.uploadWorker(token, p.account, p.name, BUNDLE, bindings);
        if (!up.ok) { results.push({ name: p.name, ok: false }); continue; }
        await cf.enableWorkersDev(token, p.account, p.name);
        results.push({ name: p.name, ok: true });
      } catch {
        results.push({ name: p.name, ok: false });
      }
    }
    await tg.sendMessage(env, chatId, ui.updateDone(results));
  } catch (e: any) {
    await tg.sendMessage(env, chatId, ui.buildError(e?.message || String(e)));
  }
}

/* ---------------- callbacks ---------------- */
async function handleCallback(env: Env, cq: tg.TgCallbackQuery): Promise<void> {
  await tg.answerCallback(env, cq.id).catch(() => {});
  const chatId = cq.message?.chat?.id;
  if (!chatId) return;
  const data = cq.data || "";
  const s = await st.getState(env, chatId);

  if (data.startsWith("acc:")) {
    const i = parseInt(data.split(":")[1], 10);
    const acc = s.accounts?.[i];
    if (!acc) return;
    s.accountId = acc.id;
    s.state = "await_name";
    await st.saveState(env, chatId, s);
    return void (await tg.sendMessage(env, chatId, ui.namePrompt()));
  }

  switch (data) {
    case "menu": {
      s.state = "idle";
      await st.saveState(env, chatId, s);
      const m = ui.menu(s, cq.from?.first_name);
      return void (await tg.sendMessage(env, chatId, m.text, m.kb));
    }
    case "token": {
      s.state = "await_token";
      await st.saveState(env, chatId, s);
      const m = ui.tokenPrompt();
      return void (await tg.sendMessage(env, chatId, m.text, m.kb));
    }
    case "save_y": {
      if (!s.tokenEnc) return void (await tg.sendMessage(env, chatId, ui.badToken()));
      s.saved = true;
      s.state = "idle";
      await st.saveState(env, chatId, s);
      const m = ui.savedYes();
      return void (await tg.sendMessage(env, chatId, m.text, m.kb));
    }
    case "save_n": {
      s.saved = false;
      s.state = "idle";
      await st.saveState(env, chatId, s);
      const m = ui.savedNo();
      return void (await tg.sendMessage(env, chatId, m.text, m.kb));
    }
    case "build": {
      if (!s.tokenEnc) {
        s.state = "await_token";
        await st.saveState(env, chatId, s);
        const m = ui.tokenPrompt();
        return void (await tg.sendMessage(env, chatId, m.text, m.kb));
      }
      if (s.accounts && s.accounts.length > 1 && !s.accountId) {
        const m = ui.chooseAccount(s.accounts);
        return void (await tg.sendMessage(env, chatId, m.text, m.kb));
      }
      s.state = "await_name";
      await st.saveState(env, chatId, s);
      return void (await tg.sendMessage(env, chatId, ui.namePrompt()));
    }
    case "update": {
      return void (await updatePanels(env, chatId));
    }
    case "panels": {
      const m = ui.panelsList(s.panels);
      return void (await tg.sendMessage(env, chatId, m.text, m.kb));
    }
    case "settings": {
      const m = ui.settings(s);
      return void (await tg.sendMessage(env, chatId, m.text, m.kb));
    }
    case "del_token": {
      s.tokenEnc = undefined;
      s.tokenTail = undefined;
      s.saved = false;
      s.state = "idle";
      await st.saveState(env, chatId, s);
      const m = ui.settings(s);
      await tg.sendMessage(env, chatId, ui.tokenDeleted());
      return void (await tg.sendMessage(env, chatId, m.text, m.kb));
    }
    case "help": {
      const m = ui.help();
      return void (await tg.sendMessage(env, chatId, m.text, m.kb));
    }
    default:
      return;
  }
}
