// Nika Net — one-command release: bump version → build → push.
// After the push, the bot automatically notifies every user about the new
// release (cron runs every 10 min), or you can trigger it instantly with:
//   curl -X POST https://nika-launcher.nikanetteem.workers.dev/announce \
//        -H "x-admin-key: $ADMIN_KEY"
//
// Usage:
//   node scripts/release.mjs [version] [notes...]
//     → with no version, auto-bumps the patch (0.5.0 → 0.5.1)

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const argV = process.argv[2];
const notes = process.argv.slice(3).join(" ");

const bump = (cur) => {
  const p = cur.split(".").map(Number);
  p[2] = (p[2] || 0) + 1;
  return p.join(".");
};

const vjson = JSON.parse(readFileSync("version.json", "utf8"));
const next = argV || bump(vjson.version);
vjson.version = next;
if (notes) vjson.notes = notes;
writeFileSync("version.json", JSON.stringify(vjson, null, 2) + "\n");

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
pkg.version = next;
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");

console.log(`🚀 releasing v${next}${notes ? " — " + notes : ""}`);

execSync("npm run build", { stdio: "inherit" }); // panel → dist/worker.js
execSync("node bot/scripts/build.js", { stdio: "inherit" }); // bot (embeds panel as fallback)

execSync("git add -A", { stdio: "inherit" });
execSync(`git commit -m "🚀 release v${next}${notes ? " — " + notes : ""}"`, { stdio: "inherit" });
execSync("git push", { stdio: "inherit" });

console.log(`\n✅ v${next} pushed.`);
console.log("📣 The bot notifies all users within 10 min (cron), or instantly:");
console.log('   curl -X POST https://nika-launcher.nikanetteem.workers.dev/announce -H "x-admin-key: $ADMIN_KEY"');
