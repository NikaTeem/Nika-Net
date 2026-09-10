// Nika Net — Colo Pool builder (the "Speed Engine" data layer).
//
// Downloads/reads the community "clean IP" dataset (zip.cm.edu.kg/all.json):
// each entry is a verified Cloudflare-fronting anycast IP with the Cloudflare
// datacenter (colo) it lands on + its coordinates. This lets the panel pick,
// per user location, the IPs whose colo is geographically CLOSEST → lowest
// ping. (Same idea as CloudflareSpeedTest's `-cfcolo` matching.)
//
// Outputs ui/colo-pool.json:
//   {
//     "g": "generated_at",
//     "colos": { "FRA": {"lat":50.11,"lon":8.68,"c":"Frankfurt"}, ... },
//     "byColo": { "FRA": "1.2.3.4:443\n5.6.7.8:8443", ... },   // ip:port per colo (cap per colo)
//     "set": "1.2.3.4\n5.6.7.8\n..."                            // union of every verified IP
//   }
//
// Also regenerates ui/scan-ips.json (the in-panel scanner seed) from the same
// data so the bundled scanner probes the freshest known-good IPs.
//
// Usage: node scripts/build-colopool.mjs [all.json path|URL]
//   default: https://zip.cm.edu.kg/all.json  (falls back to /tmp/all.json, then uploads)

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const UPLOADS = join(ROOT, "..", "uploads");

const SOURCE_URL = "https://zip.cm.edu.kg/all.json";
const PER_COLO_CAP = 64;      // enough for rotation, keeps the bundle small
const SEED_CAP = 600;         // scanner seed size
const PORT_ORDER = [443, 8443, 2053, 2083, 2087, 2096];

async function fetchJson(src) {
  const t0 = Date.now();
  const res = await Promise.race([
    fetch(src),
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 20000)),
  ]);
  if (!res.ok) throw new Error("http " + res.status);
  const text = await res.text();
  console.log(`✔ downloaded ${src} (${(text.length / 1048576).toFixed(1)} MB, ${Date.now() - t0}ms)`);
  return JSON.parse(text);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function loadAllJson(arg) {
  const candidates = [];
  if (arg) candidates.push({ label: arg, load: () => readJson(arg) });
  candidates.push({ label: SOURCE_URL, load: () => fetchJson(SOURCE_URL) });
  candidates.push({ label: "/tmp/all.json", load: () => readJson("/tmp/all.json") });
  for (const { label, load } of candidates) {
    try {
      const d = await load();
      if (Array.isArray(d?.data) && d.data.length) return { d, label };
      console.warn(`⚠ ${label}: no data array`);
    } catch (e) {
      console.warn(`⚠ ${label}: ${e.message}`);
    }
  }
  throw new Error("no usable all.json found");
}

/* ---------- validate & sort ---------- */
const IP4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
function okIp(ip) {
  if (!IP4.test(ip)) return false;
  return ip.split(".").map(Number).every((x) => x >= 0 && x <= 255);
}

async function main() {
  const arg = process.argv[2];
  const { d, label } = await loadAllJson(arg);

  const colos = {};        // iata -> {lat,lon,c}
  const byColo = new Map(); // iata -> Map("ip:port" -> portRank)
  const allIps = new Set(); // every verified IP (union)

  let withColo = 0;
  for (const e of d.data) {
    const ip = String(e?.ip || "");
    const ports = Array.isArray(e?.port) && e.port.length ? e.port : [443];
    const meta = e?.meta || {};
    const colo = meta.colo || {};
    const iata = String(colo.iata || "");
    const lat = typeof colo.lat === "number" ? colo.lat : parseFloat(colo.lat);
    const lon = typeof colo.lon === "number" ? colo.lon : parseFloat(colo.lon);
    const city = String(colo.city || iata);

    if (!okIp(ip)) continue;
    allIps.add(ip);
    if (!iata || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    withColo++;
    if (!colos[iata]) colos[iata] = { lat, lon, c: city };
    if (!byColo.has(iata)) byColo.set(iata, new Map());
    const m = byColo.get(iata);
    for (const p of ports) {
      const port = +p;
      if (!Number.isInteger(port) || port < 1 || port > 65535) continue;
      const key = `${ip}:${port}`;
      const rank = PORT_ORDER.includes(port) ? PORT_ORDER.indexOf(port) : 99;
      if (!m.has(key)) m.set(key, rank);
    }
  }

  // cap per colo (prefer 443, then 8443, …)
  const byColoOut = {};
  let entries = 0;
  for (const [iata, m] of [...byColo.entries()].sort((a, b) => b[1].size - a[1].size)) {
    const list = [...m.entries()].sort((a, b) => a[1] - b[1]).map(([k]) => k).slice(0, PER_COLO_CAP);
    byColoOut[iata] = list.join("\n");
    entries += list.length;
  }

  // union with the uploaded daily lists (same source, superset — keeps the
  // allowlist complete for IPs the admin may have applied from the pool tab)
  let uploadsAdded = 0;
  try {
    for (const f of readdirSync(UPLOADS)) {
      if (!/^ALL-/.test(f)) continue;
      for (const line of readFileSync(join(UPLOADS, f), "utf8").split("\n")) {
        const t = line.trim();
        const h = t.lastIndexOf("#");
        const ipport = (h >= 0 ? t.slice(0, h) : t).trim();
        const ip = ipport.split(":")[0];
        if (okIp(ip) && !allIps.has(ip)) { allIps.add(ip); uploadsAdded++; }
      }
    }
  } catch { /* uploads dir absent → skip */ }

  const out = {
    g: d.generated_at || new Date().toISOString(),
    colos,
    byColo: byColoOut,
    set: [...allIps].join("\n"),
  };
  writeFileSync(join(ROOT, "ui", "colo-pool.json"), JSON.stringify(out));
  const kb = Math.round(JSON.stringify(out).length / 1024);
  console.log(`✔ colo pool: ${Object.keys(colos).length} colos · ${entries} ranked entries · ${allIps.size} verified IPs (${uploadsAdded} from uploads) → ui/colo-pool.json (${kb} KB)`);

  // regenerate the scanner seed (top-N verified IPs, all ports)
  const seed = [];
  for (const iata of Object.keys(byColoOut)) {
    for (const e of byColoOut[iata].split("\n")) {
      const ip = e.split(":")[0];
      if (seed.includes(ip)) continue;
      seed.push(ip);
      if (seed.length >= SEED_CAP) break;
    }
    if (seed.length >= SEED_CAP) break;
  }
  writeFileSync(join(ROOT, "ui", "scan-ips.json"), JSON.stringify({ count: seed.length, ips: seed }));
  console.log(`✔ scanner seed regenerated: ${seed.length} IPs → ui/scan-ips.json (source: ${label})`);
}

main().catch((e) => { console.error("✘", e.message); process.exit(1); });
