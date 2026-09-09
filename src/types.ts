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
  cleanIps: string[];
  relayDomain: string; // chosen fronting domain ("دامنهٔ رله") — set by Relay Test
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
  cleanIps: ["1.0.0.1", "104.16.132.229", "188.114.96.9"],
  relayDomain: "",
  protocols: { vless: true, trojan: true, warp: true },
  adminPassHash: null,
  secretPath: "nika-admin",
  sessionSecret: "",
};
