// Nika Net — config generator tests (v0.12.1 BPB-parity).
// Compiles the real src/generators.ts and asserts:
//   * Domain + IPv4 + IPv6 variants per protocol (BPB-style)
//   * datacenter/reverse-proxy IPs are NEVER emitted (regression guard)
//   * fixed/pool/clean priority + url-test/urltest groups
import { build } from "esbuild";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(__dirname, ".tmp-speed");
mkdirSync(OUT, { recursive: true });

const ENTRY = join(OUT, "entry.ts");
writeFileSync(ENTRY, `export * from "../../src/generators";\n`);
const bundlePath = join(OUT, "bundle.mjs");
await build({
  entryPoints: [ENTRY],
  bundle: true,
  format: "esm",
  platform: "neutral",
  mainFields: ["module", "main"],
  write: true,
  outfile: bundlePath,
});
const mod = await import(pathToFileURL(bundlePath).href + "?t=" + Date.now());

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "✅" : "❌") + " " + name);
  if (!cond) failed++;
};

const s = {
  title: "t", host: "nika.example.workers.dev", sni: "www.speedtest.net", wsPath: "/nika-ws",
  cleanIps: ["104.17.147.22", "188.114.96.9", "162.159.192.1"],
  cleanIpv6: ["2606:4700::6810:7c60", "2606:4700::6812:1c07"],
  fixedIp: "", relayDomain: "",
  poolIps: [], poolCountry: "", poolFlag: "🇩🇪",
  protocols: { vless: true, trojan: true, warp: false },
  adminPassHash: null, secretPath: "nika-admin", sessionSecret: "x",
};
const u = { id: "1", name: "a", uuid: "12345678-1234-1234-1234-123456789012", password: "pass123", quota: 1, used: 0, days: 30, active: true, createdAt: 0 };

/* ---- pickers ---- */
const v4 = mod.pickIpv4Addrs(s, 3);
check("pickIpv4Addrs: returns clean CF edges", v4.length === 3 && v4.every((a) => a.port === 443));

// THE regression guard: datacenter/reverse-proxy IPs must never be emitted
const sBad = { ...s, cleanIps: ["141.148.140.81", "129.146.31.14", "1.2.3.4"], poolIps: ["45.80.110.140:443"] };
check("datacenter IPs are filtered out of pickIpv4Addrs", mod.pickIpv4Addrs(sBad, 3).length === 0);
check("poolIps: datacenter IP filtered", mod.pickIpv4Addrs({ ...sBad, cleanIps: [] }, 3).length === 0);

const v6 = mod.pickIpv6Addrs(s, 3);
check("pickIpv6Addrs: returns IPv6 edges", v6.length === 2 && v6[0].host.includes(":"));

/* ---- variants (BPB-parity) ---- */
const links = mod.buildNamedLinks(u, s);
const labels = links.map((l) => l.label);
check("variants: Domain + IPv4 + IPv6 per protocol (6 links)", links.length === 6);
check("variants: has Domain", labels.includes("Domain"));
check("variants: has IPv4", labels.includes("IPv4"));
check("variants: has IPv6", labels.includes("IPv6"));
const domainLink = links.find((l) => l.label === "Domain" && l.kind === "vless");
check("variants: Domain uses front host", domainLink && domainLink.addr.host === "nika.example.workers.dev");
const ipv4Link = links.find((l) => l.label === "IPv4" && l.kind === "vless");
check("variants: IPv4 uses a clean CF edge", ipv4Link && /^\d{1,3}(\.\d{1,3}){3}$/.test(ipv4Link.addr.host));
const ipv6Link = links.find((l) => l.label === "IPv6" && l.kind === "vless");
check("variants: IPv6 uses an IPv6 edge", ipv6Link && ipv6Link.addr.host.includes(":"));

/* ---- fixed IP lock (applies to the IPv4 variant) ---- */
const sFix = { ...s, fixedIp: "104.17.147.22:8443" };
const fixLink = mod.buildNamedLinks(u, sFix).find((l) => l.label === "IPv4" && l.kind === "vless");
check("fixed IP lock honoured (IPv4 variant)", fixLink && fixLink.addr.host === "104.17.147.22" && fixLink.addr.port === 8443);

/* ---- base64 bundle ---- */
const b64 = mod.buildBase64Bundle(u, s);
const decoded = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
const bundleLinks = decoded.split("\n").filter(Boolean);
check("base64 bundle: 6 links", bundleLinks.length === 6);
check("base64: vless/trojan", bundleLinks.every((l) => l.startsWith("vless://") || l.startsWith("trojan://")));
check("base64: first link is Domain variant (reliable default)", bundleLinks[0].includes("Domain"));
check("base64: fp=random", bundleLinks.every((l) => l.includes("fp=random")));

/* ---- clash / singbox ---- */
const yaml = mod.buildClashYaml(u, s);
check("clash: url-test auto group", yaml.includes("url-test") && yaml.includes("Auto"));
check("clash: 6 proxies", (yaml.match(/type: vless/g) || []).length + (yaml.match(/type: trojan/g) || []).length === 6);
check("clash: domain variant present", yaml.includes("Domain"));

const sb = mod.buildSingboxJson(u, s);
const sbj = JSON.parse(sb);
check("singbox: urltest outbound", sbj.outbounds.some((o) => o.type === "urltest"));
check("singbox: 9 outbounds (6 nodes + urltest + selector + direct)", sbj.outbounds.length === 9);

rmSync(OUT, { recursive: true, force: true });
console.log(failed ? `\n${failed} FAILED ❌` : "\nALL PASSED ✅");
process.exit(failed ? 1 : 0);
