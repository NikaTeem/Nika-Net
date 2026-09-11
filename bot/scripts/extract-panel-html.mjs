// Extracts the real, evaluated /panel HTML from the built worker bundle.
// Usage: node scripts/extract-panel-html.mjs <outfile>
import worker from "../dist/bot.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const out = process.argv[2] || "/tmp/panel.html";

class FakeKV {
  constructor() { this.map = new Map(); }
  async get(k) { return this.map.has(k) ? this.map.get(k) : null; }
  async put(k, v) { this.map.set(k, v); }
  async delete(k) { this.map.delete(k); }
  async list(o = {}) {
    const p = o.prefix || "";
    const names = [...this.map.keys()].filter((k) => k.startsWith(p));
    return { keys: names.map((name) => ({ name })), list_complete: true };
  }
}
const kv = new FakeKV();
kv.put("owner", "8940829322");

const env = {
  TELEGRAM_TOKEN: "TEST",
  WEBHOOK_SECRET: "sec",
  NIKA_SECRET: "x",
  BOT_KV: kv,
};
let pending = [];
const ctx = { waitUntil: (p) => pending.push(p) };

const res = await worker.fetch(new Request("https://x/panel"), env, ctx);
await Promise.all(pending);
const html = await res.text();
if (!html.includes("<script>")) { console.error("extraction failed"); process.exit(1); }
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log("wrote", out, html.length, "chars");
