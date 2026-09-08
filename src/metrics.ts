// Nika Net — real metrics: request counters, per-user traffic, activity log.
// Counters are bumped in-memory and flushed (throttled) to avoid KV write limits;
// traffic is persisted per connection close; activity is appended per event.

import { Env } from "./types";
import * as store from "./settings";

const memCounters = new Map<string, number>();
const connLogAt = new Map<string, number>(); // userId → last connection log ts
let lastFlush = 0;

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

export async function flush(env: Env): Promise<void> {
  const now = Date.now();
  if (now - lastFlush < 15_000) return;
  lastFlush = now;
  for (const [k, v] of memCounters) {
    if (v) await store.incrementCounter(env, k, v);
  }
  memCounters.clear();
}

/* persisted + in-memory live view */
export async function getRequestsToday(env: Env): Promise<number> {
  return (await store.getCounter(env, "req:" + todayKey())) + (memCounters.get("req:" + todayKey()) || 0);
}
export async function getRequestsTotal(env: Env): Promise<number> {
  return (await store.getCounter(env, "req:total")) + (memCounters.get("req:total") || 0);
}

/* traffic: bytes → per-user used (GB) + per-day bucket */
export async function recordTraffic(env: Env, userId: string, up: number, down: number): Promise<void> {
  if (!up && !down) return;
  const users = await store.getUsers(env);
  const u = users.find((x) => x.id === userId);
  if (u) {
    u.used = (u.used || 0) + (up + down) / 1e9;
    await store.saveUsers(env, users);
  }
  await store.incrementCounter(env, "traffic:" + todayKey(), up + down);

  // log a connection event at most once per 60s per user
  const last = connLogAt.get(userId) || 0;
  if (Date.now() - last > 60_000) {
    connLogAt.set(userId, Date.now());
    await appendActivity(env, {
      icon: "📡",
      text: `اتصال جدید${u ? ` — ${u.name}` : ""}`,
      time: Date.now(),
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
    const bytes = await store.getCounter(env, "traffic:" + key);
    out.push({ date: key.slice(5), gb: Math.round((bytes / 1e9) * 100) / 100 });
  }
  return out;
}

/* activity log */
export interface ActivityEntry { icon: string; text: string; time: number }

export async function appendActivity(env: Env, entry: ActivityEntry): Promise<void> {
  const list = (await store.getJson<ActivityEntry[]>(env, "activity")) || [];
  list.unshift(entry);
  if (list.length > 40) list.length = 40;
  await store.putJson(env, "activity", list);
}

export async function getActivity(env: Env): Promise<ActivityEntry[]> {
  return (await store.getJson<ActivityEntry[]>(env, "activity")) || [];
}
