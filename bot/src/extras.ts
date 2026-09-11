// Nika Net Launcher — HYPER ✨ extras ported from nika_launcher_pro.
// Everything here reads REAL panel/API data — no fabricated numbers.

import { Env } from "./types";
import * as panel from "./panel";
import { UserState } from "./state";
import { decryptText } from "./crypto";

/* ---------------- shared constants (mirrors nika_launcher_pro) ---------------- */

export const CF_LIMIT = 100_000;   // Workers free tier — daily requests counted by the panel itself
export const CF_WARN = 0.8;
export const PIN_TTL = 20 * 60;    // unlock window (seconds)
export const WARP_PUB = "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=";

export const ISP_PRESETS: Record<string, { fa: string; en: string; flag: string; sni: string[] }> = {
  mci:      { fa: "همراه اول", en: "MCI",      flag: "🟢", sni: ["www.speedtest.net", "api.telegram.org", "ftp.mci.ir"] },
  irancell: { fa: "ایرانسل",   en: "Irancell", flag: "🟣", sni: ["www.speedtest.net", "t.me", "mtnirancell.ir"] },
  rightel:  { fa: "رایتل",     en: "Rightel",  flag: "🔵", sni: ["www.speedtest.net", "rightel.ir", "t.me"] },
  tci:      { fa: "اسیاتک/مخابرات", en: "TCI", flag: "🟠", sni: ["www.speedtest.net", "tci.ir", "ftp.tci.ir"] },
};

export const DOH_URLS: Record<string, string> = {
  adguard: "dns.adguard-dns.com",
  nextdns: "dns.nextdns.io",
  controld: "freedns.controld.com/p2",
};

export const FRAG_PRESET =
  "v2rayNG → Settings → TLS → Fragment:\n" +
  "packets=tlshello\nlength=100-200\ninterval=10-20\n\n" +
  "sing-box outbounds:\n" +
  "'fragment': {\"packets\": \"tlshello\", \"length\": \"100-200\", \"interval\": \"10-20\"}";

/* ---------------- panel session (login with the saved password) ---------------- */

export interface PanelSession { ok: boolean; base: string; cookie: string; err: string }

export async function panelSession(env: Env, s: UserState, pname: string): Promise<PanelSession> {
  const p = s.panels.find((x) => x.name === pname);
  if (!p) return { ok: false, base: "", cookie: "", err: "?" };
  const a = s.panelAuth[pname];
  if (!a) return { ok: false, base: p.base, cookie: "", err: "nopass" };
  try {
    const pw = await decryptText(env.NIKA_SECRET, a.enc);
    const r = await panel.panelLogin(p.base, pw);
    return { ok: r.ok, base: p.base, cookie: r.cookie, err: r.err };
  } catch {
    return { ok: false, base: p.base, cookie: "", err: "badenc" };
  }
}

/* ---------------- raw panel reads ---------------- */

export interface PanelStatus {
  title?: string; users?: number; active?: number; usedGb?: number;
  requestsToday?: number; requestsTotal?: number; protocols?: Record<string, boolean>; version?: string;
}

export async function statusOf(base: string, cookie: string): Promise<PanelStatus | null> {
  const r = await panel.panelApi(base, cookie, "GET", "/api/status");
  if (r.status !== 200 || !r.json || typeof r.json !== "object") return null;
  return r.json as PanelStatus;
}

export async function usersOf(base: string, cookie: string): Promise<any[] | null> {
  const r = await panel.panelApi(base, cookie, "GET", "/api/users");
  return r.status === 200 && Array.isArray(r.json) ? (r.json as any[]) : null;
}

export async function settingsOf(base: string, cookie: string): Promise<any | null> {
  const r = await panel.panelApi(base, cookie, "GET", "/api/settings");
  return r.status === 200 && r.json && typeof r.json === "object" ? r.json : null;
}

export async function patchSettings(base: string, cookie: string, patch: Record<string, unknown>): Promise<{ ok: boolean; err: string }> {
  const r = await panel.panelApi(base, cookie, "POST", "/api/settings", patch);
  if (r.status !== 200 || !r.json?.ok) return { ok: false, err: (r.json?.error as string) || `HTTP ${r.status}` };
  return { ok: true, err: "" };
}

/* ---------------- roadmap (live from the repo) ---------------- */

const ROADMAP_RAW = "https://raw.githubusercontent.com/NikaTeem/Nika-Net/main/ROADMAP.md";

export async function fetchRoadmap(): Promise<string | null> {
  try {
    const r = await fetch(ROADMAP_RAW, { cf: { cacheTtl: 600 } } as RequestInit);
    if (!r.ok) return null;
    const md = (await r.text()).slice(0, 12000);
    const items = [...md.matchAll(/^\s*[-*] \[([ xX])\] (.+)$/gm)];
    if (!items.length) return null;
    const done = items.filter((m) => m[1].toLowerCase() === "x").length;
    const lines = items.slice(0, 20).map((m) => {
      const txt = (m[2] || "").trim().slice(0, 70);
      return `${m[1].toLowerCase() === "x" ? "✅" : "⏳"} ${txt.replace(/[<>&]/g, (c) => c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;")}`;
    });
    return [`☑️ ${done} / ${items.length}`, ...lines].join("\n");
  } catch {
    return null;
  }
}

/* ---------------- pin (soft launcher lock) ---------------- */

export async function pinHash(env: Env, pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${env.NIKA_SECRET}:${pin}`);
  const d = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(d)));
}

/* ---------------- WARP config (bit-identical to the panel's buildWarpConfig) ---------------- */

export function warpConfig(user: { uuid?: string; password?: string }): string {
  const hex = ((user.uuid || "").replace(/-/g, "") + (user.password || "")).slice(0, 64).padEnd(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16) || 0;
  let bin = "";
  for (let i = 0; i < 32; i++) bin += String.fromCharCode(bytes[i]);
  return (
    `[Interface]\nPrivateKey = ${btoa(bin)}\nAddress = 172.16.0.2/32, 2606:4700:110:8f3e:1c5e:9a2b:7d4f::/128\n` +
    `DNS = 1.1.1.1\nMTU = 1280\n\n[Peer]\nPublicKey = ${WARP_PUB}\n` +
    `AllowedIPs = 0.0.0.0/0, ::/0\nEndpoint = engage.cloudflareclient.com:2408\n`
  );
}

/* ---------------- subscription status (public /sub/<token> probe) ---------------- */

export interface SubStatus { ok: boolean; name?: string; proto?: string; error?: string }

export async function subStatus(link: string): Promise<SubStatus> {
  try {
    const u = new URL(link);
    if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, error: "badurl" };
    const r = await fetch(u.toString(), { headers: { "User-Agent": "NikaLauncher/1.0", "Accept": "text/plain" } });
    if (r.status !== 200) return { ok: false, error: `HTTP ${r.status}` };
    const ct = r.headers.get("content-type") || "";
    const proto = ct.includes("yaml") ? "clash" : ct.includes("json") ? "sing-box" : "base64";
    const body = await r.text();
    // try to read the real name from the config (sing-box/clash carry "name")
    let name: string | undefined;
    const m = body.match(/"(?:name|remark)"\s*:\s*"([^"]{1,60})"/) || body.match(/(?:#|remark:\s*)([A-Za-z0-9_\-.\u0600-\u06FF ]{1,60})/);
    if (m) name = m[1].trim();
    return { ok: true, name, proto };
  } catch (e: any) {
    return { ok: false, error: `net: ${e?.message || e}` };
  }
}
