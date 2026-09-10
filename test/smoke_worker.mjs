// Nika Net — end-to-end smoke test of the BUILT launcher worker.
// Bundles dist/worker.js with a `cloudflare:sockets` stub, then exercises the
// real HTTP routes: panel HTML, auth, /api/gen (geo-aware), /api/speedtest,
// /api/pooltest (colo/verified), /sub/<token> and /<uuid> configs.
import { build } from "esbuild";
import { readFileSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(__dirname, ".tmp-smoke");
mkdirSync(OUT, { recursive: true });

const bundlePath = join(OUT, "worker.mjs");
await build({
  entryPoints: [join(ROOT, "dist", "worker.js")],
  bundle: true,
  format: "esm",
  platform: "neutral",
  mainFields: ["module", "main"],
  write: true,
  outfile: bundlePath,
  alias: { "cloudflare:sockets": join(__dirname, "stub_sockets.ts") },
});

const mod = await import(pathToFileURL(bundlePath).href + "?t=" + Date.now());
const worker = mod.default;

const env = {}; // no KV/D1 → in-memory store
const ctx = { waitUntil: () => {} };

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "✅" : "❌") + " " + name);
  if (!cond) failed++;
};

async function req(path, init = {}, cf = null) {
  const r = new Request("https://nika.example.workers.dev" + path, {
    method: init.method || "GET",
    headers: { "content-type": "application/json", ...(init.headers || {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (cf) r.cf = cf;
  const res = await worker.fetch(r, env, ctx);
  return res;
}

// 1) panel HTML
const htmlRes = await req("/admin");
const html = await htmlRes.text();
check("panel HTML 200", htmlRes.status === 200);
check("panel HTML: no __SCAN_IPS__ placeholder left", !html.includes("__SCAN_IPS__"));
check("panel HTML: speed test card present", html.includes("speedStart"));
check("panel HTML: no __POOL_DATA__ placeholder", !html.includes("__POOL_DATA__"));

// 2) first-run login
let r = await req("/api/login", { method: "POST", body: { password: "test1234" } });
check("login (first run) ok", r.status === 200);
const cookie = r.headers.get("set-cookie") || "";

// 3) create a user
r = await req("/api/users", { method: "POST", body: { name: "تست", quota: 10, days: 30 }, headers: { cookie } });
const user = await r.json();
check("create user ok", r.ok && !!user.uuid);

// 4) /api/gen with geo (a user near Frankfurt)
const geo = { latitude: "50.1", longitude: "8.6", country: "DE", colo: "FRA", asn: 1 };
r = await req("/api/gen?id=" + user.id, { headers: { cookie } }, geo);
const gen = await r.json();
const links = atob(gen.base64.replace(/-/g, "+").replace(/_/g, "/")).split("\n").filter(Boolean);
check("/api/gen: base64 has 6 links (multi-IP)", links.length === 6);
check("/api/gen: clash has url-test", gen.clash.includes("url-test"));
check("/api/gen: singbox has urltest", gen.singbox.includes("urltest"));

// 5) /api/gen without geo → falls back (host or cleanIP), still works
r = await req("/api/gen?id=" + user.id, { headers: { cookie } });
const gen2 = await r.json();
check("/api/gen: no geo still yields config", typeof gen2.base64 === "string" && gen2.base64.length > 20);

// 6) subscription endpoint (by password token) → base64 bundle
const token = user.password;
r = await req("/sub/" + token, { headers: { accept: "application/json" } }, geo);
const subBody = await r.text();
const subLinks = atob(subBody.replace(/-/g, "+").replace(/_/g, "/")).split("\n").filter(Boolean);
check("/sub/<token>: returns multi-link bundle", subLinks.length === 6);
check("/sub/<token>: links are vless/trojan", subLinks.every((l) => l.startsWith("vless://") || l.startsWith("trojan://")));

// 7) client config fetch by uuid
r = await req("/" + user.uuid, {}, geo);
check("/<uuid>: config 200", r.status === 200);

// 8) speedtest endpoint
r = await req("/api/speedtest?bytes=65536");
const sp = await r.arrayBuffer();
check("/api/speedtest: streams N bytes", sp.byteLength === 65536);
check("/api/speedtest: no-store", (r.headers.get("cache-control") || "").includes("no-store"));

// 9) pooltest with colo/verified annotation (authed)
r = await req("/api/pooltest", { method: "POST", body: { list: ["104.17.147.22", "1.2.3.4"] }, headers: { cookie } });
const pt = await r.json();
const a0 = (pt.results || []).find((x) => x.addr === "104.17.147.22");
check("/api/pooltest: returns annotated results", !!a0 && "verified" in a0 && "colo" in a0);
check("/api/pooltest: official CF IP is verified", a0 && a0.verified === true);

// 10) /api/ips online pool (may fail if offline — don't fail the suite)
r = await req("/api/ips");
const ips = await r.json();
check("/api/ips: returns ips list", Array.isArray(ips.ips) && ips.ips.length > 0);

rmSync(OUT, { recursive: true, force: true });
console.log(failed ? `\n${failed} FAILED ❌` : "\nALL SMOKE PASSED ✅");
process.exit(failed ? 1 : 0);
