// Nika Net — Colo Pool ("Speed Engine").
//
// The community clean-IP dataset maps each verified Cloudflare-fronting
// anycast IP to the Cloudflare datacenter (colo) it lands on, with the colo's
// coordinates. Because the dominant factor in a user's ping is the network
// distance to the colo, ranking candidates by colo distance to the user gives
// low-latency configs (the same principle as CloudflareSpeedTest's `-cfcolo`).
//
// The pool is injected at build time (see scripts/build-colopool.mjs →
// ui/colo-pool.json → COLO_POOL define). It is also the source of truth for
// which non-official-range IPs are VERIFIED Cloudflare anycast edges — so they
// can safely front the worker even though they aren't in the published
// cloudflare.com/ips-v4 list.

declare const COLO_POOL: string | undefined;

interface ColoInfo {
  lat: number;
  lon: number;
  c: string; // city / human label
}

interface ColoPool {
  colos: Record<string, ColoInfo>;
  byColo: Record<string, string>; // iata -> "ip:port\nip:port"
  set?: string; // every verified IP, newline-separated
}

const PER_COLO_MAX = 64; // matches the build-time per-colo cap


let cached: ColoPool | null = null;
let bundledSet: Set<string> | null = null;
let ipToColo: Map<string, string> | null = null;

function load(): ColoPool {
  if (cached) return cached;
  try {
    const raw = typeof COLO_POOL !== "undefined" && COLO_POOL ? COLO_POOL : "{}";
    const p = JSON.parse(raw) as Partial<ColoPool>;
    cached = { colos: p.colos || {}, byColo: p.byColo || {}, set: p.set || "" };
  } catch {
    cached = { colos: {}, byColo: {}, set: "" };
  }
  return cached;
}

export function coloCount(): number {
  return Object.keys(load().colos).length;
}

/** True if `ip` is in the bundled verified-anycast set (colo pool + uploads). */
export function isBundledAnycast(ip: string): boolean {
  if (!bundledSet) {
    const s = new Set<string>();
    const p = load();
    if (p.set) for (const line of p.set.split("\n")) if (line) s.add(line);
    // byColo IPs are also always verified (subset, kept for safety)
    for (const iata of Object.keys(p.byColo)) {
      for (const e of p.byColo[iata].split("\n")) {
        const i = e.split(":")[0];
        if (i) s.add(i);
      }
    }
    bundledSet = s;
  }
  return bundledSet.has(ip);
}

/** Which colo does this IP land on? (for UI display / pooltest annotations) */
export function coloOf(ip: string): { iata: string; city: string } | null {
  if (!ipToColo) {
    const m = new Map<string, string>();
    const p = load();
    for (const iata of Object.keys(p.byColo)) {
      for (const e of p.byColo[iata].split("\n")) {
        const i = e.split(":")[0];
        if (i && !m.has(i)) m.set(i, iata);
      }
    }
    ipToColo = m;
  }
  const iata = ipToColo.get(ip);
  if (!iata) return null;
  const info = load().colos[iata];
  return { iata, city: info ? info.c : iata };
}

/* ---------------- geo ---------------- */

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface RankedAddr {
  host: string;
  port: number;
  colo: string;
  city: string;
  km: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Rank colo-pool addresses by distance to the user, interleaving colos so the
 * top-N span several nearby datacenters (failover diversity), and preferring
 * 443 within a colo (the pool is pre-sorted that way at build time).
 */
export function rankByDistance(geo: GeoPoint, count: number): RankedAddr[] {
  const p = load();
  const sorted = Object.keys(p.byColo)
    .map((iata) => {
      const info = p.colos[iata];
      const d = info ? haversineKm(geo.lat, geo.lon, info.lat, info.lon) : Number.POSITIVE_INFINITY;
      return { iata, info, d };
    })
    .sort((a, b) => a.d - b.d);

  // pre-split each colo's entries
  const lists = sorted.map((c) => ({
    ...c,
    entries: p.byColo[c.iata].split("\n").filter(Boolean),
  }));

  const out: RankedAddr[] = [];
  let round = 0;
  while (out.length < count && round < PER_COLO_MAX && lists.some((l) => l.entries.length > round)) {
    for (const l of lists) {
      if (out.length >= count) break;
      const e = l.entries[round];
      if (!e) continue;
      const [host, portS] = e.split(":");
      const port = parseInt(portS || "443", 10);
      if (!Number.isInteger(port) || port < 1 || port > 65535) continue;
      out.push({
        host,
        port,
        colo: l.iata,
        city: l.info ? l.info.c : l.iata,
        km: Math.round(l.d),
      });
    }
    round++;
  }
  return out;
}
