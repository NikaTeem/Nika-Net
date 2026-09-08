# 🤖 Nika Net Launcher

A Telegram bot that runs on **Cloudflare Workers (free tier)** and builds **Nika Net** proxy panels for you — no server needed.

## What it does

1. **🔑 Direct token link** — one tap opens Cloudflare's token page with all required permissions **pre-selected**; the user just clicks *Continue to summary → Create Token* and pastes the token.
2. **💾 Save token? (Yes / No)** — after validating the token, the bot asks whether to store it for future panels. Stored tokens are **AES-GCM encrypted**.
3. **🚀 Build panel** — asks for a panel name, then creates the KV namespace + uploads the Nika Net worker via the Cloudflare API and returns the `/admin` URL.

## Architecture

```
bot/
├── src/
│   ├── worker.ts      ← entry: webhook auth + routing
│   ├── flow.ts        ← conversation state machine
│   ├── ui.ts          ← Persian messages & keyboards (incl. the direct token link)
│   ├── telegram.ts    ← Bot API helpers
│   ├── cloudflare.ts  ← CF API helpers (verify token, workers, KV, subdomain)
│   ├── crypto.ts      ← AES-GCM encryption
│   └── state.ts       ← per-user state in KV
├── scripts/build.js   ← esbuild bundle (embeds ../dist/worker.js panel code)
├── scripts/deploy.mjs ← deploys via Cloudflare API + sets the webhook
└── wrangler.jsonc
```

## Deploy

```bash
# build the panel first (root), then the bot
npm run build
node bot/scripts/build.js

# deploy the bot to your Cloudflare account
CF_TOKEN=... TELEGRAM_TOKEN=... node bot/scripts/deploy.mjs
```

The deploy script provisions: workers.dev subdomain (if missing), a KV namespace, the worker script with `BOT_KV` binding, three secrets (`TELEGRAM_TOKEN`, `WEBHOOK_SECRET`, `NIKA_SECRET`), and registers the Telegram webhook.

## Permissions (pre-selected in the token link)

- Workers Scripts: Edit · Workers KV Storage: Edit · Workers Routes: Edit · D1: Edit
- Account Settings: Read · User Details: Read · Memberships: Read

Full setup guide (Persian): [SETUP.fa.md](SETUP.fa.md)
