// Nika Net — build script.
// Bundles src/worker.ts with esbuild, inlines the panel UI (ui/index.html)
// and minifies the output into a single deployable dist/worker.js.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";
import pkg from "../package.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

let html = readFileSync(join(ROOT, "ui/index.html"), "utf8");
const qrcodeLib = readFileSync(join(ROOT, "ui/qrcode.js"), "utf8");

// Proxy IP Pool data (per-country ip:port lists) + country display names.
// Injected straight into the served HTML so the browser has it offline-ish.
// Build it with `node scripts/build-pool.mjs`; fall back to empty objects.
let poolJson = "{}";
if (existsSync(join(ROOT, "ui", "proxy-pool.json"))) {
  poolJson = readFileSync(join(ROOT, "ui", "proxy-pool.json"), "utf8");
}
let metaJson = "{}";
if (existsSync(join(ROOT, "ui", "pool-meta.json"))) {
  metaJson = readFileSync(join(ROOT, "ui", "pool-meta.json"), "utf8");
}
html = html.replace("__POOL_DATA__", () => poolJson).replace("__META_DATA__", () => metaJson);

// Colo pool (the "Speed Engine"): verified-anycast IPs mapped to their
// Cloudflare datacenter + coordinates → per-user low-ping ranking.
let coloPoolJson = "{}";
if (existsSync(join(ROOT, "ui", "colo-pool.json"))) {
  coloPoolJson = readFileSync(join(ROOT, "ui", "colo-pool.json"), "utf8");
}

// Scanner seed (verified clean IPs) — injected as a JS array into the HTML.
let scanIpsJson = "[]";
if (existsSync(join(ROOT, "ui", "scan-ips.json"))) {
  try {
    const seed = JSON.parse(readFileSync(join(ROOT, "ui", "scan-ips.json"), "utf8"));
    scanIpsJson = JSON.stringify(Array.isArray(seed.ips) ? seed.ips : []);
  } catch { /* fall back to [] */ }
}
html = html.replace("__SCAN_IPS__", () => scanIpsJson);

const result = await build({
  entryPoints: [join(ROOT, "src/worker.ts")],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  write: false,
  external: ["cloudflare:sockets"],
  define: {
    PANEL_HTML: JSON.stringify(html),
    NIKA_VERSION: JSON.stringify(pkg.version),
    QRCODE_LIB: JSON.stringify(qrcodeLib),
    COLO_POOL: JSON.stringify(coloPoolJson),
  },
  legalComments: "none",
});

mkdirSync(join(ROOT, "dist"), { recursive: true });
writeFileSync(join(ROOT, "dist/worker.js"), result.outputFiles[0].text);

const kb = (result.outputFiles[0].text.length / 1024).toFixed(1);
console.log(`✔ Nika Net built → dist/worker.js (${kb} KB)`);
