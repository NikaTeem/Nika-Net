// Nika Net — subscription config generators (server-side source of truth).
//
// v0.12.1 "BPB-parity": every subscription carries, per protocol, THREE
// variants just like the reference panels (BPB/Hiddify):
//   1. Domain  — address = the panel's front domain (always reliable, clean name)
//   2. IPv4    — address = a verified Cloudflare anycast IPv4 edge (clean IP)
//   3. IPv6    — address = a verified Cloudflare anycast IPv6 edge
// Clash/sing-box additionally get a url-test / urltest group that auto-picks
// the lowest-latency node.
//
// IMPORTANT (v0.12.1 fix): a connect address MUST be a Cloudflare edge
// (official anycast ranges). Community "reverse-proxy/datacenter" IP lists
// (Oracle/colocation IPs) are NOT Cloudflare edges — they answer for their own
// service and drop arbitrary SNI, so a config using them dies with
// ERR_CONNECTION_CLOSED. Only `isCloudflareIp` (or the host itself) can front
// the worker. Datacenter IPs are therefore never emitted as connect addresses.

import { Settings, User } from "./types";
import { isCloudflareIp } from "./cfips";

const DEFAULT_REMARK = "Nika Paneel | یک سرویس رایگان هست";
const DEFAULT_SHORT = "Nika Paneel";

export interface Addr {
  host: string;
  port: number;
}

function poolBaseName(s: Settings): string {
  const f = (s.poolFlag || "").trim();
  return f ? `${f} سرویس رایگان Nika Net` : "";
}

function configShortName(s: Settings): string {
  return poolBaseName(s) || DEFAULT_SHORT;
}

const IP_PORT_RE = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d{1,5}))?$/;
const IPV6_RE = /^\[?([0-9a-fA-F:]+)\]?(?::(\d{1,5}))?$/;

