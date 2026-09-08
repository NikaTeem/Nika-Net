// Nika Net — build script.
// Bundles src/worker.ts with esbuild, inlines the panel UI (ui/index.html)
// and minifies the output into a single deployable dist/worker.js.

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const html = readFileSync(join(ROOT, "ui/index.html"), "utf8");

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
  },
  legalComments: "none",
});

mkdirSync(join(ROOT, "dist"), { recursive: true });
writeFileSync(join(ROOT, "dist/worker.js"), result.outputFiles[0].text);

const kb = (result.outputFiles[0].text.length / 1024).toFixed(1);
console.log(`✔ Nika Net built → dist/worker.js (${kb} KB)`);
