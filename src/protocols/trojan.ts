// Nika Net — Trojan over WebSocket handler.
// Trojan header: SHA-224(password) hex + CRLF + cmd + atype + addr + port + CRLF.

import { connect } from "cloudflare:sockets";
import { makeReadableWebSocketStream, wsAccept } from "./common";
import { User, Settings } from "../types";

export async function handleTrojan(req: Request, user: User, settings: Settings): Promise<Response> {
  const ws = wsAccept(req);
  ws.binaryType = "arraybuffer";

  const earlyDataHeader = req.headers.get("sec-websocket-protocol") || "";
  const { stream, removeEarlyData } = makeReadableWebSocketStream(ws, earlyDataHeader, () => {});

  const sendToClient = (d: Uint8Array) => { try { ws.send(d as unknown as ArrayBuffer); } catch { /* noop */ } };

  stream.pipeTo(
    new WritableStream<Uint8Array>({
      async write(chunk) {
        let socket: any = null;
        try {
          const early = removeEarlyData();
          const buf = early && early.length ? merge(early, chunk) : chunk;
          const expected = sha224Hex(user.password);
          const h = parseTrojanHeader(buf, expected);
          if (!h) { ws.close(); return; }

          socket = connect({ hostname: h.address, port: h.port });
          if (h.payload.length) {
            const w = socket.writable.getWriter();
            await w.write(h.payload);
            w.releaseLock();
          }
          stream.pipeTo(socket.writable).catch(() => {});
          socket.readable.pipeTo(
            new WritableStream<Uint8Array>({ write: (d) => sendToClient(d) })
          ).catch(() => { try { ws.close(); } catch {} });
        } catch (e) {
          try { socket?.close(); } catch {}
          try { ws.close(); } catch {}
        }
      },
    })
  ).catch(() => { try { ws.close(); } catch {} });

  return new Response(null, { status: 101, webSocket: ws });
}

function merge(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a); out.set(b, a.length);
  return out;
}

interface TrojanHeader { address: string; port: number; payload: Uint8Array }

function parseTrojanHeader(buf: Uint8Array, expectedHash: string): TrojanHeader | null {
  try {
    let i = 0;
    const hash = new TextDecoder().decode(buf.slice(i, i + 56));
    i += 56;
    if (hash !== expectedHash) return null;
    if (buf[i] !== 0x0d || buf[i + 1] !== 0x0a) return null;
    i += 2;
    const cmd = buf[i]; i += 1;
    if (cmd !== 1) return null; // CONNECT
    const atype = buf[i]; i += 1;
    let address = "";
    if (atype === 1) { address = `${buf[i]}.${buf[i + 1]}.${buf[i + 2]}.${buf[i + 3]}`; i += 4; }
    else if (atype === 3) { const len = buf[i]; i += 1; address = new TextDecoder().decode(buf.slice(i, i + len)); i += len; }
    else if (atype === 4) { address = bytesToIpv6(buf.slice(i, i + 16)); i += 16; }
    else return null;
    const port = (buf[i] << 8) | buf[i + 1]; i += 2;
    if (buf[i] !== 0x0d || buf[i + 1] !== 0x0a) return null;
    i += 2;
    return { address, port, payload: buf.slice(i) };
  } catch {
    return null;
  }
}

function bytesToIpv6(b: Uint8Array): string {
  const parts: string[] = [];
  for (let i = 0; i < 16; i += 2) parts.push(((b[i] << 8) | b[i + 1]).toString(16));
  return parts.join(":");
}

/* ---- minimal pure-JS SHA-224 (trojan password hashing) ---- */
const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number { return (x >>> n) | (x << (32 - n)); }

function sha224(msg: Uint8Array): Uint8Array {
  // SHA-224 IV (RFC 3874)
  const H = new Uint32Array([
    0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
    0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4,
  ]);
  const l = msg.length;
  const bitLenHi = Math.floor(l / 0x20000000);
  const bitLenLo = (l << 3) >>> 0;
  const padded = new Uint8Array(((l + 8) >> 6) + 1 << 6);
  padded.set(msg);
  padded[l] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, bitLenHi);
  dv.setUint32(padded.length - 4, bitLenLo);

  const w = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(off + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K256[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  const out = new Uint8Array(28);
  const odv = new DataView(out.buffer);
  for (let i = 0; i < 7; i++) odv.setUint32(i * 4, H[i]);
  return out;
}

function sha224Hex(s: string): string {
  return [...sha224(new TextEncoder().encode(s))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
