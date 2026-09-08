// Nika Net Launcher — deploy script.
// Deploys the bot to Cloudflare via the API: KV namespace, worker script,
// secrets, and Telegram webhook registration. No server required.
//
// Usage:
//   CF_TOKEN=... TELEGRAM_TOKEN=... node scripts/deploy.mjs
// Optional:
//   BOT_NAME=nika-launcher  ACCOUNT_ID=...

import { readFileSync } from "fs";
import { randomBytes } from "crypto";

const CF_TOKEN = process.env.CF_TOKEN;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const BOT_NAME = process.env.BOT_NAME || "nika-launcher";
const ACCOUNT_ID = process.env.ACCOUNT_ID || null;

const CF = "https://api.cloudflare.com/client/v4";

if (!CF_TOKEN) { console.error("✘ CF_TOKEN missing"); process.exit(1); }
if (!TELEGRAM_TOKEN) { console.error("✘ TELEGRAM_TOKEN missing"); process.exit(1); }

const WEBHOOK_SECRET = randomBytes(16).toString("hex");
const NIKA_SECRET = randomBytes(32).toString("hex");

async function cf(path, init = {}) {
  const res = await fetch(CF + path, {
    ...init,
    headers: { authorization: `Bearer ${CF_TOKEN}`, ...(init.headers || {}) },
  });
  return res.json();
}

function log(ok, msg) { console.log(`${ok ? "✔" : "✘"} ${msg}`); }

async function main() {
  // 1) account
  let accountId = ACCOUNT_ID;
  if (!accountId) {
    const a = await cf("/accounts?per_page=50");
    if (!a?.success || !a.result?.length) { log(false, "no accounts for this token"); process.exit(1); }
    accountId = a.result[0].id;
    log(true, `account: ${a.result[0].name} (${accountId})`);
  } else log(true, `account: ${accountId}`);

  // 2) workers.dev subdomain (needed for the webhook URL)
  let sub = (await cf(`/accounts/${accountId}/workers/subdomain`))?.result?.subdomain;
  if (!sub) {
    const candidate = "nika-" + randomBytes(4).toString("hex");
    const r = await cf(`/accounts/${accountId}/workers/subdomain`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subdomain: candidate }),
    });
    if (!r?.success) { log(false, `register subdomain failed: ${r?.errors?.[0]?.message}`); process.exit(1); }
    sub = candidate;
    log(true, `workers.dev subdomain registered: ${sub}.workers.dev`);
  } else log(true, `workers.dev subdomain: ${sub}.workers.dev`);

  // 3) KV namespace for bot state
  const kv = await cf(`/accounts/${accountId}/storage/kv/namespaces`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "nika-launcher-state" }),
  });
  if (!kv?.success) { log(false, `KV create failed: ${kv?.errors?.[0]?.message}`); process.exit(1); }
  const kvId = kv.result.id;
  log(true, `KV namespace: ${kvId}`);

  // 4) upload bot worker with KV binding
  const code = readFileSync(new URL("../dist/bot.js", import.meta.url), "utf8");
  const boundary = "----NikaNet" + randomBytes(8).toString("hex");
  const metadata = {
    main_module: "worker.js",
    compatibility_date: "2026-05-01",
    workers_dev: true,
    bindings: [{ type: "kv_namespace", name: "BOT_KV", namespace_id: kvId }],
  };
  const body = [
    `--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="worker.js"; filename="worker.js"\r\nContent-Type: application/javascript+module\r\n\r\n${code}\r\n`,
    `--${boundary}--\r\n`,
  ].join("");
  const upRes = await fetch(`${CF}/accounts/${accountId}/workers/scripts/${BOT_NAME}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${CF_TOKEN}`,
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  const up = await upRes.json();
  if (!up?.success) { log(false, `worker upload failed: ${up?.errors?.[0]?.message}`); process.exit(1); }
  log(true, `worker uploaded: ${BOT_NAME}`);

  // 5) secrets
  for (const [name, text] of [["TELEGRAM_TOKEN", TELEGRAM_TOKEN], ["WEBHOOK_SECRET", WEBHOOK_SECRET], ["NIKA_SECRET", NIKA_SECRET]]) {
    const r = await cf(`/accounts/${accountId}/workers/scripts/${BOT_NAME}/secrets`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, text, type: "secret_text" }),
    });
    log(!!r?.success, `secret set: ${name}`);
  }

  // 6) webhook
  const hookUrl = `https://${BOT_NAME}.${sub}.workers.dev/webhook`;
  const wh = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: hookUrl, secret_token: WEBHOOK_SECRET, allowed_updates: ["message", "callback_query"] }),
  }).then((r) => r.json());
  log(!!wh?.ok, `webhook: ${wh?.ok ? "registered" : wh?.description}`);

  const info = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo`).then((r) => r.json());
  console.log("\n────── SUMMARY ──────");
  console.log(`Bot URL:   ${hookUrl}`);
  console.log(`Webhook:   ${info?.result?.url || "(pending)"}`);
  console.log(`KV:        ${kvId}`);
  console.log("─────────────────────");
}

main().catch((e) => { console.error(e); process.exit(1); });
