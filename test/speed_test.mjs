// Nika Net — Speed Engine tests (v0.12).
// Compiles the real src modules (colo.ts + generators.ts) with a small colo
// fixture, then asserts the low-ping ranking + multi-entry generation.
import { build } from "esbuild";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(__dirname, ".tmp-speed");
mkdirSync(OUT, { recursive: true });

// Fixture colo pool: Frankfurt, San Jose, Dubai (and one far colo, Sydney)
const FIXTURE = {
  g: "test",
  colos: {
    FRA: { lat: 50.11, lon: 8.68, c: "Frankfurt" },
    SJC: { lat: 37.36, lon: -121.93, c: "San Jose" },
    DXB: { lat: 25.25, lon: 55.36, c: "Dubai" },
    SYD: { lat: -33.87, lon: 151.21, c: "Sydney" },
  },
  byColo: {
    FRA: "141.1.1.1:443\n141.1.1.2:8443\n141.1.1.3:2053",
    SJC: "129.1.1.1:443\n129.1.1.2:443",
    DXB: "185.1.1.1:443",
    SYD: "203.1.1.1:443",
  },
  set: "141.1.1.1\n141.1.1.2\n141.1.1.3\n129.1.1.1\n129.1.1.2\n185.1.1.1\n203.1.1.1",
};

const ENTRY = join(OUT, "entry.ts");
writeFileSync(
  ENTRY,
  `export * from "../../src/colo";\nexport * from "../../src/generators";\nexport { isCloudflareIp } from "../../src/cfips";\n`
);

const bundlePath = join(OUT, "bundle.mjs");
await build({
  entryPoints: [ENTRY],
  bundle: true,
  format: "esm",
  platform: "neutral",
  mainFields: ["module", "main"],
  write: true,
  outfile: bundlePath,
  define: { COLO_POOL: JSON.stringify(JSON.stringify(FIXTURE)) },
});

const mod = await import(pathToFileURL(bundlePath).href + "?t=" + Date.now());

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "✅" : "❌") + " " + name);
  if (!cond) failed++;
};

/* ---- colo module ---- */
check("colo: isBundledAnycast (verified IP)", mod.isBundledAnycast("141.1.1.1") === true);
check("colo: unknown IP not verified", mod.isBundledAnycast("9.9.9.9") === false);
check("colo: coloOf maps IP→colo", mod.coloOf("129.1.1.2")?.iata === "SJC");
check("colo: coloOf city label", mod.coloOf("141.1.1.1")?.city === "Frankfurt");

// user near Frankfurt (50.1, 8.6)
const ranked = mod.rankByDistance({ lat: 50.1, lon: 8.6 }, 3);
check("colo: rank 3 candidates", ranked.length === 3);
check("colo: nearest colo = FRA", ranked[0].colo === "FRA");
check("colo: rank diversifies colos", new Set(ranked.map((r) => r.colo)).size === 3);
check("colo: nearest km < farther km", ranked[0].km <= ranked[1].km && ranked[1].km <= ranked[2].km);

/* ---- generators: geo-aware multi-entry ---- */
const s = {
  title: "t", host: "nika.example.workers.dev", sni: "www.speedtest.net", wsPath: "/nika-ws",
  cleanIps: ["104.17.147.22"], fixedIp: "", relayDomain: "",
  poolIps: [], poolCountry: "", poolFlag: "🇩🇪",
  protocols: { vless: true, trojan: true, warp: false },
  adminPassHash: null, secretPath: "nika-admin", sessionSecret: "x",
};
const u = { id: "1", name: "a", uuid: "12345678-1234-1234-1234-123456789012", password: "pass123", quota: 1, used: 0, days: 30, active: true, createdAt: 0 };

const geo = { lat: 50.1, lon: 8.6 };
const addrs = mod.pickAddrs(s, geo, 3);
check("gen: pickAddrs uses colo ranking when geo known", addrs.length === 3 && addrs[0].colo === "FRA");
check("gen: colo-ranked addr is 443", addrs[0].port === 443 && addrs[0].host === "141.1.1.1");

// poolIps override geo (explicit admin choice) — use a verified anycast IP
const s2 = { ...s, poolIps: ["185.1.1.1:443"] };
check("gen: admin poolIps override geo ranking", mod.pickAddrs(s2, geo, 3)[0].host === "185.1.1.1");

// no geo → fallback to cleanIps (official CF)
const s3 = { ...s, cleanIps: ["104.16.0.1", "172.64.0.1"] };
const noGeo = mod.pickAddrs(s3, null, 2);
check("gen: no geo → cleanIps fallback", noGeo.length === 2 && noGeo.every((a) => a.port === 443));

const b64 = mod.buildBase64Bundle(u, s, geo);
const decoded = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
const links = decoded.split("\n").filter(Boolean);
check("gen: base64 bundle has MULTI entries per protocol (6)", links.length === 6);
check("gen: links are vless/trojan", links.every((l) => l.startsWith("vless://") || l.startsWith("trojan://")));
check("gen: top link uses nearest colo IP", links[0].includes("141.1.1.1"));

const yaml = mod.buildClashYaml(u, s, geo);
check("gen: clash has url-test auto group", yaml.includes("url-test") && yaml.includes("Auto"));
check("gen: clash url points to gstatic generate_204", yaml.includes("generate_204"));
check("gen: clash has 3+ proxies", (yaml.match(/type: vless/g) || []).length === 3);

const sb = mod.buildSingboxJson(u, s, geo);
const sbj = JSON.parse(sb);
check("gen: singbox has urltest outbound", sbj.outbounds.some((o) => o.type === "urltest"));
check("gen: singbox selector lists auto first", sbj.outbounds.find((o) => o.type === "selector").outbounds[0].includes("Auto"));

// verified allowlist: clean IPs now accept bundled anycast (not just official CIDR)
const s4 = { ...s, cleanIps: ["141.1.1.1"], poolIps: [], fixedIp: "" };
const a4 = mod.pickAddrs(s4, null, 1)[0];
check("gen: bundled anycast clean IP accepted", a4.host === "141.1.1.1");

// fixed IP lock: verified anycast allowed
const s5 = { ...s, fixedIp: "141.1.1.2:8443" };
const a5 = mod.pickAddrs(s5, geo, 1)[0];
check("gen: fixed verified anycast lock honoured", a5.host === "141.1.1.2" && a5.port === 8443);

// host fallback when everything empty
const s6 = { ...s, cleanIps: [], poolIps: [], fixedIp: "" };
const a6 = mod.pickAddrs(s6, null, 1)[0];
check("gen: host fallback", a6.host === "nika.example.workers.dev");

rmSync(OUT, { recursive: true, force: true });
console.log(failed ? `\n${failed} FAILED ❌` : "\nALL PASSED ✅");
process.exit(failed ? 1 : 0);
