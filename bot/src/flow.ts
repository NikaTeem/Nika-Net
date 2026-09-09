// Nika Net Launcher — the conversation state machine (Graphite + Neon edition).

import { Env } from "./types";
import * as tg from "./telegram";
import * as st from "./state";
import * as cf from "./cloudflare";
import * as ui from "./ui";
import * as panel from "./panel";
import * as fj from "./forcedjoin";
import { t, Lang } from "./i18n";
import { encryptText, decryptText } from "./crypto";
import { UserState, TokenRecord } from "./state";

declare const PANEL_BUNDLE: string;
const BUNDLE = PANEL_BUNDLE;
const GITHUB_RAW = "https://raw.githubusercontent.com/NikaTeem/Nika-Net/main";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const SPIN = ui.SPIN;
const RX_NAME = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
const RX_SUB = /^[a-z0-9][a-z0-9]{2,62}$/;
const BUILD_COOLDOWN = 300_000;

const L = (s: UserState): Lang => (s.lang === "en" ? "en" : "fa");
const randName = () => `nika-${1000 + Math.floor(Math.random() * 9000)}`;

/* ---------------- release / auto-announce 🚀 ---------------- */

function cmpVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

async function fetchLatestVersion(): Promise<{ version: string; notes?: string } | null> {
  try {
    const r = await fetch(`${GITHUB_RAW}/version.json`, { cf: { cacheTtl: 120 } } as RequestInit);
    if (!r.ok) return null;
    const j = (await r.json()) as { version?: string; notes?: string };
    if (!j.version) return null;
    return { version: j.version, notes: j.notes };
  } catch {
    return null;
  }
}

// the freshest panel bundle straight from the repo — keeps the bot
// version-agnostic: new panels & updates always deploy the latest build.
let bundleCache: { code: string; at: number } | null = null;
async function fetchLatestBundle(): Promise<string> {
  if (bundleCache && Date.now() - bundleCache.at < 300_000) return bundleCache.code;
  try {
    const r = await fetch(`${GITHUB_RAW}/dist/worker.js`, { cf: { cacheTtl: 300 } } as RequestInit);
    if (r.ok) {
      const t = await r.text();
      if (t.length > 10_000) {
        bundleCache = { code: t, at: Date.now() };
        return t;
      }
    }
  } catch {
    /* fall back to embedded bundle */
  }
  return BUNDLE;
}

async function announceUpdate(env: Env, version: string, notes: string): Promise<{ sent: number; total: number }> {
  const ids = await tg.listUserChatIds(env);
  const text = ui.updateAnnouncement(version, notes);
  const kb = tg.kb([[{ text: "🔄 بروزرسانی پنل‌ها", cb: "upd:all", color: "primary", emoji: false }]]);
  let sent = 0;
  for (const id of ids) {
    try {
      await tg.sendMessage(env, id, text, kb);
      sent++;
    } catch {
      /* skip blocked/unreachable */
    }
  }
  await env.BOT_KV.put("announcedVersion", version);
  return { sent, total: ids.length };
}

// compare repo version.json against the last announced version and, if a new
// release is out, push the update notification to every user (idempotent).
export async function announceLatest(
  env: Env
): Promise<{ announced: boolean; version: string; sent: number; total: number }> {
  const latest = await fetchLatestVersion();
  if (!latest) return { announced: false, version: "", sent: 0, total: 0 };
  const last = (await env.BOT_KV.get("announcedVersion")) || "";
  if (last && cmpVersion(last, latest.version) >= 0) {
    return { announced: false, version: latest.version, sent: 0, total: 0 };
  }
  const r = await announceUpdate(env, latest.version, latest.notes || "");
  return { announced: true, version: latest.version, ...r };
}

export async function handleScheduled(env: Env): Promise<void> {
  try {
    await announceLatest(env);
  } catch (e) {
    console.error("scheduled error", e);
  }
}

