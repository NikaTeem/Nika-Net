// Nika Net — VLESS over WebSocket handler.
// Protocol: VLESS request in sec-websocket-protocol (early data) + WS stream payload.
// We connect out via cloudflare:sockets, pipe bytes both ways, and meter real traffic.

import { connect } from "cloudflare:sockets";
import { makeReadableWebSocketStream, wsAccept } from "./common";
import { User, Settings, Env } from "../types";
import * as metrics from "../metrics";

export async function handleVless(req: Request, user: User, settings: Settings, env: Env): Promise<Response> {
  const ws = wsAccept(req);
  ws.binaryType = "arraybuffer";

  const earlyDataHeader = req.headers.get("sec-websocket-protocol") || "";
  const { stream, removeEarlyData } = makeReadableWebSocketStream(ws, earlyDataHeader, () => {});

  const sendToClient = (d: Uint8Array) => { try { ws.send(d as unknown as ArrayBuffer); } catch { /* noop */ } };

  let up = 0;
  let down = 0;

  stream.pipeTo(
    new WritableStream<Uint8Array>({
      async write(chunk) {
        let socket: any = null;
        try {
          const early = removeEarlyData();
          const buf = early && early.length ? merge(early, chunk) : chunk;
          const h = parseVlessHeader(buf, user);
          if (!h) { ws.close(); return; }

          socket = connect({ hostname: h.address, port: h.port });
          sendToClient(new Uint8Array([0, 0]));

          if (h.payload.length) {
            const w = socket.writable.getWriter();
            await w.write(h.payload);
            w.releaseLock();
            up += h.payload.length;
          }

          // client → remote (upload)
          stream.pipeTo(
            new WritableStream<Uint8Array>({
              async write(d) {
                up += d.byteLength;
                const w = socket.writable.getWriter();
                try { await w.write(d); } finally { w.releaseLock(); }
              },
            })
          ).catch(() => { try { socket.close(); } catch {} });

          // remote → client (download)
          socket.readable
            .pipeTo(
              new WritableStream<Uint8Array>({
                write(d) { down += d.byteLength; sendToClient(d); },
              })
            )
            .catch(() => { try { ws.close(); } catch {} })
            .finally(() => {
              ctxWait(env, user.id, up, down);
            });
        } catch (e) {
          try { socket?.close(); } catch {}
          try { ws.close(); } catch {}
          ctxWait(env, user.id, up, down);
        }
      },
    })
  ).catch(() => { try { ws.close(); } catch {} });

  return new Response(null, { status: 101, webSocket: ws });
}

// fire-and-forget traffic persistence
function ctxWait(env: Env, userId: string, up: number, down: number): void {
  metrics.recordTraffic(env, userId, up, down).catch(() => {});
}

function merge(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a); out.set(b, a.length);
  return out;
}

interface VlessHeader { address: string; port: number; payload: Uint8Array }

function parseVlessHeader(buf: Uint8Array, user: User): VlessHeader | null {
  try {
    let i = 0;
    if (buf[i] !== 0) return null;            // version
    i += 1;
    const uuid = bytesToUuid(buf.slice(i, i + 16));
    i += 16;
    if (uuid.toLowerCase() !== user.uuid.toLowerCase()) return null;
    const addonsLen = buf[i]; i += 1;
    i += addonsLen;
    const cmd = buf[i]; i += 1;               // 1 = TCP
    if (cmd !== 1) return null;
    const port = (buf[i] << 8) | buf[i + 1]; i += 2;
    const atype = buf[i]; i += 1;
    let address = "";
    if (atype === 1) { address = `${buf[i]}.${buf[i + 1]}.${buf[i + 2]}.${buf[i + 3]}`; i += 4; }
    else if (atype === 2) { const len = buf[i]; i += 1; address = new TextDecoder().decode(buf.slice(i, i + len)); i += len; }
    else if (atype === 3) { address = bytesToIpv6(buf.slice(i, i + 16)); i += 16; }
    else return null;
    return { address, port, payload: buf.slice(i) };
  } catch {
    return null;
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
