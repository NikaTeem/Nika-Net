// Nika Net — subscription config generators (server-side source of truth).
// Mirrored in ui/index.html for the in-panel preview.

import { Settings, User } from "./types";

function pickIp(s: Settings): string {
  const list = (s.cleanIps || []).filter(Boolean);
  return list.length ? list[Math.floor(Math.random() * list.length)] : s.host;
}

export function vlessLink(u: User, s: Settings): string {
  const host = pickIp(s);
  const q = new URLSearchParams({
    encryption: "none", security: "tls", sni: s.sni, fp: "chrome",
    type: "ws", host: s.sni, path: s.wsPath + "?ed=2048",
  });
  return `vless://${u.uuid}@${host}:443?${q.toString()}#NikaNet-${encodeURIComponent(u.name)}`;
}

export function trojanLink(u: User, s: Settings): string {
  const host = pickIp(s);
  const q = new URLSearchParams({
    security: "tls", sni: s.sni, fp: "chrome", type: "ws", host: s.sni, path: s.wsPath + "?ed=2048",
  });
  return `trojan://${u.password}@${host}:443?${q.toString()}#NikaNet-${encodeURIComponent(u.name)}`;
}

export function buildBase64Bundle(u: User, s: Settings): string {
  const parts: string[] = [];
  if (s.protocols.vless) parts.push(vlessLink(u, s));
  if (s.protocols.trojan) parts.push(trojanLink(u, s));
  return btoa(parts.join("\n")).replace(/=+$/, "");
}

export function buildClashYaml(u: User, s: Settings): string {
  const host = pickIp(s);
  const names: string[] = [];
  let out = `# Nika Net — ${u.name}\nmixed-port: 7890\nallow-lan: false\nmode: rule\nlog-level: info\n` +
    `dns:\n  enable: true\n  enhanced-mode: fake-ip\n  nameserver: [1.1.1.1, 8.8.8.8]\nproxies:\n`;
  if (s.protocols.vless) {
    names.push(`NikaNet-VLESS`);
    out += `  - name: "NikaNet-VLESS"\n    type: vless\n    server: ${host}\n    port: 443\n    uuid: ${u.uuid}\n` +
      `    network: ws\n    tls: true\n    udp: true\n    servername: ${s.sni}\n    client-fingerprint: chrome\n` +
      `    ws-opts:\n      path: "${s.wsPath}?ed=2048"\n      headers: { Host: "${s.sni}" }\n`;
  }
  if (s.protocols.trojan) {
    names.push(`NikaNet-Trojan`);
    out += `  - name: "NikaNet-Trojan"\n    type: trojan\n    server: ${host}\n    port: 443\n    password: ${u.password}\n` +
      `    network: ws\n    tls: true\n    udp: true\n    sni: ${s.sni}\n    client-fingerprint: chrome\n` +
      `    ws-opts:\n      path: "${s.wsPath}?ed=2048"\n      headers: { Host: "${s.sni}" }\n`;
  }
  out += `proxy-groups:\n  - name: "NikaNet"\n    type: select\n    proxies: [${names.map((n) => `"${n}"`).join(", ")}]\n`;
  out += `rules:\n  - GEOIP,IR,DIRECT\n  - MATCH,NikaNet\n`;
  return out;
}

export function buildSingboxJson(u: User, s: Settings): string {
  const host = pickIp(s);
  const outbounds: Record<string, unknown>[] = [];
  const tags: string[] = [];
  if (s.protocols.vless) {
    tags.push("NikaNet-VLESS");
    outbounds.push({
      tag: "NikaNet-VLESS", type: "vless", server: host, server_port: 443, uuid: u.uuid,
      network: "ws", tls: { enabled: true, server_name: s.sni, utls: { enabled: true, fingerprint: "chrome" } },
      transport: { type: "ws", path: s.wsPath + "?ed=2048", headers: { Host: s.sni } },
    });
  }
  if (s.protocols.trojan) {
    tags.push("NikaNet-Trojan");
    outbounds.push({
      tag: "NikaNet-Trojan", type: "trojan", server: host, server_port: 443, password: u.password,
      network: "ws", tls: { enabled: true, server_name: s.sni, utls: { enabled: true, fingerprint: "chrome" } },
      transport: { type: "ws", path: s.wsPath + "?ed=2048", headers: { Host: s.sni } },
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

export function buildWarpConfig(u: User): string {
  return `[Interface]\nPrivateKey = ${u.password.slice(0, 43)}\nAddress = 172.16.0.2/32, 2606:4700:110:8f3e:1c5e:9a2b:7d4f::/128\n` +
    `DNS = 1.1.1.1\nMTU = 1280\n\n[Peer]\nPublicKey = bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=\n` +
    `AllowedIPs = 0.0.0.0/0, ::/0\nEndpoint = engage.cloudflareclient.com:2408\n`;
}
