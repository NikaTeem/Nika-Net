// Nika Net Launcher — build script.
// Bundles src/worker.ts and inlines the Nika Net panel bundle (../dist/worker.js)
// so the bot can deploy panels via the Cloudflare API.

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const panelPath = join(ROOT, "..", "dist", "worker.js");
let panel;
try {
  panel = readFileSync(panelPath, "utf8");
} catch {
  console.error("✘ ../dist/worker.js not found — run `npm run build` in the project root first.");
  process.exit(1);
}

let version = "0.4.0";
try {
  const v = JSON.parse(readFileSync(join(ROOT, "..", "version.json"), "utf8"));
  if (v.version) version = v.version;
} catch {}

const result = await build({
  entryPoints: [join(ROOT, "src", "worker.ts")],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  write: false,
  define: {
    PANEL_BUNDLE: JSON.stringify(panel),
    NIKA_VERSION: JSON.stringify(version),
  },
  legalComments: "none",
});

mkdirSync(join(ROOT, "dist"), { recursive: true });
writeFileSync(join(ROOT, "dist", "bot.js"), result.outputFiles[0].text);

const kb = (result.outputFiles[0].text.length / 1024).toFixed(1);
console.log(`✔ Nika Net Launcher built → bot/dist/bot.js (${kb} KB, panel embedded)`);
