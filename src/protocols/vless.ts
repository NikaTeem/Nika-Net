// Nika Net — VLESS over WebSocket handler.
// Protocol: VLESS request in sec-websocket-protocol (early data) + WS stream
// payload. We connect out via cloudflare:sockets and pipe bytes both ways.
// Structure mirrors the battle-tested edgetunnel worker: a single pipeTo of
// the ws stream with a "connected" state flag, and the CLIENT end of the
// WebSocketPair returned in the 101 response.

import { connect } from "cloudflare:sockets";
import { makeReadableWebSocketStream, wsAccept } from "./common";
import { User, Settings, Env } from "../types";
import * as metrics from "../metrics";

export async function handleVless(req: Request, user: User, settings: Settings, env: Env): Promise<Response> {
  const { client, server } = wsAccept(req);
  server.binaryType = "arraybuffer";

  const earlyDataHeader = req.headers.get("sec-websocket-protocol") || "";
  const stream = makeReadableWebSocketStream(server, earlyDataHeader, () => {});

  const sendToClient = (d: Uint8Array) => {
    try { server.send(d as unknown as ArrayBuffer); } catch { /* noop */ }
  };

  let remote: any = null;
  let up = 0;
  let down = 0;
  let pending: Uint8Array | null = null; // partial header awaiting more bytes
  let connected = false;

  stream
    .pipeTo(
      new WritableStream<Uint8Array>({
        async write(chunk) {
          if (connected) {
            up += chunk.byteLength;
            const w = remote.writable.getWriter();
            try { await w.write(chunk); } finally { w.releaseLock(); }
            return;
          }

          const data = pending ? merge(pending, chunk) : chunk;
          const h = parseVlessHeader(data, user);
          if (!h.ok) {
            if (h.incomplete) { pending = data; return; } // wait for more bytes
            pending = null;
            try { server.close(); } catch { /* noop */ }
            return;
          }
          pending = null;
          connected = true;

          remote = connect({ hostname: h.address, port: h.port });
          sendToClient(new Uint8Array([0, 0])); // VLESS response: version 0, addons 0

          if (h.payload.length) {
            up += h.payload.length;
            const w = remote.writable.getWriter();
            try { await w.write(h.payload); } finally { w.releaseLock(); }
          }

          remote.readable
            .pipeTo(
              new WritableStream<Uint8Array>({
                write(d) { down += d.byteLength; sendToClient(d); },
              })
            )
            .catch(() => { try { server.close(); } catch { /* noop */ } })
            .finally(() => { metrics.recordTraffic(env, user.id, up, down).catch(() => {}); });
        },
        close() {
          try { remote?.close(); } catch { /* noop */ }
        },
        abort() {
          try { remote?.close(); } catch { /* noop */ }
          try { server.close(); } catch { /* noop */ }
        },
      })
    )
    .catch(() => {
      try { server.close(); } catch { /* noop */ }
      try { remote?.close(); } catch { /* noop */ }
    });

  return new Response(null, { status: 101, webSocket: client });
}

function merge(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

type VlessParse =
  | { ok: true; address: string; port: number; payload: Uint8Array }
  | { ok: false; incomplete: boolean };

// VLESS header: version(1) uuid(16) addonsLen(1) addons cmd(1) port(2) atype(1) addr
function parseVlessHeader(buf: Uint8Array, user: User): VlessParse {
  try {
    if (buf.length < 1) return { ok: false, incomplete: true };
    if (buf[0] !== 0) return { ok: false, incomplete: false }; // unsupported version

    if (buf.length < 1 + 16) return { ok: false, incomplete: true };
    const uuid = bytesToUuid(buf.slice(1, 17));
    if (uuid.toLowerCase() !== user.uuid.toLowerCase()) return { ok: false, incomplete: false };

    if (buf.length < 18) return { ok: false, incomplete: true };
    const addonsLen = buf[17];
    const i0 = 18 + addonsLen;
    if (buf.length < i0 + 4) return { ok: false, incomplete: true };

    const cmd = buf[i0];
    if (cmd !== 1) return { ok: false, incomplete: false }; // only TCP (1)
    const port = (buf[i0 + 1] << 8) | buf[i0 + 2];
    const atype = buf[i0 + 3];
    let i = i0 + 4;
    let address = "";

    if (atype === 1) {
      if (buf.length < i + 4) return { ok: false, incomplete: true };
      address = `${buf[i]}.${buf[i + 1]}.${buf[i + 2]}.${buf[i + 3]}`;
      i += 4;
    } else if (atype === 2) {
      if (buf.length < i + 1) return { ok: false, incomplete: true };
      const len = buf[i];
      i += 1;
      if (buf.length < i + len) return { ok: false, incomplete: true };
      address = new TextDecoder().decode(buf.slice(i, i + len));
      i += len;
    } else if (atype === 3) {
      if (buf.length < i + 16) return { ok: false, incomplete: true };
      address = bytesToIpv6(buf.slice(i, i + 16));
      i += 16;
    } else {
      return { ok: false, incomplete: false };
    }

    return { ok: true, address, port, payload: buf.slice(i) };
  } catch {
    return { ok: false, incomplete: false };
  }
}

function bytesToUuid(b: Uint8Array): string {
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function bytesToIpv6(b: Uint8Array): string {
  const parts: string[] = [];
  for (let i = 0; i < 16; i += 2) parts.push(((b[i] << 8) | b[i + 1]).toString(16));
  return parts.join(":");
}