function parseAddr(x: string): Addr | null {
  const t = (x || "").trim();
  const m = t.match(IP_PORT_RE);
  if (m) {
    const o = m[1].split(".").map(Number);
    if (o.some((n) => n < 0 || n > 255)) return null;
    const port = m[2] ? Math.min(65535, Math.max(1, parseInt(m[2], 10))) : 443;
    return { host: m[1], port };
  }
  const m6 = t.match(IPV6_RE);
  if (m6 && m6[1].includes(":")) {
    const port = m6[2] ? Math.min(65535, Math.max(1, parseInt(m6[2], 10))) : 443;
    return { host: m6[1], port };
  }
  return null;
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// front domain: relay-test choice wins, else the panel host.
function front(s: Settings): string {
  const r = (s.relayDomain || "").trim();
  return r || (s.host || "").trim();
}

/* ---------------------- candidate pickers ---------------------- */

/** Verified Cloudflare anycast IPv4 edges (fixed → pool → clean list). */
export function pickIpv4Addrs(s: Settings, n: number): Addr[] {
  const fixed = (s.fixedIp || "").trim();
  if (fixed) {
    const a = parseAddr(fixed);
    if (a && isCloudflareIp(a.host)) return [a];
  }
  const pool = (s.poolIps || [])
    .map((x) => parseAddr(String(x)))
    .filter((a): a is Addr => !!a && isCloudflareIp(a.host));
  if (pool.length) return shuffle(pool).slice(0, n);
  const clean = (s.cleanIps || [])
    .filter(Boolean)
    .filter((ip) => isCloudflareIp(ip))
    .map((ip) => parseAddr(ip) || { host: ip, port: 443 });
  if (clean.length) return shuffle(clean).slice(0, n);
  return [];
}

/** Verified Cloudflare anycast IPv6 edges (curated default list). */
export function pickIpv6Addrs(s: Settings, n: number): Addr[] {
  const list = (s.cleanIpv6 || [])
    .map((x) => parseAddr(x))
    .filter((a): a is Addr => !!a);
  return list.length ? shuffle(list).slice(0, n) : [];
}

/* ---------------------- link builders ---------------------- */

function vlessLink(u: User, s: Settings, a: Addr, label: string): string {
  const f = front(s);
  const q = new URLSearchParams({
    encryption: "none", security: "tls", sni: f, fp: "random",
    type: "ws", host: f, path: s.wsPath + "?ed=2048&proto=vless",
  });
  return `vless://${u.uuid}@${a.host}:${a.port}?${q.toString()}#${remark(s, label)}`;
}

function trojanLink(u: User, s: Settings, a: Addr, label: string): string {
  const f = front(s);
  const q = new URLSearchParams({
    security: "tls", sni: f, fp: "random", type: "ws", host: f,
    path: s.wsPath + "?ed=2048&proto=trojan",
  });
  return `trojan://${u.password}@${a.host}:${a.port}?${q.toString()}#${remark(s, label)}`;
}

function remark(s: Settings, label: string): string {
  const base = poolBaseName(s) || DEFAULT_REMARK;
  return encodeURIComponent(label ? `${base} · ${label}` : base);
}

/* ---------------------- variant assembly ---------------------- */

interface Variant {
  label: string; // "Domain" | "IPv4" | "IPv6"
  addrs: Addr[];
}

/** Build the per-protocol variant set (Domain + IPv4 + IPv6). */
function buildVariants(s: Settings, u: User): Variant[] {
  const f = front(s);
  const out: Variant[] = [{ label: "Domain", addrs: [{ host: f, port: 443 }] }];
  const v4 = pickIpv4Addrs(s, 1);
  if (v4.length) out.push({ label: "IPv4", addrs: v4 });
  const v6 = pickIpv6Addrs(s, 1);
  if (v6.length) out.push({ label: "IPv6", addrs: v6 });
  return out;
}

export interface NamedLink {
  label: string; // "Domain" | "IPv4" | "IPv6"
  kind: "vless" | "trojan";
  addr: Addr;
}

/** All (protocol × variant) links for a subscription. */
export function buildNamedLinks(u: User, s: Settings): NamedLink[] {
  const variants = buildVariants(s, u);
  const out: NamedLink[] = [];
  for (const v of variants) {
    for (const a of v.addrs) {
      if (s.protocols.vless) out.push({ label: v.label, kind: "vless", addr: a });
      if (s.protocols.trojan) out.push({ label: v.label, kind: "trojan", addr: a });
    }
  }
  return out;
}

/* ---------------------- base64 bundle (v2rayNG / Hiddify) ---------------------- */

export function buildBase64Bundle(u: User, s: Settings): string {
  const parts: string[] = [];
  for (const l of buildNamedLinks(u, s)) {
    parts.push(l.kind === "vless" ? vlessLink(u, s, l.addr, l.label) : trojanLink(u, s, l.addr, l.label));
  }
  return btoa(parts.join("\n")).replace(/=+$/, "");
}

/* ---------------------- Clash YAML ---------------------- */

export function buildClashYaml(u: User, s: Settings): string {
  const f = front(s);
  const base = configShortName(s);
  const names: string[] = [];
  let out = `# Nika Net — ${base}\nmixed-port: 7890\nallow-lan: false\nmode: rule\nlog-level: info\n` +
    `dns:\n  enable: true\n  enhanced-mode: fake-ip\n  nameserver: [1.1.1.1, 8.8.8.8]\nproxies:\n`;

  for (const l of buildNamedLinks(u, s)) {
    const name = `${base} - ${l.kind === "vless" ? "VLESS" : "Trojan"} · ${l.label}`;
    names.push(name);
    if (l.kind === "vless") {
      out += `  - name: "${name}"\n    type: vless\n    server: ${l.addr.host}\n    port: ${l.addr.port}\n    uuid: ${u.uuid}\n` +
        `    network: ws\n    tls: true\n    udp: false\n    servername: ${f}\n    client-fingerprint: random\n` +
        `    ws-opts:\n      path: "${s.wsPath}?ed=2048&proto=vless"\n      headers: { Host: "${f}" }\n`;
    } else {
      out += `  - name: "${name}"\n    type: trojan\n    server: ${l.addr.host}\n    port: ${l.addr.port}\n    password: ${u.password}\n` +
        `    network: ws\n    tls: true\n    udp: false\n    sni: ${f}\n    client-fingerprint: random\n` +
        `    ws-opts:\n      path: "${s.wsPath}?ed=2048&proto=trojan"\n      headers: { Host: "${f}" }\n`;
    }
  }

  const autoName = `⚡ ${base} — Auto`;
  const selName = `🎛 ${base} — Select`;
  out += `proxy-groups:\n  - name: "${autoName}"\n    type: url-test\n    url: https://www.gstatic.com/generate_204\n` +
    `    interval: 300\n    tolerance: 50\n    proxies: [${names.map((n) => `"${n}"`).join(", ")}]\n` +
    `  - name: "${selName}"\n    type: select\n    proxies: ["${autoName}", ${names.map((n) => `"${n}"`).join(", ")}]\n`;
  out += `rules:\n  - GEOIP,IR,DIRECT\n  - MATCH,${selName}\n`;
  return out;
}

/* ---------------------- sing-box JSON ---------------------- */

export function buildSingboxJson(u: User, s: Settings): string {
  const f = front(s);
  const base = configShortName(s);
  const outbounds: Record<string, unknown>[] = [];
  const tags: string[] = [];

  for (const l of buildNamedLinks(u, s)) {
    const name = `${base} - ${l.kind === "vless" ? "VLESS" : "Trojan"} · ${l.label}`;
    tags.push(name);
    if (l.kind === "vless") {
      outbounds.push({
        tag: name, type: "vless", server: l.addr.host, server_port: l.addr.port, uuid: u.uuid,
        network: "ws", tls: { enabled: true, server_name: f, utls: { enabled: true, fingerprint: "random" } },
        transport: { type: "ws", path: s.wsPath + "?ed=2048&proto=vless", headers: { Host: f } },
      });
    } else {
      outbounds.push({
        tag: name, type: "trojan", server: l.addr.host, server_port: l.addr.port, password: u.password,
        network: "ws", tls: { enabled: true, server_name: f, utls: { enabled: true, fingerprint: "random" } },
        transport: { type: "ws", path: s.wsPath + "?ed=2048&proto=trojan", headers: { Host: f } },
      });
    }
  }

  const auto = `⚡ ${base} — Auto`;
  const sel = `🎛 ${base} — Select`;
  outbounds.push(
    { tag: auto, type: "urltest", outbounds: tags, url: "https://www.gstatic.com/generate_204", interval: "5m", tolerance: 50 },
    { tag: sel, type: "selector", outbounds: [auto, ...tags] },
    { tag: "direct", type: "direct" }
  );
  const cfg = {
    log: { level: "info" },
    dns: { servers: [{ tag: "cf", address: "https://1.1.1.1/dns-query", detour: sel }] },
    outbounds,
    route: { rules: [{ geoip: "ir", outbound: "direct" }], final: sel },
  };
  return JSON.stringify(cfg, null, 2);
}

/* ---------------------- WireGuard (WARP) ---------------------- */

// WireGuard keys are 32 bytes (base64 = 44 chars). Derive a deterministic,
// syntactically valid key from the user's uuid+password.
function warpKey(u: User): string {
  const hex = (u.uuid.replace(/-/g, "") + (u.password || "")).slice(0, 64).padEnd(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16) || 0;
  let bin = "";
  for (let i = 0; i < 32; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function buildWarpConfig(u: User): string {
  return `[Interface]\nPrivateKey = ${warpKey(u)}\nAddress = 172.16.0.2/32, 2606:4700:110:8f3e:1c5e:9a2b:7d4f::/128\n` +
    `DNS = 1.1.1.1\nMTU = 1280\n\n[Peer]\nPublicKey = bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=\n` +
    `AllowedIPs = 0.0.0.0/0, ::/0\nEndpoint = engage.cloudflareclient.com:2408\n`;
}