export async function handleUpdate(env: Env, update: tg.TgUpdate): Promise<void> {
  try {
    if (update.callback_query) return await handleCallback(env, update.callback_query);
    if (update.my_chat_member) return await fj.onBotChatMember(env, update.my_chat_member);
    if (update.chat_member) return await fj.onBotChatMember(env, update.chat_member);
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

/* ---------------- small helpers ---------------- */
async function reply(env: Env, chatId: number, msgId: number | undefined, text: string, kb?: tg.Kb): Promise<number | undefined> {
  if (msgId) {
    try {
      await tg.editMessage(env, chatId, msgId, text, kb);
      return msgId;
    } catch {
      /* fall through to send */
    }
  }
  const r = await tg.sendMessage(env, chatId, text, kb);
  return r?.result?.message_id as number | undefined;
}

async function withSpin<T>(
  env: Env, chatId: number, msgId: number, label: string,
  work: () => Promise<T>
): Promise<T> {
  let stop = false;
  const loop = (async () => {
    let i = 0;
    while (!stop) {
      await tg.editMessage(env, chatId, msgId, `${SPIN[i % SPIN.length]} ${label}`).catch(() => {});
      await sleep(400);
      i++;
    }
  })();
  const res = await work();
  stop = true;
  await loop.catch(() => {});
  return res;
}

async function staged(
  env: Env, chatId: number, msgId: number, title: string, stages: string[],
  work: (step: (i: number, ok?: boolean) => Promise<void>) => Promise<void>
): Promise<void> {
  const done = stages.map(() => false);
  let cur = 0;
  let frame = 0;
  const render = () =>
    `<b>${title}</b>\n\n` + stages.map((s, i) => `${done[i] ? "✅" : i === cur ? SPIN[frame % SPIN.length] : "▫️"} ${s}`).join("\n");
  await tg.editMessage(env, chatId, msgId, render()).catch(() => {});
  await work(async (i, ok) => {
    if (ok) done[i] = true;
    else cur = i;
    frame++;
    await tg.editMessage(env, chatId, msgId, render()).catch(() => {});
    await sleep(280);
  });
  frame++;
  await tg.editMessage(env, chatId, msgId, render()).catch(() => {});
}

/* ---------------- token helpers ---------------- */
function activeRec(s: UserState): TokenRecord | undefined {
  if (s.activeToken && s.tokens[s.activeToken]) return s.tokens[s.activeToken];
  if (s.tmp.ephemeral) return s.tmp.ephemeral as TokenRecord;
  return undefined;
}

async function decryptTok(env: Env, s: UserState): Promise<string | null> {
  const rec = activeRec(s);
  if (!rec) return null;
  try {
    return await decryptText(env.NIKA_SECRET, rec.enc);
  } catch {
    return null;
  }
}

async function setRecAccountId(s: UserState, rec: TokenRecord, i: number): Promise<boolean> {
  const acc = rec.accounts?.[i];
  if (!acc) return false;
  if (s.tmp.ephemeral && s.tmp.ephemeral === rec) {
    (s.tmp.ephemeral as TokenRecord).accountId = acc.id;
  } else {
    rec.accountId = acc.id;
  }
  return true;
}

/* ================================ MESSAGES ================================ */

async function handleMessage(env: Env, msg: tg.TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // track last-seen + name for the panel (throttled writes)
  await st.touchMeta(env, chatId, { firstName: msg.from?.first_name, lastName: msg.from?.last_name, username: msg.from?.username });

  // عضویت اجباری — gate every message (owner + exempt always pass, and the
  // "await_fj_chat" setup state is allowed so the owner can configure it).
  const pre = await st.getState(env, chatId);
  if (pre.state !== "await_fj_chat") {
    if (!(await fj.gateUser(env, chatId, L(pre)))) return;
  }

  if (text === "/start" || text.toLowerCase() === "start") {
    let owner = await st.getOwner(env);
    if (owner === null) { await st.setOwner(env, chatId); owner = chatId; }
    let s = await st.getState(env, chatId);
    s.state = "idle";
    await st.saveState(env, chatId, s);
    const fname = msg.from?.first_name || "";
    await tg.sendMessage(env, chatId, "⌨️", ui.replyMenu(s));
    const m = await tg.sendMessage(env, chatId, "🎨");
    const msgId = m?.result?.message_id as number | undefined;
    const intro = t(L(s), "w_hello", { n: ui.esc(fname) });
    if (msgId) {
      for (let i = 6; i <= intro.length; i += 6) {
        await tg.editMessage(env, chatId, msgId, `🎨 ${intro.slice(0, i)}▌`).catch(() => {});
        await sleep(70);
      }
      const mm = ui.mainMenu(s, fname, await isOwner(env, chatId));
      await tg.editMessage(env, chatId, msgId, mm.text, mm.kb).catch(() => {});
    }
    return;
  }

  if (text === "/menu") {
    const s = await st.getState(env, chatId);
    const m = ui.mainMenu(s, msg.from?.first_name, await isOwner(env, chatId));
    return void (await tg.sendMessage(env, chatId, m.text, m.kb));
  }

  if (text === "/lang") {
    const s = await st.getState(env, chatId);
    s.lang = s.lang === "fa" ? "en" : "fa";
    await st.saveState(env, chatId, s);
    await tg.sendMessage(env, chatId, "⌨️", ui.replyMenu(s));
    const m = ui.settingsMenu(s);
    return void (await tg.sendMessage(env, chatId, m.text, m.kb));
  }

  if (text === "/ping") {
    const s = await st.getState(env, chatId);
    const t0 = Date.now();
    const m = await tg.sendMessage(env, chatId, "🏓");
    const msgId = m?.result?.message_id as number | undefined;
    const ms = Date.now() - t0;
    if (msgId) await tg.editMessage(env, chatId, msgId, ui.pingResult(s, ms)).catch(() => {});
    return;
  }

  if (text.startsWith("/broadcast")) {
    const owner = await st.getOwner(env);
    const s = await st.getState(env, chatId);
    if (owner !== chatId) {
      return void (await tg.sendMessage(env, chatId, t(L(s), "owner_only")));
    }
    const payload = text.replace(/^\/broadcast\s*/, "").trim();
    if (!payload) {
      return void (await tg.sendMessage(env, chatId, t(L(s), "bc_help")));
    }
    await tg.sendMessage(env, chatId, t(L(s), "bc_sending"));
    const r = await broadcastAll(env, payload);
    return void (await tg.sendMessage(env, chatId, t(L(s), "bc_done", { sent: r.sent, total: r.total })));
  }

  // quick reply keyboard labels
  const rl = ui.REPLY_LABELS[text];
  if (rl) {
    const s = await st.getState(env, chatId);
    if (rl === "menu") {
      const m = ui.mainMenu(s, msg.from?.first_name, await isOwner(env, chatId));
      return void (await tg.sendMessage(env, chatId, m.text, m.kb));
    }
    if (rl === "panels") {
      const m = ui.panelsList(s, 0);
      return void (await tg.sendMessage(env, chatId, m.text, m.kb));
    }
    if (rl === "new") return await buildEntry(env, chatId, msg.message_id);
  }

  const s = await st.getState(env, chatId);
  switch (s.state) {
    case "await_token":
      return await inToken(env, chatId, msg.message_id, text);
    case "await_name":
      return await inName(env, chatId, text);
    case "await_subdomain":
      return await inSub(env, chatId, msg.message_id, text);
    case "await_panel_pass":
      return await inPanelPass(env, chatId, msg.message_id, text);
    case "await_uname":
      return await inUname(env, chatId, text);
    case "await_uquota":
      return await inUquota(env, chatId, text);
    case "await_uexp":
      return await inUexp(env, chatId, text);
    case "await_fj_chat":
      return await inFjChat(env, chatId, msg, text);
    default: {
      const m = ui.mainMenu(s, msg.from?.first_name, await isOwner(env, chatId));
      return void (await tg.sendMessage(env, chatId, m.text, m.kb));
    }
  }
}

/* ---------------- owner helpers ---------------- */
async function isOwner(env: Env, chatId: number): Promise<boolean> {
  return (await fj.ownerId(env)) === chatId;
}

/* ---------------- forced-join channel setup (owner) ---------------- */
async function inFjChat(env: Env, chatId: number, msg: tg.TgMessage, text: string): Promise<void> {
  const s = await st.getState(env, chatId);
  if (!(await isOwner(env, chatId))) {
    s.state = "idle";
    await st.saveState(env, chatId, s);
    return;
  }
  let raw: string | null = null;
  const fwd = msg as unknown as {
    forward_origin?: { chat?: { id?: number; type?: string } };
    forward_from_chat?: { id?: number };
  };
  if (fwd.forward_origin?.chat?.id) raw = String(fwd.forward_origin.chat.id);
  else if (fwd.forward_from_chat?.id) raw = String(fwd.forward_from_chat.id);
  else raw = text;

  const chat = fj.normalizeChat(raw || "");
  if (!chat) {
    return void (await tg.sendMessage(env, chatId, ui.fjBadChat(s)));
  }
  const check = await fj.checkBotAdmin(env, chat);
  if (!check.ok) {
    return void (await tg.sendMessage(env, chatId, ui.fjCantSee(s, chat)));
  }
  const cfg = await fj.getConfig(env);
  cfg.chats = Array.from(new Set([...cfg.chats, chat]));
  cfg.enabled = true;
  await fj.saveConfig(env, cfg);
  s.state = "idle";
  await st.saveState(env, chatId, s);
  await tg.sendMessage(env, chatId, ui.fjSetOk(s, chat));
  const meta = await fj.botMeta(env);
  const m = ui.ownerMenu(s, meta);
  await tg.sendMessage(env, chatId, m.text, m.kb);
}

/* ---------------- token input ---------------- */
async function inToken(env: Env, chatId: number, msgId: number | undefined, raw: string): Promise<void> {
  let s = await st.getState(env, chatId);
  const token = raw.replace(/[“”"'`]/g, "").trim();
  if (token.length < 20) {
    return void (await tg.sendMessage(env, chatId, ui.badToken(s)));
  }
  if (msgId) await tg.deleteMessage(env, chatId, msgId).catch(() => {});
  const wait = await tg.sendMessage(env, chatId, ui.checking(s));
  const waitId = wait?.result?.message_id as number | undefined;

  const res = await (waitId
    ? withSpin(env, chatId, waitId, t(L(s), "tok_checking"), () => cf.verifyAndListAccounts(token))
    : cf.verifyAndListAccounts(token));

  s = await st.getState(env, chatId);
  if (!res.ok || !res.accounts.length) {
    const text = ui.tokenInvalid(s, res.err);
    if (waitId) await tg.editMessage(env, chatId, waitId, text).catch(() => {});
    else await tg.sendMessage(env, chatId, text);
    return;
  }

  let n = Object.keys(s.tokens).length + 1;
  while (s.tokens[`t${n}`]) n++;
  const tid = `t${n}`;
  const rec: TokenRecord = {
    name: res.accounts.length === 1 ? res.accounts[0].name : `Token ${n}`,
    enc: await encryptText(env.NIKA_SECRET, token),
    tail: token.slice(-4),
    accounts: res.accounts,
    accountId: res.accounts.length === 1 ? res.accounts[0].id : undefined,
    created: Date.now(),
  };
  s.tokens[tid] = rec;
  s.activeToken = tid;
  s.state = "await_save";
  await st.saveState(env, chatId, s);

  const q = ui.saveQuestion(s, res.accounts[0].name, res.accounts.length);
  if (waitId) await tg.editMessage(env, chatId, waitId, q.text, q.kb).catch(() => {});
  else await tg.sendMessage(env, chatId, q.text, q.kb);
}

async function afterSave(env: Env, chatId: number, msgId: number | undefined, saved: boolean): Promise<void> {
  const s = await st.getState(env, chatId);
  if (!saved) {
    const rec = s.activeToken ? s.tokens[s.activeToken] : undefined;
    if (rec && s.activeToken) delete s.tokens[s.activeToken];
    if (s.tmp.after_token === "build" && rec) s.tmp.ephemeral = rec;
    else if (s.tmp.after_token === "updall" && rec) s.tmp.ephemeral = rec;
    s.activeToken = Object.keys(s.tokens)[0];
  }
  s.state = "idle";
  const nxt = s.tmp.after_token as string | undefined;
  delete s.tmp.after_token;
  await st.saveState(env, chatId, s);
  if (nxt === "build") return await buildEntry(env, chatId, msgId);
  if (nxt === "updall") return await updateAll(env, chatId, msgId);
  const m = ui.tokensMenu(s);
  await reply(env, chatId, msgId, m.text, m.kb);
}

/* ---------------- build flow 🚀 ---------------- */
async function buildEntry(env: Env, chatId: number, msgId?: number): Promise<void> {
  const s = await st.getState(env, chatId);

  if (!activeRec(s)) {
    s.state = "await_token";
    s.tmp.after_token = "build";
    await st.saveState(env, chatId, s);
    const m = ui.tokenPrompt(s);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (Date.now() - s.lastBuild < BUILD_COOLDOWN) {
    const left = Math.floor((BUILD_COOLDOWN - (Date.now() - s.lastBuild)) / 60000) + 1;
    return void (await tg.sendMessage(env, chatId, ui.cooldown(s, left)));
  }
  const rec = activeRec(s)!;
  if (rec.accounts.length > 1 && !rec.accountId) {
    const m = ui.chooseAccount(s, rec.accounts);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  s.state = "await_name";
  s.tmp.suggest = undefined;
  await st.saveState(env, chatId, s);
  const m = ui.namePrompt(s);
  await reply(env, chatId, msgId, m.text, m.kb);
}

async function inName(env: Env, chatId: number, raw: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const name = raw.trim().toLowerCase();
  if (!RX_NAME.test(name) || s.panels.some((p) => p.name === name)) {
    return void (await tg.sendMessage(env, chatId, ui.invalidName(s)));
  }
  s.tmp.name = name;
  s.state = "idle";
  await st.saveState(env, chatId, s);
  await buildConfirmStep(env, chatId, undefined);
}

async function inSub(env: Env, chatId: number, msgId: number | undefined, raw: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const sub = raw.trim().toLowerCase();
  if (!RX_SUB.test(sub)) {
    return void (await tg.sendMessage(env, chatId, ui.invalidSub(s)));
  }
  const rec = activeRec(s);
  const tok = await decryptTok(env, s);
  const accountId = rec?.accountId || rec?.accounts?.[0]?.id;
  if (!rec || !tok || !accountId) {
    s.state = "await_token";
    s.tmp.after_token = "build";
    await st.saveState(env, chatId, s);
    const m = ui.tokenPrompt(s);
    return void (await tg.sendMessage(env, chatId, m.text, m.kb));
  }
  const wait = await tg.sendMessage(env, chatId, ui.checking(s));
  const waitId = wait?.result?.message_id as number | undefined;
  const r = await cf.registerSubdomain(tok, accountId, sub);
  if (!r.ok) {
    const err = t(L(s), "err_cf", { e: ui.esc(r.err || "?") });
    if (waitId) await tg.editMessage(env, chatId, waitId, err).catch(() => {});
    else await tg.sendMessage(env, chatId, err);
    return;
  }
  if (waitId) await tg.deleteMessage(env, chatId, waitId).catch(() => {});
  s.tmp.sub = sub;
  s.state = "idle";
  await st.saveState(env, chatId, s);
  await buildConfirmStep(env, chatId, undefined);
}

async function buildConfirmStep(env: Env, chatId: number, msgId?: number): Promise<void> {
  const s = await st.getState(env, chatId);
  const rec = activeRec(s);
  const tok = await decryptTok(env, s);
  const name = s.tmp.name as string | undefined;
  const accountId = rec?.accountId || rec?.accounts?.[0]?.id;
  if (!rec || !tok || !name || !accountId) {
    s.state = "await_token";
    s.tmp.after_token = "build";
    await st.saveState(env, chatId, s);
    const m = ui.tokenPrompt(s);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  const wait = await tg.sendMessage(env, chatId, ui.checking(s));
  const waitId = wait?.result?.message_id as number | undefined;

  const sub = await (waitId
    ? withSpin(env, chatId, waitId, t(L(s), "st_conn"), () => cf.getSubdomain(tok, accountId))
    : cf.getSubdomain(tok, accountId));

  if (!sub) {
    s.state = "await_subdomain";
    await st.saveState(env, chatId, s);
    const txt = ui.needSubdomain(s);
    if (waitId) await tg.editMessage(env, chatId, waitId, txt).catch(() => {});
    else await tg.sendMessage(env, chatId, txt);
    return;
  }
  s.tmp.sub = sub;
  await st.saveState(env, chatId, s);
  const accName = rec.accounts.find((a) => a.id === accountId)?.name || "?";
  const url = `https://${name}.${sub}.workers.dev/admin`;
  const m = ui.buildConfirm(s, { name, accountName: accName, url, ver: ui.VERSION });
  if (waitId) await tg.editMessage(env, chatId, waitId, m.text, m.kb).catch(() => {});
  else await tg.sendMessage(env, chatId, m.text, m.kb);
}

async function doBuild(env: Env, chatId: number, msgId: number): Promise<void> {
  const s = await st.getState(env, chatId);
  if (Date.now() - s.lastBuild < BUILD_COOLDOWN) {
    const left = Math.floor((BUILD_COOLDOWN - (Date.now() - s.lastBuild)) / 60000) + 1;
    return void (await tg.sendMessage(env, chatId, ui.cooldown(s, left)));
  }
  const rec = activeRec(s);
  const tok = await decryptTok(env, s);
  const name = s.tmp.name as string | undefined;
  const sub = s.tmp.sub as string | undefined;
  const accountId = rec?.accountId || rec?.accounts?.[0]?.id;
  if (!rec || !tok || !name || !sub || !accountId) {
    return void (await tg.sendMessage(env, chatId, "❌"));
  }

  const stages = [t(L(s), "st_kv"), t(L(s), "st_up"), t(L(s), "st_ver"), t(L(s), "st_save")];
  try {
    await staged(env, chatId, msgId, `🚀 «${name}»`, stages, async (step) => {
      await step(0);
      const kvId = await cf.createKvNamespace(tok, accountId, `nika-${name}-kv`);
      if (!kvId) throw new Error("KV namespace failed");
      await step(0, true);

      await step(1);
      const up = await cf.uploadWorker(tok, accountId, name, await fetchLatestBundle(), [
        { type: "kv_namespace", name: "NIKA_KV", namespace_id: kvId },
      ]);
      if (!up.ok) throw new Error(up.err || "upload failed");
      await cf.enableWorkersDev(tok, accountId, name);
      await step(1, true);

      await step(2);
      const base = `https://${name}.${sub}.workers.dev`;
      const h = await panel.panelHealth(base);
      await step(2, true);

      await step(3);
      const accName = rec.accounts.find((a) => a.id === accountId)?.name || "?";
      if (!s.panels.some((p) => p.name === name)) {
        s.panels.push({
          name, url: `${base}/admin`, base, account: accountId, accountName: accName,
          kvId, bundleVer: ui.VERSION, createdAt: Date.now(), health: h,
        });
      }
      s.lastBuild = Date.now();
      s.builds += 1;
      delete s.tmp.name;
      delete s.tmp.sub;
      delete s.tmp.ephemeral;
      await st.saveState(env, chatId, s);
      await step(3, true);
    });
  } catch (e: any) {
    const txt = ui.buildError(s, e?.message || String(e));
    await tg.editMessage(env, chatId, msgId, txt, tg.kb([[{ text: t(L(s), "back"), cb: "menu:main", color: "gray", emoji: false }]])).catch(() => {});
    return;
  }

  const fresh = await st.getState(env, chatId);
  if (!fresh.panels.some((p) => p.name === name)) return; // failed
  const m = ui.buildSuccess(fresh, name, sub);
  await tg.editMessage(env, chatId, msgId, m.text, m.kb).catch(() => {});
}

/* ---------------- update all 🔄 ---------------- */
async function updateAll(env: Env, chatId: number, msgId?: number): Promise<void> {
  const s = await st.getState(env, chatId);
  if (!s.panels.length) {
    const m = { text: t(L(s), "upd_all_none"), kb: tg.kb([[{ text: t(L(s), "b_new"), cb: "do:build", color: "success", emoji: false }], [{ text: t(L(s), "back"), cb: "menu:main", color: "gray", emoji: false }]]) };
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  const tok = await decryptTok(env, s);
  if (!tok) {
    s.state = "await_token";
    s.tmp.after_token = "updall";
    await st.saveState(env, chatId, s);
    const m = ui.tokenPrompt(s);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  const wait = await tg.sendMessage(env, chatId, t(L(s), "upd_all_upgrading", { n: s.panels.length }));
  const waitId = wait?.result?.message_id as number | undefined;
  const results: Array<{ name: string; ok: boolean }> = [];
  for (const p of s.panels) {
    try {
      const kvId = p.kvId || (await cf.findKvId(tok, p.account, [`nika-${p.name}-kv`, `${p.name}-kv`]));
      const bindings = kvId ? [{ type: "kv_namespace", name: "NIKA_KV", namespace_id: kvId }] : [];
      const up = await cf.uploadWorker(tok, p.account, p.name, await fetchLatestBundle(), bindings);
      if (!up.ok) {
        results.push({ name: p.name, ok: false });
        continue;
      }
      await cf.enableWorkersDev(tok, p.account, p.name);
      results.push({ name: p.name, ok: true });
    } catch {
      results.push({ name: p.name, ok: false });
    }
  }
  const okCount = results.filter((r) => r.ok).length;
  delete s.tmp.ephemeral;
  await st.saveState(env, chatId, s);
  const text = `🔄 <b>${t(L(s), "upd_all_done", { ok: okCount, all: results.length })}</b>\n\n${results.map((r) => `${r.ok ? "✅" : "❌"} <code>${ui.esc(r.name)}</code>`).join("\n")}`;
  if (waitId) await tg.editMessage(env, chatId, waitId, text).catch(() => {});
  else await tg.sendMessage(env, chatId, text);
}

/* ---------------- per-panel update / delete ---------------- */
function tokForPanel(s: UserState, accountId: string): TokenRecord | null {
  for (const rec of Object.values(s.tokens)) {
    if (rec.accounts.some((a) => a.id === accountId)) return rec;
  }
  if (s.tmp.ephemeral && (s.tmp.ephemeral as TokenRecord).accounts.some((a) => a.id === accountId)) {
    return s.tmp.ephemeral as TokenRecord;
  }
  return null;
}

async function panelUpdate(env: Env, chatId: number, msgId: number, name: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const p = s.panels.find((x) => x.name === name);
  const pair = p ? tokForPanel(s, p.account) : null;
  if (!p || !pair) {
    await tg.sendMessage(env, chatId, t(L(s), "tok_none"));
    return;
  }
  const token = await decryptText(env.NIKA_SECRET, pair.enc);
  const stages = [t(L(s), "st_up"), t(L(s), "st_ver")];
  try {
    await staged(env, chatId, msgId, `🔄 «${name}»`, stages, async (step) => {
      await step(0);
      const kvId = p.kvId || (await cf.findKvId(token, p.account, [`nika-${name}-kv`, `${name}-kv`]));
      const bindings = kvId ? [{ type: "kv_namespace", name: "NIKA_KV", namespace_id: kvId }] : [];
      const up = await cf.uploadWorker(token, p.account, p.name, await fetchLatestBundle(), bindings);
      if (!up.ok) throw new Error(up.err || "upload failed");
      await cf.enableWorkersDev(token, p.account, p.name);
      await step(0, true);
      await step(1);
      const h = await panel.panelHealth(p.base);
      p.health = h;
      p.bundleVer = ui.VERSION;
      await st.saveState(env, chatId, s);
      await step(1, true);
    });
  } catch (e: any) {
    const txt = ui.buildError(s, e?.message || String(e));
    await tg.editMessage(env, chatId, msgId, txt).catch(() => {});
    return;
  }
  await tg.sendMessage(env, chatId, ui.makeText("✅", t(L(s), "pd_upd_ok", { n: name, ver: ui.VERSION }), null, null, "ok"));
  const m = ui.panelDetail(s, name);
  await tg.sendMessage(env, chatId, m.text, m.kb);
}

async function panelDelete(env: Env, chatId: number, msgId: number, name: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const p = s.panels.find((x) => x.name === name);
  const pair = p ? tokForPanel(s, p.account) : null;
  if (!p || !pair) {
    await tg.sendMessage(env, chatId, t(L(s), "tok_none"));
    return;
  }
  const token = await decryptText(env.NIKA_SECRET, pair.enc);
  const stages = [t(L(s), "st_delw"), t(L(s), "st_delk")];
  let note = "";
  try {
    await staged(env, chatId, msgId, `🗑 «${name}»`, stages, async (step) => {
      await step(0);
      const w = await cf.deleteWorker(token, p.account, p.name);
      if (!w.ok) note += `\n⚠️ worker: ${ui.esc(w.err || "?")}`;
      await step(0, true);
      await step(1);
      if (p.kvId) {
        const k = await cf.deleteKvNamespace(token, p.account, p.kvId);
        if (!k.ok) note += `\n⚠️ KV: ${ui.esc(k.err || "?")}`;
      }
      await step(1, true);
    });
  } catch (e: any) {
    note += `\n⚠️ ${ui.esc(e?.message || String(e))}`;
  }
  s.panels = s.panels.filter((x) => x.name !== name);
  delete s.panelAuth[name];
  await st.saveState(env, chatId, s);
  await tg.sendMessage(env, chatId, t(L(s), "pd_del_ok", { n: name }) + note);
  const m = ui.panelsList(s, 0);
  await tg.sendMessage(env, chatId, m.text, m.kb);
}

/* ---------------- health check 💚 ---------------- */
async function healthAll(env: Env, chatId: number, msgId: number): Promise<void> {
  const s = await st.getState(env, chatId);
  const wait = await tg.sendMessage(env, chatId, `⠋ ${t(L(s), "pan_checking")}`);
  const waitId = wait?.result?.message_id as number | undefined;
  if (waitId) {
    await withSpin(env, chatId, waitId, t(L(s), "pan_checking"), async () => {
      const results = await Promise.all(s.panels.map(async (p) => ({ p, h: await panel.panelHealth(p.base) })));
      for (const { p, h } of results) p.health = h;
      await st.saveState(env, chatId, s);
      return results;
    });
    const okN = s.panels.filter((p) => p.health?.ok).length;
    await tg.editMessage(env, chatId, waitId, `💚 ${t(L(s), "pan_summary", { ok: okN, all: s.panels.length })}`).catch(() => {});
  }
  const m = ui.panelsList(s, 0);
  await tg.sendMessage(env, chatId, m.text, m.kb);
}

/* ---------------- panel users 👥 ---------------- */
async function psession(env: Env, s: UserState, pname: string): Promise<{ ok: boolean; err: string; base: string; cookie: string }> {
  const p = s.panels.find((x) => x.name === pname);
  if (!p) return { ok: false, err: "?", base: "", cookie: "" };
  const a = s.panelAuth[pname];
  if (!a) return { ok: false, err: "nopass", base: p.base, cookie: "" };
  try {
    const pw = await decryptText(env.NIKA_SECRET, a.enc);
    const r = await panel.panelLogin(p.base, pw);
    return { ok: r.ok, err: r.err, base: p.base, cookie: r.cookie };
  } catch {
    return { ok: false, err: "badenc", base: p.base, cookie: "" };
  }
}

async function usersEntry(env: Env, chatId: number, msgId: number | undefined, pname: string, page: number): Promise<void> {
  const s = await st.getState(env, chatId);
  s.tmp.upanel = pname;
  const sess = await psession(env, s, pname);
  if (!sess.ok) {
    s.state = "await_panel_pass";
    s.tmp.ppanel = pname;
    await st.saveState(env, chatId, s);
    const m = ui.askPanelPass(s, pname);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  const r = await panel.panelApi(sess.base, sess.cookie, "GET", "/api/users");
  if (r.status !== 200 || !Array.isArray(r.json)) {
    const e = typeof r.json === "object" && r.json?.error ? r.json.error : `HTTP ${r.status}`;
    const txt = ui.makeText("⛔", t(L(s), "err_net", { e: ui.esc(e) }), null, null, "danger");
    return void (await reply(env, chatId, msgId, txt, tg.kb([[{ text: t(L(s), "back"), cb: `panel:${pname}`, color: "gray", emoji: false }]])));
  }
  s.tmp.upage = page;
  await st.saveState(env, chatId, s);
  const m = ui.usersList(s, pname, r.json, page);
  await reply(env, chatId, msgId, m.text, m.kb);
}

async function inPanelPass(env: Env, chatId: number, msgId: number | undefined, raw: string): Promise<void> {
  let s = await st.getState(env, chatId);
  const pname = s.tmp.ppanel as string | undefined;
  const p = pname ? s.panels.find((x) => x.name === pname) : undefined;
  if (!p) {
    s.state = "idle";
    await st.saveState(env, chatId, s);
    return;
  }
  if (msgId) await tg.deleteMessage(env, chatId, msgId).catch(() => {});
  const wait = await tg.sendMessage(env, chatId, ui.checking(s));
  const waitId = wait?.result?.message_id as number | undefined;
  const r = await (waitId
    ? withSpin(env, chatId, waitId, t(L(s), "tok_checking"), () => panel.panelLogin(p.base, raw))
    : panel.panelLogin(p.base, raw));
  s = await st.getState(env, chatId);
  if (!r.ok) {
    const txt = ui.makeText("❌", t(L(s), "a_bad"), null, null, "danger");
    if (waitId) await tg.editMessage(env, chatId, waitId, txt).catch(() => {});
    else await tg.sendMessage(env, chatId, txt);
    return;
  }
  s.panelAuth[p.name] = { enc: await encryptText(env.NIKA_SECRET, raw), saved: false };
  s.state = "idle";
  await st.saveState(env, chatId, s);
  const q = {
    text: ui.makeText("🔐", t(L(s), "a_ok"), t(L(s), "a_save_q"), null, "ok"),
    kb: tg.kb([
      [{ text: t(L(s), "a_yes"), cb: "asave:y", color: "success", emoji: false }],
      [{ text: t(L(s), "a_no"), cb: "asave:n", color: "gray", emoji: false }],
    ]),
  };
  if (waitId) await tg.editMessage(env, chatId, waitId, q.text, q.kb).catch(() => {});
  else await tg.sendMessage(env, chatId, q.text, q.kb);
}

async function inUname(env: Env, chatId: number, raw: string): Promise<void> {
  const s = await st.getState(env, chatId);
  s.tmp.uname = raw.trim().slice(0, 40) || "user";
  s.state = "await_uquota";
  await st.saveState(env, chatId, s);
  await tg.sendMessage(env, chatId, t(L(s), "u_ask_quota"));
}

async function inUquota(env: Env, chatId: number, raw: string): Promise<void> {
  const s = await st.getState(env, chatId);
  if (!/^\d+$/.test(raw.trim())) return void (await tg.sendMessage(env, chatId, ui.badNum(s)));
  s.tmp.uquota = parseInt(raw.trim(), 10);
  s.state = "await_uexp";
  await st.saveState(env, chatId, s);
  await tg.sendMessage(env, chatId, t(L(s), "u_ask_exp"));
}

async function inUexp(env: Env, chatId: number, raw: string): Promise<void> {
  const s = await st.getState(env, chatId);
  if (!/^\d+$/.test(raw.trim())) return void (await tg.sendMessage(env, chatId, ui.badNum(s)));
  const pname = s.tmp.upanel as string | undefined;
  const sess = pname ? await psession(env, s, pname) : null;
  if (!pname || !sess || !sess.ok) {
    s.state = "idle";
    await st.saveState(env, chatId, s);
    return void (await tg.sendMessage(env, chatId, t(L(s), "a_bad")));
  }
  const r = await panel.panelApi(sess.base, sess.cookie, "POST", "/api/users", {
    name: s.tmp.uname || "user",
    quota: s.tmp.uquota ?? 50,
    days: parseInt(raw.trim(), 10),
  });
  s.state = "idle";
  await st.saveState(env, chatId, s);
  if (r.status !== 200 || !r.json?.id) {
    const e = typeof r.json === "object" && r.json?.error ? r.json.error : `HTTP ${r.status}`;
    return void (await tg.sendMessage(env, chatId, t(L(s), "err_net", { e: ui.esc(e) })));
  }
  const links = ui.subLinks(sess.base, r.json);
  const kb = tg.kb([
    [
      { text: t(L(s), "sub_link"), url: links.base64, color: "primary", emoji: false },
      { text: t(L(s), "u_copy"), copy: links.base64, color: "gray", emoji: false },
    ],
    [{ text: t(L(s), "back"), cb: `users:${pname}:${s.tmp.upage || 0}`, color: "gray", emoji: false }],
  ]);
  await tg.sendMessage(env, chatId, ui.party([
    `<b>${t(L(s), "u_created", { n: ui.esc(r.json.name) })}</b>`,
    `📡 <code>${ui.esc(links.base64)}</code>`,
  ]), kb);
}

async function userDelete(env: Env, chatId: number, msgId: number, userId: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const pname = s.tmp.upanel as string | undefined;
  const sess = pname ? await psession(env, s, pname) : null;
  if (!pname || !sess || !sess.ok) {
    return void (await tg.sendMessage(env, chatId, t(L(s), "a_bad")));
  }
  const r = await panel.panelApi(sess.base, sess.cookie, "DELETE", `/api/users?id=${encodeURIComponent(userId)}`);
  if (r.status !== 200) {
    await tg.sendMessage(env, chatId, t(L(s), "err_net", { e: `HTTP ${r.status}` }));
  } else {
    await tg.sendMessage(env, chatId, t(L(s), "u_del_ok", { n: userId.slice(0, 8) }));
  }
  await usersEntry(env, chatId, msgId, pname, s.tmp.upage || 0);
}

async function udetail(env: Env, chatId: number, msgId: number, userId: string): Promise<void> {
  const s = await st.getState(env, chatId);
  const pname = s.tmp.upanel as string | undefined;
  const sess = pname ? await psession(env, s, pname) : null;
  if (!pname || !sess || !sess.ok) {
    s.state = "await_panel_pass";
    s.tmp.ppanel = pname;
    await st.saveState(env, chatId, s);
    const m = ui.askPanelPass(s, pname || "?");
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  const r = await panel.panelApi(sess.base, sess.cookie, "GET", "/api/users");
  const x = Array.isArray(r.json) ? r.json.find((i: any) => i.id === userId) : undefined;
  if (!x) return;
  const m = ui.userDetail(s, pname, x, s.tmp.upage || 0);
  await reply(env, chatId, msgId, m.text, m.kb);
}

/* ================================ CALLBACKS ================================ */

async function navMenu(env: Env, chatId: number, msgId: number, name: string, firstName?: string): Promise<void> {
  const s = await st.getState(env, chatId);
  let m: { text: string; kb: tg.Kb };
  switch (name) {
    case "tokens": m = ui.tokensMenu(s); break;
    case "settings": m = ui.settingsMenu(s); break;
    case "help": m = ui.helpMenu(s); break;
    case "owner": m = ui.ownerMenu(s, await fj.botMeta(env)); break;
    default: m = ui.mainMenu(s, firstName, await isOwner(env, chatId));
  }
  await reply(env, chatId, msgId, m.text, m.kb);
}

async function handleCallback(env: Env, cq: tg.TgCallbackQuery): Promise<void> {
  const chatId = cq.message?.chat?.id;
  const msgId = cq.message?.message_id;
  const data = cq.data || "";
  if (!chatId || !msgId) return;
  const s = await st.getState(env, chatId);
  const firstName = cq.from?.first_name;

  // عضویت اجباری — verify button (always reachable while blocked)
  if (data === "fj:verify") {
    const cfg = await fj.getConfig(env);
    if (!cfg.enabled || !cfg.chats.length) {
      return void (await tg.answerCallback(env, cq.id).catch(() => {}));
    }
    const joined = await fj.verifyAndAnswer(env, chatId, cfg, cq.id, L(s));
    if (joined) {
      const wmsg = cfg.verifyMessage?.trim() || t(L(s), "fj_welcome");
      await tg.sendMessage(env, chatId, wmsg).catch(() => {});
      const m = ui.mainMenu(s, firstName, await isOwner(env, chatId));
      await tg.sendMessage(env, chatId, m.text, m.kb);
    }
    return;
  }

  // gate every other callback for non-members
  if (!(await fj.gateUser(env, chatId, L(s)))) return;

  if (data === "noop") return void (await tg.answerCallback(env, cq.id).catch(() => {}));
  if (data === "menu:close") {
    await tg.deleteMessage(env, chatId, msgId).catch(() => {});
    return void (await tg.answerCallback(env, cq.id, "👋").catch(() => {}));
  }
  if (data.startsWith("menu:")) {
    const name = data.split(":")[1];
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await navMenu(env, chatId, msgId, name, firstName);
  }

  /* ---------- forced join (owner) ---------- */
  if (data === "fj:setchat") {
    if (!(await isOwner(env, chatId))) return void (await tg.answerCallback(env, cq.id).catch(() => {}));
    s.state = "await_fj_chat";
    await st.saveState(env, chatId, s);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await tg.sendMessage(env, chatId, ui.fjAskChat(s)));
  }
  if (data === "fj:status") {
    const cfg = await fj.getConfig(env);
    const m = ui.fjStatusMenu(s, {
      enabled: cfg.enabled, chats: cfg.chats, mode: cfg.mode,
      recheckHours: cfg.recheckHours, exempt: cfg.exempt,
      chatMeta: cfg.chatMeta, applyTo: cfg.applyTo, legacy: cfg.legacy,
    });
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }

  /* ---------- build ---------- */
  if (data === "do:build") {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await buildEntry(env, chatId, msgId);
  }
  if (data === "do:buildyes") {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await doBuild(env, chatId, msgId);
  }
  if (data === "do:randname") {
    let sug = randName();
    while (s.panels.some((p) => p.name === sug)) sug = randName();
    s.tmp.suggest = sug;
    await st.saveState(env, chatId, s);
    const m = ui.namePrompt(s, sug);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data === "do:usesuggest") {
    let sug = (s.tmp.suggest as string | undefined) || randName();
    if (!RX_NAME.test(sug) || s.panels.some((p) => p.name === sug)) sug = randName();
    s.tmp.name = sug;
    s.state = "idle";
    await st.saveState(env, chatId, s);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await buildConfirmStep(env, chatId, msgId);
  }

  /* ---------- token ---------- */
  if (data === "tok:add") {
    s.state = "await_token";
    delete s.tmp.after_token;
    await st.saveState(env, chatId, s);
    const m = ui.tokenPrompt(s);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("tok:use:")) {
    const tid = data.split(":")[2];
    if (s.tokens[tid]) {
      s.activeToken = tid;
      delete s.tmp.ephemeral;
      await st.saveState(env, chatId, s);
      await tg.answerCallback(env, cq.id, t(L(s), "tok_switch", { n: ui.esc(s.tokens[tid].name) })).catch(() => {});
    }
    const m = ui.tokensMenu(s);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("tok:del:")) {
    const tid = data.split(":")[2];
    const tk = s.tokens[tid];
    if (!tk) return void (await tg.answerCallback(env, cq.id).catch(() => {}));
    const m = ui.confirmMenu(L(s), `tok:delgo:${tid}`, "menu:tokens", t(L(s), "tok_del_q", { n: ui.esc(tk.name) }));
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("tok:delgo:")) {
    const tid = data.split(":")[2];
    const tk = s.tokens[tid];
    delete s.tokens[tid];
    if (s.activeToken === tid) s.activeToken = Object.keys(s.tokens)[0];
    await st.saveState(env, chatId, s);
    await tg.answerCallback(env, cq.id, t(L(s), "tok_deleted", { n: tk?.name || "?" })).catch(() => {});
    const m = ui.tokensMenu(s);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data === "save_y" || data === "save_n") {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await afterSave(env, chatId, msgId, data === "save_y");
  }

  /* ---------- account ---------- */
  if (data.startsWith("acc:")) {
    const i = parseInt(data.split(":")[1], 10);
    const rec = activeRec(s);
    if (!rec || !(await setRecAccountId(s, rec, i))) {
      return void (await tg.answerCallback(env, cq.id, "❌", true).catch(() => {}));
    }
    s.state = "await_name";
    s.tmp.suggest = undefined;
    await st.saveState(env, chatId, s);
    await tg.answerCallback(env, cq.id).catch(() => {});
    const m = ui.namePrompt(s);
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }

  /* ---------- settings ---------- */
  if (data === "do:lang") {
    s.lang = s.lang === "fa" ? "en" : "fa";
    await st.saveState(env, chatId, s);
    await tg.sendMessage(env, chatId, "⌨️", ui.replyMenu(s));
    const m = ui.settingsMenu(s);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data === "do:getbundle") {
    await tg.answerCallback(env, cq.id, "📦").catch(() => {});
    await tg.sendDocument(env, chatId, "worker.js", BUNDLE).catch(() => {});
    return;
  }
  if (data === "do:skin") {
    const m = ui.skinsMenu(s);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("skin:")) {
    const id = data.slice(5);
    s.skin = id === "neon" || id === "paper" ? id : "graphite";
    await st.saveState(env, chatId, s);
    const m = ui.skinsMenu(s);
    await tg.answerCallback(env, cq.id, ui.SKINS[s.skin].lit).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }

  /* ---------- panels ---------- */
  if (data.startsWith("panels:")) {
    const pg = parseInt(data.split(":")[1], 10) || 0;
    const m = ui.panelsList(s, pg);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("panel:")) {
    const m = ui.panelDetail(s, data.slice("panel:".length));
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("pupd:")) {
    const name = data.slice(5);
    const m = ui.confirmMenu(L(s), `pupdgo:${name}`, `panel:${name}`, t(L(s), "pd_upd_q", { n: ui.esc(name) }));
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("pupdgo:")) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await panelUpdate(env, chatId, msgId, data.slice(7));
  }
  if (data.startsWith("pdel:")) {
    const name = data.slice(5);
    const m = ui.confirmMenu(L(s), `pdelgo:${name}`, `panel:${name}`, t(L(s), "pd_del_q", { n: ui.esc(name) }));
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("pdelgo:")) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await panelDelete(env, chatId, msgId, data.slice(7));
  }
  if (data.startsWith("pusers:")) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await usersEntry(env, chatId, msgId, data.slice(7), 0);
  }

  /* ---------- update all ---------- */
  if (data === "upd:all") {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await updateAll(env, chatId, msgId);
  }

  /* ---------- health ---------- */
  if (data === "do:health") {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await healthAll(env, chatId, msgId);
  }

  /* ---------- users ---------- */
  if (data === "do:users") {
    if (!s.panels.length) {
      const m = ui.panelsList(s, 0);
      await tg.answerCallback(env, cq.id).catch(() => {});
      return void (await reply(env, chatId, msgId, m.text, m.kb));
    }
    if (s.panels.length === 1) {
      await tg.answerCallback(env, cq.id).catch(() => {});
      return await usersEntry(env, chatId, msgId, s.panels[0].name, 0);
    }
    const rows: tg.Btn[][] = s.panels.map((p) => [{ text: `${ui.healthDot(p)} ${ui.esc(p.name)}`, cb: `pusers:${p.name}`, color: "primary", emoji: false }]);
    rows.push([{ text: t(L(s), "back"), cb: "menu:main", color: "gray", emoji: false }]);
    const m = { text: ui.makeText("👥", "👇", t(L(s), "choose"), null, "users"), kb: tg.kb(rows) };
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("users:")) {
    const parts = data.split(":");
    const name = parts[1];
    const page = parseInt(parts[2], 10) || 0;
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await usersEntry(env, chatId, msgId, name, page);
  }
  if (data.startsWith("user:")) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await udetail(env, chatId, msgId, data.slice(5));
  }
  if (data.startsWith("udel:")) {
    const userId = data.slice(5);
    const m = ui.confirmMenu(L(s), `udelgo:${userId}`, `users:${s.tmp.upanel}:${s.tmp.upage || 0}`, t(L(s), "u_del_q", { n: userId.slice(0, 8) }));
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data.startsWith("udelgo:")) {
    await tg.answerCallback(env, cq.id).catch(() => {});
    return await userDelete(env, chatId, msgId, data.slice(7));
  }
  if (data.startsWith("unew:")) {
    const pname = data.slice(5);
    s.tmp.upanel = pname;
    s.state = "await_uname";
    await st.saveState(env, chatId, s);
    const m = ui.askUname(s, pname);
    await tg.answerCallback(env, cq.id).catch(() => {});
    return void (await reply(env, chatId, msgId, m.text, m.kb));
  }
  if (data === "asave:y" || data === "asave:n") {
    const pname = s.tmp.ppanel as string | undefined;
    if (pname && s.panelAuth[pname]) {
      s.panelAuth[pname].saved = data === "asave:y";
      await st.saveState(env, chatId, s);
    }
    await tg.answerCallback(env, cq.id, data === "asave:y" ? t(L(s), "a_saved") : t(L(s), "a_nosave")).catch(() => {});
    return await usersEntry(env, chatId, msgId, pname || "", 0);
  }

  await tg.answerCallback(env, cq.id).catch(() => {});
}
