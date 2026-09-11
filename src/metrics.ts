// Nika Net — real metrics: request counters, per-user traffic, activity log.
//
// KV free tier = 1,000 writes/day per namespace. Every write path here is
// budgeted so a busy panel can never exhaust that quota and start returning
// "KV put() limit exceeded for the day." to the user:
//   * counters + traffic are folded into ONE `metrics:<date>` JSON key and
//     flushed at most once per 150 s (only when there is pending data);
//   * the all-time request total lives in its own `metrics:total` key written
//     at most once per 10 min;
//   * per-user used-GB is persisted into the users list at most once per 150 s;
//   * connection activity is logged at most once per 150 s;
//   * every write swallows quota errors (settings.rawPut) and settings applies a
//     per-isolate daily write budget, so a failed write never breaks a request.

import { Env } from "./types";
import * as store from "./settings";

const memCounters = new Map<string, number>();
const trafficMem = new Map<string, number>(); // userId → pending bytes
const connLogAt = new Map<string, number>(); // userId → last connection log ts
let lastFlush = 0;
let lastActivityWrite = 0;
let lastTotalWrite = 0;
let totalPending = 0; // req:total deltas not yet folded into metrics:total

export const todayKey = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

export function bumpRequest(): void {
  memCounters.set("req:total", (memCounters.get("req:total") || 0) + 1);
  memCounters.set("req:" + todayKey(), (memCounters.get("req:" + todayKey()) || 0) + 1);
}

// Throttled flush: at most one persist per 150 s. A debounced trailing flush is
// scheduled via ctx.waitUntil so the final chunk isn't lost when the isolate
// goes idle; it re-checks the throttle before writing.
export async function flush(env: Env, ctx?: ExecutionContext): Promise<void> {
  const now = Date.now();
  if (now - lastFlush < 150_000) return;
  lastFlush = now;
  await persistAll(env);
  if (ctx && (memCounters.size || trafficMem.size)) {
    ctx.waitUntil(
      new Promise<void>((resolve) => {
        setTimeout(async () => {
          if (Date.now() - lastFlush >= 150_000 && (memCounters.size || trafficMem.size)) {
            lastFlush = Date.now();
            await persistAll(env);
          }
          resolve();
        }, 155_000);
      })
    );
  }
}

async function persistAll(env: Env): Promise<void> {
  if (!memCounters.size && !trafficMem.size) return;

  const dayKey = "metrics:" + todayKey();
  const agg =
    (await store.getJson<{ c?: Record<string, number>; t?: Record<string, number> }>(env, dayKey)) ||
    {};
  const c = agg.c || (agg.c = {});
  const t = agg.t || (agg.t = {});

  const pendingCounters = new Map(memCounters);
  memCounters.clear();
  for (const [k, v] of pendingCounters) c[k] = (c[k] || 0) + v;

  const pendingTraffic = new Map(trafficMem);
  trafficMem.clear();
  let usersChanged = false;
  let users: import("./types").User[] | null = null;
  for (const [userId, bytes] of pendingTraffic) {
    t[userId] = (t[userId] || 0) + bytes;
    if (!users) users = await store.getUsers(env);
    const u = users.find((x) => x.id === userId);
    if (u) {
      u.used = (u.used || 0) + bytes / 1e9;
      usersChanged = true;
    }
  }
  if (usersChanged && users) await store.saveUsers(env, users);
  await store.putJson(env, dayKey, agg);

  // all-time total — low cadence, its own key (never rolls over at midnight)
  const reqTotalDelta = pendingCounters.get("req:total") || 0;
  if (reqTotalDelta) totalPending += reqTotalDelta;
  if (totalPending && Date.now() - lastTotalWrite >= 600_000) {
    lastTotalWrite = Date.now();
    const tot = (await store.getJson<{ req: number }>(env, "metrics:total")) || { req: 0 };
    tot.req = (tot.req || 0) + totalPending;
    totalPending = 0;
    await store.putJson(env, "metrics:total", tot);
  }
}

async function counter(env: Env, k: string): Promise<number> {
  const agg =
    (await store.getJson<{ c?: Record<string, number> }>(env, "metrics:" + todayKey())) || {};
  return (agg.c?.[k] || 0) + (memCounters.get(k) || 0);
}

/* persisted + in-memory live view */
export async function getRequestsToday(env: Env): Promise<number> {
  return counter(env, "req:" + todayKey());
}
export async function getRequestsTotal(env: Env): Promise<number> {
  const tot = (await store.getJson<{ req: number }>(env, "metrics:total")) || { req: 0 };
  // live: metrics:total holds everything up to the last total write; add the
  // deltas buffered since then.
  return (tot.req || 0) + totalPending + (memCounters.get("req:total") || 0);
}

/* traffic: bytes → per-day bucket (folded into the metrics key) + per-user
   used-GB (persisted at most once per 150 s, inside persistAll). */
export async function recordTraffic(env: Env, userId: string, up: number, down: number): Promise<void> {
  if (!up && !down) return;
  const bytes = up + down;
  trafficMem.set(userId, (trafficMem.get(userId) || 0) + bytes);

  // log a connection event at most once per 60 s per user
  const now = Date.now();
  const lastLog = connLogAt.get(userId) || 0;
  if (now - lastLog > 60_000) {
    connLogAt.set(userId, now);
    const users = await store.getUsers(env);
    const u = users.find((x) => x.id === userId);
    await appendActivity(env, {
      icon: "📡",
      text: `اتصال جدید${u ? ` — ${u.name}` : ""}`,
      time: now,
    });
  }
}

export async function getTraffic7d(env: Env): Promise<Array<{ date: string; gb: number }>> {
  const out: Array<{ date: string; gb: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const key = `${d.getFullYear()}-${m}-${day}`;
    const agg = (await store.getJson<{ t?: Record<string, number> }>(env, "metrics:" + key)) || {};
    const bytes = Object.values(agg.t || {}).reduce((a, b) => a + (b || 0), 0);
    out.push({ date: key.slice(5), gb: Math.round((bytes / 1e9) * 100) / 100 });
  }
  return out;
}

/* activity log */
export interface ActivityEntry { icon: string; text: string; time: number }

export async function appendActivity(env: Env, entry: ActivityEntry): Promise<void> {
  // rate-limit the whole log to one write per 150 s so a burst of events
  // (many users connecting at once) can't exhaust the KV write budget.
  const now = Date.now();
  if (now - lastActivityWrite < 150_000) return;
  lastActivityWrite = now;
  const list = (await store.getJson<ActivityEntry[]>(env, "activity")) || [];
  list.unshift(entry);
  if (list.length > 40) list.length = 40;
  await store.putJson(env, "activity", list);
}

export async function getActivity(env: Env): Promise<ActivityEntry[]> {
  return (await store.getJson<ActivityEntry[]>(env, "activity")) || [];
}
