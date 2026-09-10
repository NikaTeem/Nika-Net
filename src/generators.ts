// Nika Net — subscription config generators (server-side source of truth).
//
// v0.12 "Speed Engine": candidates are chosen for LOW PING + high throughput.
//  1. admin-locked fixed IP / pool IPs win (explicit choice),
//  2. otherwise, when the requester's location is known (request.cf), the
//     colo pool ranks Cloudflare datacenters by distance to the user and picks
//     the nearest ones → shortest RTT → highest effective throughput,
//  3. fall back to the clean-IP list, then the host.
// Subscriptions emit MULTIPLE ranked entries per protocol, and Clash/sing-box
// get a url-test/urltest group that auto-selects the fastest node.

import { Settings, User } from "./types";
import { isCloudflareIp } from "./cfips";
import * as colo from "./colo";

// Brand remark used on every generated config. When the admin applied a
// Proxy-IP-Pool country, configs are named "<flag> سرویس رایگان Nika Net"
// (e.g. "🇩🇪 سرویس رایگان Nika Net") so users instantly see the location.
const DEFAULT_REMARK = "Nika Paneel | یک سرویس رایگان هست";
const DEFAULT_SHORT = "Nika Paneel";

// How many ranked nodes per protocol a subscription carries.
export const MULTI = 3;

export interface Geo {
  lat?: number;
  lon?: number;
  country?: string;
  colo?: string;
}

export interface Addr {
  host: string;
  port: number;
  colo?: string;
  city?: string;
}

function poolBaseName(s: Settings): string {
  const f = (s.poolFlag || "").trim();
  return f ? `${f} سرویس رایگان Nika Net` : "";
}

function configRemark(s: Settings): string {
  return encodeURIComponent(poolBaseName(s) || DEFAULT_REMARK);
}

function configShortName(s: Settings): string {
  return poolBaseName(s) || DEFAULT_SHORT;
}

// A verified connect address = official Cloudflare edge OR a bundled
// verified-anycast "clean IP" (colo pool). Anything else can never front the
// worker (a datacenter IP answers for itself and the handshake fails).
function isAnycast(ip: string): boolean {
  return isCloudflareIp(ip) || colo.isBundledAnycast(ip);
}

const IP_PORT_RE = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d{1,5}))?$/;

