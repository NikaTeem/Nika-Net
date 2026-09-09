// Nika Net — server-side TCP probe for the Proxy IP Pool.
//
// The browser cannot reliably test the pool IPs: they are datacenter/proxy
// endpoints with self-signed TLS or non-HTTP services, so a `fetch()` from the
// panel always fails and the pool looked "empty" for every country. The worker
// instead opens a raw TCP connection (cloudflare:sockets) and measures the
// connect latency — an open, responsive port = "alive".

import { connect } from "cloudflare:sockets";

export interface ProbeResult {
  addr: string; // "ip" or "ip:port" as received
  ok: boolean; // TCP handshake succeeded
  ms: number; // connect latency in ms (0 when failed)
}

const MAX_LIST = 100; // cap per request
const CONCURRENCY = 12; // parallel sockets (well under the per-invocation limit)
const TIMEOUT_MS = 2500;
const IP_PORT_RE = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::(\d{1,5}))?$/;

function tcpPing(host: string, port: number): Promise<{ ok: boolean; ms: number }> {
  const start = Date.now();
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (!settled) {
        settled = true;
        resolve({ ok, ms: ok ? Date.now() - start : 0 });
      }
    };
    const timer = setTimeout(() => done(false), TIMEOUT_MS);
    let sock: any = null;
    try {
      sock = connect({ hostname: host, port });
    } catch {
      clearTimeout(timer);
      done(false);
      return;
    }
    // `opened` resolves when the TCP handshake completes, rejects on failure.
    const p = sock.opened;
    if (p && typeof p.then === "function") {
      p.then(
        () => {
          clearTimeout(timer);
          done(true);
          try { sock.close(); } catch { /* noop */ }
        },
        () => {
          clearTimeout(timer);
          done(false);
          try { sock.close(); } catch { /* noop */ }
        }
      );
    } else {
      // fallback for older typings: readable/writable become available on connect
      const tick = () => {
        if (settled) return;
        try {
          if (sock.readable || sock.writable) { clearTimeout(timer); done(true); try { sock.close(); } catch { /* noop */ } return; }
        } catch { /* noop */ }
        if (Date.now() - start > TIMEOUT_MS) { clearTimeout(timer); done(false); return; }
        setTimeout(tick, 25);
      };
      tick();
    }
  });
}

export async function probePool(list: string[]): Promise<ProbeResult[]> {
  const items: { addr: string; host: string; port: number }[] = [];
  for (const raw of list.slice(0, MAX_LIST)) {
    const s = (raw || "").trim();
    if (!s) continue;
    const m = s.match(IP_PORT_RE);
    if (!m) {
      items.push({ addr: s || raw, host: "", port: 0 });
      continue;
    }
    items.push({ addr: s, host: m[1], port: m[2] ? parseInt(m[2], 10) : 443 });
  }

  const results: ProbeResult[] = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const it = items[cursor++];
      if (!it.host) {
        results.push({ addr: it.addr, ok: false, ms: 0 });
        continue;
      }
      const r = await tcpPing(it.host, it.port);
      results.push({ addr: it.addr, ok: r.ok, ms: r.ms });
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, Math.max(1, items.length)) }, worker));

  // preserve input order for the client
  const byAddr = new Map(results.map((r) => [r.addr, r]));
  return items.map((it) => byAddr.get(it.addr) || { addr: it.addr, ok: false, ms: 0 });
}
