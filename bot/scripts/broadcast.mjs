// Nika Net Launcher — broadcast an announcement to all bot users.
// Usage:
//   BOT_ADMIN_KEY=... BOT_URL=https://nika-launcher.xxx.workers.dev \
//   MSG='متن پیام' node bot/scripts/broadcast.mjs

const key = process.env.BOT_ADMIN_KEY;
const url = process.env.BOT_URL;
const msg = process.env.MSG;

if (!key || !url || !msg) {
  console.error("✘ set BOT_ADMIN_KEY, BOT_URL and MSG");
  process.exit(1);
}

const res = await fetch(url.replace(/\/$/, "") + "/broadcast", {
  method: "POST",
  headers: { "content-type": "application/json", "x-admin-key": key },
  body: JSON.stringify({ text: msg }),
});
const body = await res.text();
console.log(`HTTP ${res.status} →`, body);
