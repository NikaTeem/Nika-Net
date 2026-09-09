// Nika Net Launcher — per-user state machine (persisted in KV).

import { Env } from "./types";
import { CfAccount } from "./cloudflare";

export interface TokenRecord {
  name: string;
  enc: string;        // AES-GCM encrypted Cloudflare token
  tail: string;       // last 4 chars (display only)
  accounts: CfAccount[];
  accountId?: string; // chosen account when a token spans several
  created: number;
}

export interface PanelAuth { enc: string; saved: boolean }

export interface PanelRecord {
  name: string;
  url: string;        // https://name.sub.workers.dev/admin
  base: string;       // https://name.sub.workers.dev
  account: string;    // account id
  accountName?: string;
  kvId?: string;
  bundleVer?: string;
  createdAt: number;
  health?: { ok: boolean; ms: number };
}

export type StateName =
  | "idle"
  | "await_token"
  | "await_save"
  | "await_name"
  | "await_subdomain"
  | "await_panel_pass"
  | "await_uname"
  | "await_uquota"
  | "await_uexp";

export type SkinId = "graphite" | "neon" | "paper";

export interface UserState {
  state: StateName;
  lang: "fa" | "en";
  skin?: SkinId; // launcher skin — mirrors nika_launcher_pro.HYPER's SKINS
  tokens: Record<string, TokenRecord>;
  activeToken?: string;
  panels: PanelRecord[];
  panelAuth: Record<string, PanelAuth>;
  lastBuild: number;
  builds: number;
  tmp: Record<string, any>; // flow scratchpad (suggest, name, sub, upanel, …)
}

const PREFIX = "u:";

const DEFAULT: UserState = {
  state: "idle",
  lang: "fa",
  skin: "graphite",
  tokens: {},
  activeToken: undefined,
  panels: [],
  panelAuth: {},
  lastBuild: 0,
  builds: 0,
  tmp: {},
};

/* migrate v0 state (single token + flat panels) into the new shape */
function normalize(raw: Partial<any>): UserState {
  const s: UserState = { ...DEFAULT, ...raw };
  if (!s.tokens) s.tokens = {};
  if (!s.panels) s.panels = [];
  if (!s.panelAuth) s.panelAuth = {};
  if (!s.tmp) s.tmp = {};

  // legacy single-token → tokens map
  if (raw.tokenEnc && Object.keys(s.tokens).length === 0) {
    const rec: TokenRecord = {
      name: "توکن", enc: raw.tokenEnc, tail: raw.tokenTail || "····",
      accounts: raw.accounts || [], accountId: raw.accountId, created: Date.now(),
    };
    s.tokens["t1"] = rec;
    s.activeToken = "t1";
  }

  // legacy panel shape {name,url,account,createdAt} → enriched
  s.panels = s.panels.map((p: any) => ({
    name: p.name,
    url: p.url,
    base: p.base || String(p.url || "").replace(/\/admin\/?$/, ""),
    account: p.account,
    accountName: p.accountName,
    kvId: p.kvId,
    bundleVer: p.bundleVer,
    createdAt: p.createdAt || Date.now(),
    health: p.health,
  }));
  return s;
}

export async function getState(env: Env, chatId: number): Promise<UserState> {
  try {
    const raw = await env.BOT_KV.get(PREFIX + chatId);
    if (!raw) return { ...DEFAULT };
    return normalize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT };
  }
}

export async function saveState(env: Env, chatId: number, s: UserState): Promise<void> {
  await env.BOT_KV.put(PREFIX + chatId, JSON.stringify(s));
}

/* ---------- owner (first user to /start) ---------- */
export async function getOwner(env: Env): Promise<number | null> {
  const raw = await env.BOT_KV.get("owner");
  return raw ? parseInt(raw, 10) : null;
}

export async function setOwner(env: Env, chatId: number): Promise<void> {
  await env.BOT_KV.put("owner", String(chatId));
}
