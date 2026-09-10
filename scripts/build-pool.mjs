// Nika Net — Proxy IP Pool builder.
// Turns the uploaded country-tagged IP lists (IP:port#CC) into a compact,
// deduplicated, per-country pool embedded in the panel at build time.
//
// Usage: node scripts/build-pool.mjs [uploadDir]
//   → writes ui/proxy-pool.json  { "<CC>": ["ip:port", ...], ... }
//   → writes ui/pool-meta.json   { "<CC>": {en, fa}, ... }

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const UPLOADS = process.argv[2] || join(ROOT, "..", "uploads");
const PER_COUNTRY_CAP = 400; // keep pools bounded; scan samples randomly anyway

/* ---------- country display names ---------- */
const NAMES = {
  AE: ["United Arab Emirates", "امارات"], AL: ["Albania", "آلبانی"], AM: ["Armenia", "ارمنستان"],
  AR: ["Argentina", "آرژانتین"], AT: ["Austria", "اتریش"], AU: ["Australia", "استرالیا"],
  AZ: ["Azerbaijan", "آذربایجان"], BE: ["Belgium", "بلژیک"], BG: ["Bulgaria", "بلغارستان"],
  BH: ["Bahrain", "بحرین"], BR: ["Brazil", "برزیل"], BY: ["Belarus", "بلاروس"],
  CA: ["Canada", "کانادا"], CH: ["Switzerland", "سوئیس"], CL: ["Chile", "شیلی"],
  CN: ["China", "چین"], CU: ["Cuba", "کوبا"], CY: ["Cyprus", "قبرس"],
  CZ: ["Czechia", "چک"], DE: ["Germany", "آلمان"], DK: ["Denmark", "دانمارک"],
  DO: ["Dominican Rep.", "دومینیکن"], EC: ["Ecuador", "اکوادور"], EE: ["Estonia", "استونی"],
  EG: ["Egypt", "مصر"], ES: ["Spain", "اسپانیا"], FI: ["Finland", "فنلاند"],
  FR: ["France", "فرانسه"], GB: ["United Kingdom", "بریتانیا"], GE: ["Georgia", "گرجستان"],
  GR: ["Greece", "یونان"], HK: ["Hong Kong", "هنگ‌کنگ"], HR: ["Croatia", "کرواسی"],
  HU: ["Hungary", "مجارستان"], ID: ["Indonesia", "اندونزی"], IE: ["Ireland", "ایرلند"],
  IL: ["Israel", "اسرائیل"], IN: ["India", "هند"], IR: ["Iran", "ایران"],
  IS: ["Iceland", "ایسلند"], IT: ["Italy", "ایتالیا"], JP: ["Japan", "ژاپن"],
  KG: ["Kyrgyzstan", "قرقیزستان"], KH: ["Cambodia", "کامبوج"], KR: ["South Korea", "کره جنوبی"],
  KZ: ["Kazakhstan", "قزاقستان"], LT: ["Lithuania", "لیتوانی"], LV: ["Latvia", "لتونی"],
  MD: ["Moldova", "مولداوی"], MK: ["N. Macedonia", "مقدونیه"], MO: ["Macau", "ماکائو"],
  MX: ["Mexico", "مکزیک"], MY: ["Malaysia", "مالزی"], NG: ["Nigeria", "نیجریه"],
  NL: ["Netherlands", "هلند"], NO: ["Norway", "نروژ"], NZ: ["New Zealand", "نیوزیلند"],
  OM: ["Oman", "عمان"], PL: ["Poland", "لهستان"], PT: ["Portugal", "پرتغال"],
  RO: ["Romania", "رومانی"], RS: ["Serbia", "صربستان"], RU: ["Russia", "روسیه"],
  SA: ["Saudi Arabia", "عربستان"], SE: ["Sweden", "سوئد"], SG: ["Singapore", "سنگاپور"],
  SI: ["Slovenia", "اسلوونی"], SK: ["Slovakia", "اسلواکی"], TH: ["Thailand", "تایلند"],
  TR: ["Turkey", "ترکیه"], TW: ["Taiwan", "تایوان"], UA: ["Ukraine", "اوکراین"],
  US: ["United States", "آمریکا"], UZ: ["Uzbekistan", "ازبکستان"], VN: ["Vietnam", "ویتنام"],
  ZA: ["South Africa", "آفریقای جنوبی"], Unknown: ["Unknown", "نامشخص"],
};

/* ---------- parse & merge ---------- */
const pool = new Map(); // CC -> Map("ip:port" -> true) preserving insertion order
const files = readdirSync(UPLOADS).filter((f) => /^ALL-\d{4}-\d{2}-\d{2}( \(\d+\))?\.txt$/.test(f)).sort();
if (!files.length) { console.error("✘ no ALL-*.txt files found in", UPLOADS); process.exit(1); }
console.log("reading", files.length, "files:", files.join(", "));

for (const f of files) {
  const text = readFileSync(join(UPLOADS, f), "utf8");
  for (let line of text.split("\n")) {
    line = line.trim();
    if (!line) continue;
    const hash = line.lastIndexOf("#");
    if (hash < 0) continue;
    const cc = line.slice(hash + 1).trim() || "Unknown";
    const ipport = line.slice(0, hash).trim();
    const m = ipport.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})$/);
    if (!m) continue;
    const o = m[1].split(".").map(Number);
    if (o.some((x) => x < 0 || x > 255)) continue;
    const port = +m[2];
    if (port < 1 || port > 65535) continue;
    const entry = `${m[1]}:${port}`;
    if (!pool.has(cc)) pool.set(cc, new Map());
    if (!pool.get(cc).has(entry)) pool.get(cc).set(entry, true);
  }
}

/* ---------- cap per country & build compact structures ---------- */
const out = {};
const meta = {};
let total = 0;
for (const [cc, entries] of [...pool.entries()].sort((a, b) => b[1].size - a[1].size)) {
  let list = [...entries.keys()];
  if (list.length > PER_COUNTRY_CAP) list = list.slice(0, PER_COUNTRY_CAP);
  out[cc] = list;
  const nm = NAMES[cc] || [cc, cc];
  meta[cc] = { en: nm[0], fa: nm[1] };
  total += list.length;
}

mkdirSync(join(ROOT, "ui"), { recursive: true });
writeFileSync(join(ROOT, "ui", "proxy-pool.json"), JSON.stringify(out));
writeFileSync(join(ROOT, "ui", "pool-meta.json"), JSON.stringify(meta));

const kb = (JSON.stringify(out).length / 1024).toFixed(1);
console.log(`✔ proxy pool built: ${Object.keys(out).length} countries, ${total} ip:port entries (${kb} KB)`);
