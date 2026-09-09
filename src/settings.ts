// Nika Net — settings & users persistence.
// Priority: D1 (NIKA_DB) → KV (NIKA_KV) → in-memory (local dev).

import { Settings, User, Env, DEFAULTS } from "./types";

// In-memory cache with a SHORT TTL. Workers run on many isolates and KV writes
// are eventually consistent, so an unbounded cache would serve stale settings
// (e.g. an old fixed-IP lock) for the isolate's whole lifetime. 3 s keeps reads
// fast while bounding staleness to the blink of an eye.
const CACHE_TTL = 3000;
const cache = new Map<string, { v: string; at: number }>();
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
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.v;
  let v: string | null = null;
  if (env.NIKA_DB) v = await d1get(env, key);
  // cacheTtl:30 is the KV minimum — shrinks the edge-cache staleness window
  // (default is 60 s) so settings changes like the fixed-IP lock propagate
  // quickly across isolates.
  else if (env.NIKA_KV) v = await env.NIKA_KV.get(key, { cacheTtl: 30 });
  else v = mem.get(key) ?? null;
  if (v !== null) cache.set(key, { v, at: Date.now() });
  return v;
}

async function rawPut(env: Env, key: string, value: string): Promise<void> {
  cache.set(key, { v: value, at: Date.now() });
  if (env.NIKA_DB) await d1put(env, key, value);
  else if (env.NIKA_KV) await env.NIKA_KV.put(key, value);
  else mem.set(key, value);
}

// Resolver / non-edge anycast IPs that MUST never appear as a connect address:
// they answer DNS on :443 for their own service, not our worker's TLS, so a
// config that uses them fails (HTTP 403 / timeout). Older panels persisted
// some of these — scrub them out on load so the fix reaches existing installs.
const BAD_IPS = new Set([
  // DNS resolvers / non-edge anycast (never terminate TLS for our worker)
  "1.0.0.1", "1.1.1.1", "1.0.0.2", "1.1.1.2", "1.0.0.3", "1.1.1.3",
  "8.8.8.8", "8.8.4.4", "9.9.9.9", "149.112.112.112",
  "208.67.222.222", "208.67.220.220", "64.6.64.6", "64.6.65.6",
  // legacy defaults that probe-tested as HTTP 403 (don't front our worker)
  "104.16.132.229",
]);

function sanitizeCleanIps(s: Settings): boolean {
  if (!Array.isArray(s.cleanIps)) return false;
  const kept = s.cleanIps.filter((ip) => !BAD_IPS.has(ip));
  if (kept.length !== s.cleanIps.length) {
    s.cleanIps = kept.length ? kept : [...DEFAULTS.cleanIps];
    return true;
  }
  return false;
}

// fixedIp must stay a valid "ip" or "ip:port" — and never one of the known-bad
// resolver IPs (a locked bad IP would break every config).
function sanitizeFixedIp(s: Settings): boolean {
  const f = (s.fixedIp || "").trim();
  if (!f) return false;
  const m = f.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d{1,5}))?$/);
  if (!m) { s.fixedIp = ""; return true; }
  if (BAD_IPS.has(m[1])) { s.fixedIp = ""; return true; }
  const port = m[2] ? parseInt(m[2], 10) : 443;
  if (port < 1 || port > 65535) { s.fixedIp = m[1]; return true; } // drop bad port, keep ip
  s.fixedIp = m[2] ? `${m[1]}:${port}` : m[1];
  return false;
}

// poolIps (Proxy IP Pool "best IPs") — valid "ip[:port]" only, capped at 16.
function sanitizePoolIps(s: Settings): boolean {
  if (!Array.isArray(s.poolIps)) { s.poolIps = []; return true; }
  const kept: string[] = [];
  for (const raw of s.poolIps.slice(0, 16)) {
    const t = String(raw || "").trim();
    if (!t) continue;
    const m = t.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d{1,5}))?$/);
    if (!m) continue;
    const port = m[2] ? parseInt(m[2], 10) : 443;
    if (port < 1 || port > 65535) continue;
    kept.push(m[2] ? `${m[1]}:${port}` : m[1]);
  }
  const changed = kept.length !== s.poolIps.length;
  s.poolIps = kept;
  return changed;
}

// pool flag/country — short strings; the flag emoji is 2 code points.
function sanitizePoolMeta(s: Settings): boolean {
  let changed = false;
  if (typeof s.poolFlag !== "string") { s.poolFlag = ""; changed = true; }
  else { const f = [...s.poolFlag].slice(0, 4).join(""); if (f !== s.poolFlag) { s.poolFlag = f; changed = true; } }
  if (typeof s.poolCountry !== "string") { s.poolCountry = ""; changed = true; }
  else { const c = s.poolCountry.trim().slice(0, 4); if (c !== s.poolCountry) { s.poolCountry = c; changed = true; } }
  return changed;
}

// Runs both scrubbers before a settings write so a bad value is never persisted
// (getSettings also runs them on read as a second line of defence).
export function sanitizeSettings(s: Settings): boolean {
  const a = sanitizeCleanIps(s);
  const b = sanitizeFixedIp(s);
  const c = sanitizePoolIps(s);
  const d = sanitizePoolMeta(s);
  return a || b || c || d;
}

export async function getSettings(env: Env): Promise<Settings> {
  const raw = await rawGet(env, "settings");
  const base = { ...DEFAULTS };
  if (raw) {
    try { Object.assign(base, JSON.parse(raw)); } catch { /* corrupt → defaults */ }
  }
  const scrubbed = sanitizeSettings(base);
  if (scrubbed) {
    // persist the corrected clean-IP list so legacy panels heal themselves
    await rawPut(env, "settings", JSON.stringify(base));
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
