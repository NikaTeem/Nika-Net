// Nika Net — subscription config generators (server-side source of truth).

import { Settings, User } from "./types";
import { isCloudflareIp } from "./cfips";

// Brand remark used on every generated config. When the admin applied a
// Proxy-IP-Pool country, configs are named "<flag> سرویس رایگان Nika Net"
// (e.g. "🇩🇪 سرویس رایگان Nika Net") so users instantly see the location.
const DEFAULT_REMARK = "Nika Paneel | یک سرویس رایگان هست";
const DEFAULT_SHORT = "Nika Paneel";

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

// Only Cloudflare edge IPs can front the worker (anycast → routed by SNI/Host).
function pickIp(s: Settings): string {
  const list = (s.cleanIps || []).filter(Boolean).filter(isCloudflareIp);
  return list.length ? list[Math.floor(Math.random() * list.length)] : s.host;
}

// Connect address + port. When the admin locks a "fixed IP" (ip or ip:port)
// the configs always use it — stable, fast, no random rotation. Otherwise
// pick a random clean IP on 443.
//
// Hard rule: the address must be a Cloudflare edge IP, otherwise the config
// can never reach this worker. A locked datacenter IP is ignored and the
// config falls back to a clean Cloudflare IP — never a broken config.
function pickAddr(s: Settings): { host: string; port: number } {
  const fixed = (s.fixedIp || "").trim();
  if (fixed) {
    const m = fixed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d{1,5}))?$/);
    if (m) {
      const o = m[1].split(".").map(Number);
      if (o.every((x) => x >= 0 && x <= 255) && isCloudflareIp(m[1])) {
        const port = m[2] ? Math.min(65535, Math.max(1, parseInt(m[2], 10))) : 443;
        return { host: m[1], port };
      }
    }
  }
  // Proxy-IP-Pool "best IPs" (applied by the admin). Only Cloudflare-valid
  // entries can front the worker — datacenter IPs are silently skipped so a
  // pool selection can never produce a broken config.
  const pool = (s.poolIps || [])
    .map((x) => String(x).trim())
    .filter((x) => /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d{1,5}))?$/.test(x))
    .filter((x) => isCloudflareIp(x.split(":")[0]));
  if (pool.length) {
    const c = pool[Math.floor(Math.random() * pool.length)];
    const m = c.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d{1,5}))?$/);
    if (m) {
      const port = m[2] ? Math.min(65535, Math.max(1, parseInt(m[2], 10))) : 443;
      return { host: m[1], port };
    }
  }
  return { host: pickIp(s), port: 443 };
}

// The domain that fronts this worker: the Relay-Test-selected domain wins,
// otherwise the panel host. TLS SNI + WS Host MUST be this domain so
// Cloudflare routes the connection to our worker. A clean IP is used only as
// the connect address (anycast → routed by SNI/Host).
function front(s: Settings): string {
  const r = (s.relayDomain || "").trim();
  return r || (s.host || "").trim();
}

export function vlessLink(u: User, s: Settings): string {
  const a = pickAddr(s);
  const f = front(s);
  const q = new URLSearchParams({
    encryption: "none", security: "tls", sni: f, fp: "chrome",
    type: "ws", host: f, path: s.wsPath + "?ed=2048&proto=vless",
  });
  return `vless://${u.uuid}@${a.host}:${a.port}?${q.toString()}#${configRemark(s)}`;
}

export function trojanLink(u: User, s: Settings): string {
  const a = pickAddr(s);
  const f = front(s);
  const q = new URLSearchParams({
    security: "tls", sni: f, fp: "chrome", type: "ws", host: f,
    path: s.wsPath + "?ed=2048&proto=trojan",
  });
  return `trojan://${u.password}@${a.host}:${a.port}?${q.toString()}#${configRemark(s)}`;
}

export function buildBase64Bundle(u: User, s: Settings): string {
  const parts: string[] = [];
  if (s.protocols.vless) parts.push(vlessLink(u, s));
  if (s.protocols.trojan) parts.push(trojanLink(u, s));
  return btoa(parts.join("\n")).replace(/=+$/, "");
}

export function buildClashYaml(u: User, s: Settings): string {
  const a = pickAddr(s);
  const f = front(s);
  const base = configShortName(s);
  const names: string[] = [];
  let out = `# Nika Net — ${base}\nmixed-port: 7890\nallow-lan: false\nmode: rule\nlog-level: info\n` +
    `dns:\n  enable: true\n  enhanced-mode: fake-ip\n  nameserver: [1.1.1.1, 8.8.8.8]\nproxies:\n`;
  if (s.protocols.vless) {
    names.push(`${base} - VLESS`);
    out += `  - name: "${base} - VLESS"\n    type: vless\n    server: ${a.host}\n    port: ${a.port}\n    uuid: ${u.uuid}\n` +
      `    network: ws\n    tls: true\n    udp: false\n    servername: ${f}\n    client-fingerprint: chrome\n` +
      `    ws-opts:\n      path: "${s.wsPath}?ed=2048&proto=vless"\n      headers: { Host: "${f}" }\n`;
  }
  if (s.protocols.trojan) {
    names.push(`${base} - Trojan`);
    out += `  - name: "${base} - Trojan"\n    type: trojan\n    server: ${a.host}\n    port: ${a.port}\n    password: ${u.password}\n` +
      `    network: ws\n    tls: true\n    udp: false\n    sni: ${f}\n    client-fingerprint: chrome\n` +
      `    ws-opts:\n      path: "${s.wsPath}?ed=2048&proto=trojan"\n      headers: { Host: "${f}" }\n`;
  }
  out += `proxy-groups:\n  - name: "${base}"\n    type: select\n    proxies: [${names.map((n) => `"${n}"`).join(", ")}]\n`;
  out += `rules:\n  - GEOIP,IR,DIRECT\n  - MATCH,${base}\n`;
  return out;
}

export function buildSingboxJson(u: User, s: Settings): string {
  const a = pickAddr(s);
  const f = front(s);
  const base = configShortName(s);
  const outbounds: Record<string, unknown>[] = [];
  const tags: string[] = [];
  if (s.protocols.vless) {
    tags.push(`${base} - VLESS`);
    outbounds.push({
      tag: `${base} - VLESS`, type: "vless", server: a.host, server_port: a.port, uuid: u.uuid,
      network: "ws", tls: { enabled: true, server_name: f, utls: { enabled: true, fingerprint: "chrome" } },
      transport: { type: "ws", path: s.wsPath + "?ed=2048&proto=vless", headers: { Host: f } },
    });
  }
  if (s.protocols.trojan) {
    tags.push(`${base} - Trojan`);
    outbounds.push({
      tag: `${base} - Trojan`, type: "trojan", server: a.host, server_port: a.port, password: u.password,
      network: "ws", tls: { enabled: true, server_name: f, utls: { enabled: true, fingerprint: "chrome" } },
      transport: { type: "ws", path: s.wsPath + "?ed=2048&proto=trojan", headers: { Host: f } },
    });
  }
  const cfg = {
    log: { level: "info" },
    dns: { servers: [{ tag: "cf", address: "https://1.1.1.1/dns-query", detour: "select" }] },
    outbounds: outbounds.concat([
      { tag: "select", type: "selector", outbounds: tags },
      { tag: "direct", type: "direct" },
    ]),
    route: { rules: [{ geoip: "ir", outbound: "direct" }], final: "select" },
  };
  return JSON.stringify(cfg, null, 2);
}

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
