// Nika Net — subscription config generators (server-side source of truth).

import { Settings, User } from "./types";

// Brand remark used on every generated config.
const REMARK = "Nika Paneel | یک سرویس رایگان هست";
const remark = encodeURIComponent(REMARK);

function pickIp(s: Settings): string {
  const list = (s.cleanIps || []).filter(Boolean);
  return list.length ? list[Math.floor(Math.random() * list.length)] : s.host;
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
  const host = pickIp(s);
  const f = front(s);
  const q = new URLSearchParams({
    encryption: "none", security: "tls", sni: f, fp: "chrome",
    type: "ws", host: f, path: s.wsPath + "?ed=2048&proto=vless",
  });
  return `vless://${u.uuid}@${host}:443?${q.toString()}#${remark}`;
}

export function trojanLink(u: User, s: Settings): string {
  const host = pickIp(s);
  const f = front(s);
  const q = new URLSearchParams({
    security: "tls", sni: f, fp: "chrome", type: "ws", host: f,
    path: s.wsPath + "?ed=2048&proto=trojan",
  });
  return `trojan://${u.password}@${host}:443?${q.toString()}#${remark}`;
}

export function buildBase64Bundle(u: User, s: Settings): string {
  const parts: string[] = [];
  if (s.protocols.vless) parts.push(vlessLink(u, s));
  if (s.protocols.trojan) parts.push(trojanLink(u, s));
  return btoa(parts.join("\n")).replace(/=+$/, "");
}

export function buildClashYaml(u: User, s: Settings): string {
  const host = pickIp(s);
  const f = front(s);
  const names: string[] = [];
  let out = `# Nika Net — ${REMARK}\nmixed-port: 7890\nallow-lan: false\nmode: rule\nlog-level: info\n` +
    `dns:\n  enable: true\n  enhanced-mode: fake-ip\n  nameserver: [1.1.1.1, 8.8.8.8]\nproxies:\n`;
  if (s.protocols.vless) {
    names.push(`Nika Paneel - VLESS`);
    out += `  - name: "Nika Paneel - VLESS"\n    type: vless\n    server: ${host}\n    port: 443\n    uuid: ${u.uuid}\n` +
      `    network: ws\n    tls: true\n    udp: false\n    servername: ${f}\n    client-fingerprint: chrome\n` +
      `    ws-opts:\n      path: "${s.wsPath}?ed=2048&proto=vless"\n      headers: { Host: "${f}" }\n`;
  }
  if (s.protocols.trojan) {
    names.push(`Nika Paneel - Trojan`);
    out += `  - name: "Nika Paneel - Trojan"\n    type: trojan\n    server: ${host}\n    port: 443\n    password: ${u.password}\n` +
      `    network: ws\n    tls: true\n    udp: false\n    sni: ${f}\n    client-fingerprint: chrome\n` +
      `    ws-opts:\n      path: "${s.wsPath}?ed=2048&proto=trojan"\n      headers: { Host: "${f}" }\n`;
  }
  out += `proxy-groups:\n  - name: "Nika Paneel"\n    type: select\n    proxies: [${names.map((n) => `"${n}"`).join(", ")}]\n`;
  out += `rules:\n  - GEOIP,IR,DIRECT\n  - MATCH,Nika Paneel\n`;
  return out;
}

export function buildSingboxJson(u: User, s: Settings): string {
  const host = pickIp(s);
  const f = front(s);
  const outbounds: Record<string, unknown>[] = [];
  const tags: string[] = [];
  if (s.protocols.vless) {
    tags.push("Nika Paneel - VLESS");
    outbounds.push({
      tag: "Nika Paneel - VLESS", type: "vless", server: host, server_port: 443, uuid: u.uuid,
      network: "ws", tls: { enabled: true, server_name: f, utls: { enabled: true, fingerprint: "chrome" } },
      transport: { type: "ws", path: s.wsPath + "?ed=2048&proto=vless", headers: { Host: f } },
    });
  }
  if (s.protocols.trojan) {
    tags.push("Nika Paneel - Trojan");
    outbounds.push({
      tag: "Nika Paneel - Trojan", type: "trojan", server: host, server_port: 443, password: u.password,
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
