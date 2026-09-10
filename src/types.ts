// Nika Net — shared types
export interface User {
  id: string;
  name: string;
  uuid: string;        // VLESS uuid
  password: string;    // Trojan password
  quota: number;       // GB
  used: number;        // GB
  days: number;        // 0 = expired
  active: boolean;
  createdAt: number;
}

export interface Protocols {
  vless: boolean;
  trojan: boolean;
  warp: boolean;
}

export interface Settings {
  title: string;
  host: string;        // worker host (e.g. nika.example.workers.dev)
  sni: string;         // fake SNI / Host header
  wsPath: string;      // websocket path
  cleanIps: string[];  // verified Cloudflare anycast IPv4 edges (connect addresses)
  cleanIpv6: string[]; // verified Cloudflare anycast IPv6 edges (for the IPv6 config variant)
  fixedIp: string;     // locked connect address ("ip" or "ip:port") — configs use it instead of a random clean IP
  relayDomain: string; // chosen fronting domain ("دامنهٔ رله") — set by Relay Test
  poolIps: string[];   // best alive IPs applied from the Proxy IP Pool ("ip[:port]") — configs prefer them (CF-valid only)
  poolCountry: string; // ISO country code of the applied pool (e.g. "DE") — drives the config name flag
  poolFlag: string;    // emoji flag of the applied country (e.g. "🇩🇪") — prefixed to the config name
  protocols: Protocols;
  adminPassHash: string | null;
  secretPath: string;  // hidden admin path
  sessionSecret: string;
}

export interface Env {
  NIKA_DB?: D1Database;
  NIKA_KV?: KVNamespace;
  NIKA_ADMIN?: string;      // optional initial admin password secret
  [key: string]: unknown;
}

export const DEFAULTS: Settings = {
  title: "Nika Net",
  host: "nika.example.workers.dev",
  sni: "www.speedtest.net",
  wsPath: "/nika-ws",
  // Verified Cloudflare edge IPs (anycast TLS terminators). 1.0.0.1/1.1.1.1
  // are DNS resolvers, NOT TLS edges — they 403 all proxied traffic, so they
  // must never appear as connect addresses.
  cleanIps: ["188.114.96.9", "162.159.192.1", "104.17.147.22", "172.67.161.1"],
  // Verified Cloudflare anycast IPv6 edges (resolved from Cloudflare-fronted
  // domains). Anycast → nearest colo, same as the IPv4 edges.
  cleanIpv6: ["2606:4700::6810:7c60", "2606:4700::6810:7b60", "2606:4700::6812:1c07", "2606:4700:7::da"],
  fixedIp: "",
  relayDomain: "",
  poolIps: [],
  poolCountry: "",
  poolFlag: "",
  protocols: { vless: true, trojan: true, warp: false },
  adminPassHash: null,
  secretPath: "nika-admin",
  sessionSecret: "",
};