function parseAddr(x: string): Addr | null {
  const t = (x || "").trim();
  const m = t.match(IP_PORT_RE);
  if (!m) return null;
  const o = m[1].split(".").map(Number);
  if (o.some((n) => n < 0 || n > 255)) return null;
  const port = m[2] ? Math.min(65535, Math.max(1, parseInt(m[2], 10))) : 443;
  return { host: m[1], port };
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick up to `n` connect addresses, best first.
 * Order: fixed IP → admin pool → colo-ranked (user geo) → clean IPs → host.
 */
export function pickAddrs(s: Settings, geo: Geo | null, n: number): Addr[] {
  // 1) locked fixed IP (admin "قفل IP ثابت")
  const fixed = (s.fixedIp || "").trim();
  if (fixed) {
    const a = parseAddr(fixed);
    if (a && isAnycast(a.host)) return [a];
  }

  // 2) admin-applied Proxy IP Pool ("بهترین IP ها") — explicit choice wins
  const pool = (s.poolIps || [])
    .map((x) => parseAddr(String(x)))
    .filter((a): a is Addr => !!a && isAnycast(a.host));
  if (pool.length) return shuffle(pool).slice(0, n);

  // 3) colo-aware ranking for the requester's location (the speed engine)
  if (geo && typeof geo.lat === "number" && typeof geo.lon === "number") {
    const ranked = colo.rankByDistance({ lat: geo.lat, lon: geo.lon }, n);
    if (ranked.length) return ranked;
  }

  // 4) clean IPs (admin list / scanner) — verified-anycast only
  const clean = (s.cleanIps || [])
    .filter(Boolean)
    .filter((ip) => isAnycast(ip));
  if (clean.length) {
    return shuffle(clean).slice(0, n).map((ip) => {
      const a = parseAddr(ip);
      return a ? a : { host: ip, port: 443 };
    });
  }

  // 5) host (the panel's own domain) — always reachable
  return [{ host: (s.host || "").trim() || "localhost", port: 443 }];
}

/** One connect address (backward-compatible single pick). */
function pickAddr(s: Settings, geo: Geo | null): Addr {
  return pickAddrs(s, geo, 1)[0];
}

// The domain that fronts this worker: the Relay-Test-selected domain wins,
// otherwise the panel host. TLS SNI + WS Host MUST be this domain so
// Cloudflare routes the connection to our worker. A clean IP is used only as
// the connect address (anycast → routed by SNI/Host).
function front(s: Settings): string {
  const r = (s.relayDomain || "").trim();
  return r || (s.host || "").trim();
}

/** "#<remark> · <city>" when a colo label is known. */
function remarkFor(s: Settings, a: Addr): string {
  const base = configRemark(s);
  return a.city ? `${base} · ${encodeURIComponent(a.city)}` : base;
}

export function vlessLink(u: User, s: Settings, a: Addr): string {
  const f = front(s);
  const q = new URLSearchParams({
    encryption: "none", security: "tls", sni: f, fp: "chrome",
    type: "ws", host: f, path: s.wsPath + "?ed=2048&proto=vless",
  });
  return `vless://${u.uuid}@${a.host}:${a.port}?${q.toString()}#${remarkFor(s, a)}`;
}

export function trojanLink(u: User, s: Settings, a: Addr): string {
  const f = front(s);
  const q = new URLSearchParams({
    security: "tls", sni: f, fp: "chrome", type: "ws", host: f,
    path: s.wsPath + "?ed=2048&proto=trojan",
  });
  return `trojan://${u.password}@${a.host}:${a.port}?${q.toString()}#${remarkFor(s, a)}`;
}

/* ---------------------- base64 bundle (v2rayNG & co.) ---------------------- */

export function buildBase64Bundle(u: User, s: Settings, geo: Geo | null = null): string {
  const addrs = pickAddrs(s, geo, MULTI);
  const parts: string[] = [];
  for (const a of addrs) {
    if (s.protocols.vless) parts.push(vlessLink(u, s, a));
    if (s.protocols.trojan) parts.push(trojanLink(u, s, a));
  }
  return btoa(parts.join("\n")).replace(/=+$/, "");
}

/* ---------------------- Clash YAML ---------------------- */

export function buildClashYaml(u: User, s: Settings, geo: Geo | null = null): string {
  const addrs = pickAddrs(s, geo, MULTI);
  const f = front(s);
  const base = configShortName(s);
  const names: string[] = [];
  let out = `# Nika Net — ${base}\nmixed-port: 7890\nallow-lan: false\nmode: rule\nlog-level: info\n` +
    `dns:\n  enable: true\n  enhanced-mode: fake-ip\n  nameserver: [1.1.1.1, 8.8.8.8]\nproxies:\n`;

  let i = 0;
  for (const a of addrs) {
    i++;
    const tag = a.city ? `${base} · ${a.city}` : base;
    if (s.protocols.vless) {
      const name = `${tag} - VLESS${i > 1 ? " " + i : ""}`;
      names.push(name);
      out += `  - name: "${name}"\n    type: vless\n    server: ${a.host}\n    port: ${a.port}\n    uuid: ${u.uuid}\n` +
        `    network: ws\n    tls: true\n    udp: false\n    servername: ${f}\n    client-fingerprint: chrome\n` +
        `    ws-opts:\n      path: "${s.wsPath}?ed=2048&proto=vless"\n      headers: { Host: "${f}" }\n`;
    }
    if (s.protocols.trojan) {
      const name = `${tag} - Trojan${i > 1 ? " " + i : ""}`;
      names.push(name);
      out += `  - name: "${name}"\n    type: trojan\n    server: ${a.host}\n    port: ${a.port}\n    password: ${u.password}\n` +
        `    network: ws\n    tls: true\n    udp: false\n    sni: ${f}\n    client-fingerprint: chrome\n` +
        `    ws-opts:\n      path: "${s.wsPath}?ed=2048&proto=trojan"\n      headers: { Host: "${f}" }\n`;
    }
  }

  // url-test group: auto-picks the lowest-latency node (real low-ping select)
  const autoName = `⚡ ${base} — Auto`;
  const selName = `🎛 ${base} — Select`;
  out += `proxy-groups:\n  - name: "${autoName}"\n    type: url-test\n    url: https://www.gstatic.com/generate_204\n` +
    `    interval: 300\n    tolerance: 50\n    proxies: [${names.map((n) => `"${n}"`).join(", ")}]\n` +
    `  - name: "${selName}"\n    type: select\n    proxies: ["${autoName}", ${names.map((n) => `"${n}"`).join(", ")}]\n`;
  out += `rules:\n  - GEOIP,IR,DIRECT\n  - MATCH,${selName}\n`;
  return out;
}

/* ---------------------- sing-box JSON ---------------------- */

export function buildSingboxJson(u: User, s: Settings, geo: Geo | null = null): string {
  const addrs = pickAddrs(s, geo, MULTI);
  const f = front(s);
  const base = configShortName(s);
  const outbounds: Record<string, unknown>[] = [];
  const tags: string[] = [];

  let i = 0;
  for (const a of addrs) {
    i++;
    const tag = a.city ? `${base} · ${a.city}` : base;
    if (s.protocols.vless) {
      const name = `${tag} - VLESS${i > 1 ? " " + i : ""}`;
      tags.push(name);
      outbounds.push({
        tag: name, type: "vless", server: a.host, server_port: a.port, uuid: u.uuid,
        network: "ws", tls: { enabled: true, server_name: f, utls: { enabled: true, fingerprint: "chrome" } },
        transport: { type: "ws", path: s.wsPath + "?ed=2048&proto=vless", headers: { Host: f } },
      });
    }
    if (s.protocols.trojan) {
      const name = `${tag} - Trojan${i > 1 ? " " + i : ""}`;
      tags.push(name);
      outbounds.push({
        tag: name, type: "trojan", server: a.host, server_port: a.port, password: u.password,
        network: "ws", tls: { enabled: true, server_name: f, utls: { enabled: true, fingerprint: "chrome" } },
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
