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

async function req(path, init = {}, cf = null, useEnv = env) {
  const r = new Request("https://nika.example.workers.dev" + path, {
    method: init.method || "GET",
    headers: { "content-type": "application/json", ...(init.headers || {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (cf) r.cf = cf;
  const res = await worker.fetch(r, useEnv, ctx);
  return res;
}

// 1) panel HTML
const htmlRes = await req("/admin");
const html = await htmlRes.text();
check("panel HTML 200", htmlRes.status === 200);
check("panel HTML: no __SCAN_IPS__ placeholder left", !html.includes("__SCAN_IPS__"));
check("panel HTML: speed test card present", html.includes("speedStart"));
check("panel HTML: no __POOL_DATA__ placeholder", !html.includes("__POOL_DATA__"));
check("panel HTML: full-range scanner density control", html.includes('id="scanDensity"'));
check("panel HTML: IP version control (IPv4/IPv6)", html.includes('id="scanVer"'));
check("panel HTML: whole-CF enumerator present", html.includes("per24Ips") && html.includes("V4_TOTAL"));
check("panel HTML: saved-results loader present", html.includes('id="scanLoadLast"'));

// 2) first-run login
let r = await req("/api/login", { method: "POST", body: { password: "test1234" } });
check("login (first run) ok", r.status === 200);
const cookie = r.headers.get("set-cookie") || "";

// 3) create a user
r = await req("/api/users", { method: "POST", body: { name: "تست", quota: 10, days: 30 }, headers: { cookie } });
const user = await r.json();
check("create user ok", r.ok && !!user.uuid);

// 4) /api/gen → multi-variant bundle (Domain + IPv4 + IPv6 per protocol)
r = await req("/api/gen?id=" + user.id, { headers: { cookie } });
const gen = await r.json();
const links = atob(gen.base64.replace(/-/g, "+").replace(/_/g, "/")).split("\n").filter(Boolean);
check("/api/gen: base64 has 6 links (Domain+IPv4+IPv6 × 2 protocols)", links.length === 6);
check("/api/gen: links are vless/trojan", links.every((l) => l.startsWith("vless://") || l.startsWith("trojan://")));
check("/api/gen: first link is Domain (reliable default)", links[0].includes("Domain"));
check("/api/gen: clash has url-test", gen.clash.includes("url-test"));
check("/api/gen: singbox has urltest", gen.singbox.includes("urltest"));

// 5) subscription endpoint (by password token) → base64 bundle
const token = user.password;
r = await req("/sub/" + token, { headers: { accept: "application/json" } });
const subBody = await r.text();
const subLinks = atob(subBody.replace(/-/g, "+").replace(/_/g, "/")).split("\n").filter(Boolean);
check("/sub/<token>: returns multi-link bundle", subLinks.length === 6);
check("/sub/<token>: links are vless/trojan", subLinks.every((l) => l.startsWith("vless://") || l.startsWith("trojan://")));

// 6) client config fetch by uuid
r = await req("/" + user.uuid);
check("/<uuid>: config 200", r.status === 200);

// 8) speedtest endpoint
r = await req("/api/speedtest?bytes=65536");
const sp = await r.arrayBuffer();
check("/api/speedtest: streams N bytes", sp.byteLength === 65536);
check("/api/speedtest: no-store", (r.headers.get("cache-control") || "").includes("no-store"));

// 9) pooltest with verified annotation (authed)
r = await req("/api/pooltest", { method: "POST", body: { list: ["104.17.147.22", "1.2.3.4"] }, headers: { cookie } });
const pt = await r.json();
const a0 = (pt.results || []).find((x) => x.addr === "104.17.147.22");
check("/api/pooltest: returns verified flag", !!a0 && "verified" in a0);
check("/api/pooltest: official CF IP is verified", a0 && a0.verified === true);
check("/api/pooltest: non-CF IP is NOT verified", (pt.results || []).find((x) => x.addr === "1.2.3.4")?.verified === false);

// 10) /api/ips online pool (may fail if offline — don't fail the suite)
r = await req("/api/ips");
const ips = await r.json();
check("/api/ips: returns ips list", Array.isArray(ips.ips) && ips.ips.length > 0);

// 11) KV quota resilience: a KV that throws "limit exceeded" must NEVER turn
//     into a 500 error. This is the regression for the "panel always shows
//     KV put() limit exceeded" production bug.
{
  const kvEnv = {
    NIKA_KV: {
      data: new Map(),
      async get(key) { return this.data.get(key) ?? null; },
      // fully exhausted quota: every write throws the CF free-tier error
      async put() { throw new Error("KV put() limit exceeded for the day."); },
    },
  };
  // first-run login → settings write throws quota error; must still succeed
  let q = await req("/api/login", { method: "POST", body: { password: "test1234" } }, null, kvEnv);
  check("KV-quota: first-run login succeeds", q.status === 200 && (await q.json()).ok === true);
  const qcookie = q.headers.get("set-cookie") || "";

  // create user → saveUsers write now throws quota error; must still succeed
  q = await req("/api/users", { method: "POST", body: { name: "تست", quota: 10, days: 30 }, headers: { cookie: qcookie } }, null, kvEnv);
  check("KV-quota: create user still succeeds (write errors swallowed)", q.ok && !!(await q.json()).uuid);

  // status (reads) must not 500
  q = await req("/api/status", { headers: { cookie: qcookie } }, null, kvEnv);
  check("KV-quota: status still 200", q.status === 200);

  // panel HTML must still load
  q = await req("/admin", {}, null, kvEnv);
  check("KV-quota: panel HTML still 200", q.status === 200);
}

// 12) NIKA_NS prefix: two deployments sharing one store stay independent.
{
  const nsA = { NIKA_NS: "panel-a" };
  const nsB = { NIKA_NS: "panel-b" };
  let a = await req("/api/login", { method: "POST", body: { password: "test1234" } }, null, nsA);
  check("NIKA_NS: panel-a first-run login ok", a.status === 200);
  a = await req("/api/info", {}, null, nsA);
  const infoA = await a.json();
  a = await req("/api/info", {}, null, nsB);
  const infoB = await a.json();
  check("NIKA_NS: panel-a setup=false (own settings persisted)", infoA.setup === false);
  check("NIKA_NS: panel-b setup=true (independent)", infoB.setup === true);
}

// 13) D1 storage path (primary store): settings persist via NIKA_DB.
{
  const d1 = {
    data: new Map(),
    prepare(sql) {
      return {
        bind: (...params) => ({
          first: async () => {
            const key = params[0];
            return d1.data.has(key) ? { value: d1.data.get(key) } : null;
          },
          run: async () => {
            const [key, value] = params;
            d1.data.set(key, value);
            return { success: true };
          },
        }),
      };
    },
  };
  const envD1 = { NIKA_DB: d1, NIKA_NS: "d1test" };
  let q = await req("/api/login", { method: "POST", body: { password: "test1234" } }, null, envD1);
  check("D1: first-run login ok", q.status === 200);
  q = await req("/api/info", {}, null, envD1);
  check("D1: setup persisted via D1", (await q.json()).setup === false);
  check("D1: settings stored under prefixed key", d1.data.has("d1test:settings"));
}

// 14) KV→D1 migration: a panel moved from KV-only to D1 keeps its data.
{
  const legacyKv = {
    data: new Map([["settings", JSON.stringify({ title: "Nika Net", adminPassHash: "abc", sessionSecret: "legacy-secret" })]]),
    async get(key) { return this.data.get(key) ?? null; },
    async put(key, value) { this.data.set(key, value); },
  };
  const d1 = {
    data: new Map(),
    prepare(sql) {
      return {
        bind: (...params) => ({
          first: async () => (d1.data.has(params[0]) ? { value: d1.data.get(params[0]) } : null),
          run: async () => { d1.data.set(params[0], params[1]); return { success: true }; },
        }),
      };
    },
  };
  const envMig = { NIKA_DB: d1, NIKA_KV: legacyKv, NIKA_NS: "mig" };
  const q = await req("/api/info", {}, null, envMig);
  const info = await q.json();
  check("KV→D1 migration: legacy settings surfaced (setup=false)", info.setup === false);
  check("KV→D1 migration: value copied into D1 under prefix", d1.data.has("mig:settings"));
}

rmSync(OUT, { recursive: true, force: true });
console.log(failed ? `\n${failed} FAILED ❌` : "\nALL SMOKE PASSED ✅");
process.exit(failed ? 1 : 0);
