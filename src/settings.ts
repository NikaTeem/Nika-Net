// Nika Net — settings & users persistence.
// Priority: D1 (NIKA_DB) → KV (NIKA_KV) → in-memory (local dev).

import { Settings, User, Env, DEFAULTS } from "./types";

const cache = new Map<string, string>();
const mem = new Map<string, string>();

async function d1get(env: Env, key: string): Promise<string | null> {
  try {
    const r = await env.NIKA_DB!.prepare("SELECT value FROM kv WHERE key = ?1").bind(key).first<{ value: string }>();
    return r ? r.value : null;
  } catch {
    return null;
  }
}
async function d1put(env: Env, key: string, value: string): Promise<void> {
  try {
    await env.NIKA_DB!.prepare(
      "INSERT INTO kv (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).bind(key, value).run();
  } catch {
    /* ignore */
  }
}

async function rawGet(env: Env, key: string): Promise<string | null> {
  if (cache.has(key)) return cache.get(key)!;
  let v: string | null = null;
  if (env.NIKA_DB) v = await d1get(env, key);
  else if (env.NIKA_KV) v = await env.NIKA_KV.get(key);
  else v = mem.get(key) ?? null;
  if (v !== null) cache.set(key, v);
  return v;
}

async function rawPut(env: Env, key: string, value: string): Promise<void> {
  cache.set(key, value);
  if (env.NIKA_DB) await d1put(env, key, value);
  else if (env.NIKA_KV) await env.NIKA_KV.put(key, value);
  else mem.set(key, value);
}

export async function getSettings(env: Env): Promise<Settings> {
  const raw = await rawGet(env, "settings");
  const base = { ...DEFAULTS };
  if (raw) {
    try { Object.assign(base, JSON.parse(raw)); } catch { /* corrupt → defaults */ }
  }
  if (!base.sessionSecret) {
    base.sessionSecret = crypto.randomUUID();
    await rawPut(env, "settings", JSON.stringify(base));
  }
  return base;
}

export async function saveSettings(env: Env, s: Settings): Promise<void> {
  await rawPut(env, "settings", JSON.stringify(s));
}

export async function getUsers(env: Env): Promise<User[]> {
  const raw = await rawGet(env, "users");
  if (!raw) return [];
  try { return JSON.parse(raw) as User[]; } catch { return []; }
}

export async function saveUsers(env: Env, users: User[]): Promise<void> {
  await rawPut(env, "users", JSON.stringify(users));
}

/* ---------- counters (real metrics) ---------- */
export async function getCounter(env: Env, key: string): Promise<number> {
  const raw = await rawGet(env, key);
  const n = parseInt(raw || "0", 10);
  return isNaN(n) ? 0 : n;
}

export async function incrementCounter(env: Env, key: string, delta: number): Promise<number> {
  const cur = await getCounter(env, key);
  const next = cur + delta;
  await rawPut(env, key, String(next));
  return next;
}

/* ---------- json helpers (activity log) ---------- */
export async function getJson<T>(env: Env, key: string): Promise<T | null> {
  const raw = await rawGet(env, key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function putJson(env: Env, key: string, value: unknown): Promise<void> {
  await rawPut(env, key, JSON.stringify(value));
}
