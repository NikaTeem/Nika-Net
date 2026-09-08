// Nika Net Launcher — per-user state machine (persisted in KV).

import { Env } from "./types";
import { CfAccount } from "./cloudflare";

export interface PanelRecord {
  name: string;
  url: string;
  account: string;
  createdAt: number;
}

export type StateName = "idle" | "await_token" | "await_save" | "await_name" | "await_subdomain";

export interface UserState {
  state: StateName;
  tokenEnc?: string;          // AES-GCM encrypted Cloudflare token
  tokenTail?: string;         // last 4 chars (display only)
  saved?: boolean;            // did the user opt to persist the token?
  accounts?: CfAccount[];
  accountId?: string;
  pendingName?: string;
  panels: PanelRecord[];
}

const PREFIX = "u:";

const DEFAULT: UserState = { state: "idle", panels: [] };

export async function getState(env: Env, chatId: number): Promise<UserState> {
  try {
    const raw = await env.BOT_KV.get(PREFIX + chatId);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<UserState>) };
  } catch {
    return { ...DEFAULT };
  }
}

export async function saveState(env: Env, chatId: number, s: UserState): Promise<void> {
  await env.BOT_KV.put(PREFIX + chatId, JSON.stringify(s));
}
