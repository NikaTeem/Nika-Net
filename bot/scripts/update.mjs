// Nika Net Launcher — UPDATE script (safe redeploy).
// Uploads the freshly built bot/dist/bot.js while REUSING the existing
// KV namespace and secrets (no data loss, no key rotation).
//
// Usage:
//   CF_TOKEN=... node scripts/update.mjs [kvNamespaceId]
//   → without an explicit id it looks up the "nika-launcher-state" namespace.

import { readFileSync } from "fs";
import { randomBytes } from "crypto";

const CF_TOKEN = process.env.CF_TOKEN;
if (!CF_TOKEN) { console.error("✘ CF_TOKEN missing"); process.exit(1); }

const BOT_NAME = process.env.BOT_NAME || "nika-launcher";
const CF = "https://api.cloudflare.com/client/v4";

async function cf(path, init = {}) {
  const res = await fetch(CF + path, {
    ...init,
    headers: { authorization: `Bearer ${CF_TOKEN}`, ...(init.headers || {}) },
  });
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { success: false, raw: txt.slice(0, 200) }; }
}

function log(ok, msg) { console.log(`${ok ? "✔" : "✘"} ${msg}`); }

async function main() {
  // 1) account
  const a = await cf("/accounts?per_page=50");
  if (!a?.success || !a.result?.length) { log(false, "no accounts for this token"); process.exit(1); }
  const accountId = a.result[0].id;
  log(true, `account: ${a.result[0].name} (${accountId})`);

  // 2) existing KV namespace (default: title match)
  let kvId = process.argv[2];
  if (!kvId) {
    const kvs = await cf(`/accounts/${accountId}/storage/kv/namespaces?per_page=50`);
    const hit = (kvs?.result || []).find((n) => n.title === "nika-launcher-state");
    kvId = hit?.id;
    if (!kvId) { log(false, "no existing KV namespace found — run deploy.mjs for first install"); process.exit(1); }
  }
  log(true, `reusing KV namespace: ${kvId}`);

  // 3) upload the new code, keeping the SAME KV binding + all secrets intact
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
  const up = await cf(`/accounts/${accountId}/workers/scripts/${BOT_NAME}`, {
    method: "PUT",
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    body,
  });
  if (!up?.success) { log(false, `upload failed: ${JSON.stringify(up?.errors || up)}`); process.exit(1); }
  log(true, `worker updated: ${BOT_NAME}`);

  // 4) make sure the workers.dev hostname stays enabled
  const en = await cf(`/accounts/${accountId}/workers/scripts/${BOT_NAME}/subdomain`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled: true }),
  });
  log(!!en?.success, "workers.dev hostname enabled");

  console.log("\n────── SUMMARY ──────");
  console.log(`Bot:      ${BOT_NAME}`);
  console.log(`KV:       ${kvId} (unchanged — user data preserved)`);
  console.log("Secrets:  untouched (NIKA_SECRET / BOT_ADMIN_KEY / TELEGRAM_TOKEN / WEBHOOK_SECRET)");
  console.log("─────────────────────");
}

main();
