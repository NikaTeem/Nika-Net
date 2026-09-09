// Integration test: simulate a real VLESS + Trojan connection through the
// worker handlers with a stubbed `connect` and a fake WebSocketPair.
// Verifies: early-data delivery (no deadlock), single-pipe forwarding, and
// that the CLIENT end of the pair is returned in the 101 response.

import { handleVless } from "/home/user/nika-net/src/protocols/vless";
import { handleTrojan } from "/home/user/nika-net/src/protocols/trojan";
import { connections } from "/home/user/nika-net/test/stub_sockets";
import { User, Settings, Env } from "/home/user/nika-net/src/types";

/* Node's undici Response rejects status 101 — the Workers runtime allows it.
   Swap in a permissive Response just for the test. */
class TestResponse {
  status: number;
  headers: Headers;
  body: any;
  webSocket: any;
  constructor(body: any, init: any = {}) {
    this.status = init.status ?? 200;
    this.headers = init.headers ? new Headers(init.headers) : new Headers();
    this.body = body;
    this.webSocket = init.webSocket;
  }
}
(globalThis as any).Response = TestResponse;

/* ---------- fake WebSocket + WebSocketPair ---------- */
class FakeWs {
  binaryType = "blob";
  sent: Uint8Array[] = [];
  private listeners: Record<string, ((e: any) => void)[]> = {};
  addEventListener(t: string, cb: any) { (this.listeners[t] ||= []).push(cb); }
  send(d: any) { this.sent.push(d instanceof Uint8Array ? d : new Uint8Array(d)); }
  close() { /* noop */ }
  accept() { /* noop */ }
  _msg(bytes: Uint8Array) { (this.listeners["message"] || []).forEach((cb) => cb({ data: bytes.buffer })); }
}
class FakePair {
  0: FakeWs; 1: FakeWs;
  constructor() { this[0] = new FakeWs(); this[1] = new FakeWs(); }
}
(globalThis as any).WebSocketPair = class extends FakePair {
  constructor() {
    super();
    (globalThis as any).__lastPair = { client: this[0], server: this[1] };
  }
};

const user: User = {
  id: "u1", name: "علی", uuid: "0d31c8a8-1111-4222-8333-444455556666",
  password: "abcdef1234567890abcdef1234567890abcdef12",
  quota: 50, used: 0, days: 30, active: true, createdAt: 0,
};
const settings: Settings = {
  title: "Nika Net", host: "nika.test.workers.dev", sni: "www.speedtest.net",
  wsPath: "/nika-ws", cleanIps: [], protocols: { vless: true, trojan: true, warp: true },
  adminPassHash: null, secretPath: "x", sessionSecret: "y",
};
const env = {} as Env;

const uuidBytes = new Uint8Array(16);
user.uuid.replace(/-/g, "").split("").forEach((c, i) => (uuidBytes[i >> 1] |= parseInt(c, 16) << ((i & 1) ? 0 : 4)));

function buildVlessHeader(domain: string, port: number, payload: Uint8Array): Uint8Array {
  const addr = new TextEncoder().encode(domain);
  const h = new Uint8Array(1 + 16 + 1 + 1 + 2 + 1 + 1 + addr.length);
  let i = 0;
  h[i++] = 0;                 // version
  h.set(uuidBytes, i); i += 16;
  h[i++] = 0;                 // addons len
  h[i++] = 1;                 // cmd TCP
  h[i++] = (port >> 8) & 0xff; h[i++] = port & 0xff;
  h[i++] = 2;                 // atype domain
  h[i++] = addr.length;
  h.set(addr, i); i += addr.length;
  const out = new Uint8Array(h.length + payload.length);
  out.set(h); out.set(payload, h.length);
  return out;
}

function toB64(u: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function assert(cond: boolean, msg: string) {
  if (!cond) { console.error("✘ FAIL:", msg); process.exit(1); }
}

/* ================= VLESS ================= */
async function testVless() {
  connections.length = 0;
  const payload = new TextEncoder().encode("GET / HTTP/1.1\r\nHost: example.com\r\n\r\n");
  const header = buildVlessHeader("example.com", 443, payload);
  const req = new Request("https://nika.test.workers.dev/nika-ws?ed=2048&proto=vless", {
    headers: { "sec-websocket-protocol": toB64(header) },
  });

  const res = (await handleVless(req, user, settings, env)) as any;
  await sleep(50);

  const { client, server } = (globalThis as any).__lastPair;
  assert(res.status === 101, "VLESS 101 response");
  assert(res.webSocket === client, "returns CLIENT end in 101 response");
  assert(connections.length === 1, "VLESS connected to target");
  const conn = connections[0];
  assert(conn.hostname === "example.com" && conn.port === 443, "VLESS target address/port parsed");

  const written = conn.written.map((w) => new TextDecoder().decode(w)).join("");
  assert(written.includes("GET / HTTP/1.1"), "VLESS payload forwarded to remote");

  assert(server.sent.length > 0 && server.sent[0].length === 2 && server.sent[0][0] === 0, "VLESS response [0,0] sent");

  conn.push(new TextEncoder().encode("HTTP/1.1 200 OK\r\n\r\nhi"));
  await sleep(50);
  assert(server.sent.some((d) => new TextDecoder().decode(d).includes("200 OK")), "remote data sent back to client");

  console.log("✔ VLESS handler OK");
}

/* ================= Trojan ================= */
async function testTrojan() {
  connections.length = 0;
  const payload = new TextEncoder().encode("GET / HTTP/1.1\r\nHost: example.com\r\n\r\n");
  const hash = sha224Hex(user.password);
  const addr = new TextEncoder().encode("example.com");
  const h = new Uint8Array(56 + 2 + 1 + 1 + 1 + addr.length + 2 + 2);
  let i = 0;
  h.set(new TextEncoder().encode(hash), i); i += 56;
  h[i++] = 0x0d; h[i++] = 0x0a;
  h[i++] = 1; // CONNECT
  h[i++] = 3; // atype domain
  h[i++] = addr.length;
  h.set(addr, i); i += addr.length;
  h[i++] = 0x01; h[i++] = 0xbb; // 443
  h[i++] = 0x0d; h[i++] = 0x0a;
  const header = new Uint8Array(h.length + payload.length);
  header.set(h); header.set(payload, h.length);

  const req = new Request("https://nika.test.workers.dev/nika-ws?ed=2048&proto=trojan", {
    headers: { "sec-websocket-protocol": toB64(header) },
  });

  const res = (await handleTrojan(req, user, settings, env)) as any;
  await sleep(50);

  const { client, server } = (globalThis as any).__lastPair;
  assert(res.status === 101, "Trojan 101 response");
  assert(res.webSocket === client, "Trojan returns CLIENT end in 101 response");
  assert(connections.length === 1, "Trojan connected to target");
  const conn = connections[0];
  assert(conn.hostname === "example.com" && conn.port === 443, "Trojan target parsed");
  const written = conn.written.map((w) => new TextDecoder().decode(w)).join("");
  assert(written.includes("GET / HTTP/1.1"), "Trojan payload forwarded");

  conn.push(new TextEncoder().encode("HTTP/1.1 200 OK\r\n\r\nhi"));
  await sleep(50);
  assert(server.sent.some((d) => new TextDecoder().decode(d).includes("200 OK")), "Trojan remote data sent to client");

  console.log("✔ Trojan handler OK");
}

/* ---------- inline SHA-224 (crafting the trojan test header) ---------- */
function sha224Hex(s: string): string {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  const H = [0xc1059ed8,0x367cd507,0x3070dd17,0xf70e5939,0xffc00b31,0x68581511,0x64f98fa7,0xbefa4fa4];
  const msg = new TextEncoder().encode(s);
  const l = msg.length;
  const padded = new Uint8Array((((l + 8) >> 6) + 1) << 6);
  padded.set(msg); padded[l] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Math.floor(l / 0x20000000));
  dv.setUint32(padded.length - 4, (l << 3) >>> 0);
  const w = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(off + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t-15],7)^rotr(w[t-15],18)^(w[t-15]>>>3);
      const s1 = rotr(w[t-2],17)^rotr(w[t-2],19)^(w[t-2]>>>10);
      w[t] = (w[t-16]+s0+w[t-7]+s1)>>>0;
    }
    let [a,b,c,d,e,f,g,h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e,6)^rotr(e,11)^rotr(e,25);
      const ch = (e&f)^(~e&g);
      const t1 = (h+S1+ch+K[t]+w[t])>>>0;
      const S0 = rotr(a,2)^rotr(a,13)^rotr(a,22);
      const maj = (a&b)^(a&c)^(b&c);
      const t2 = (S0+maj)>>>0;
      h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
    }
    H[0]=(H[0]+a)>>>0; H[1]=(H[1]+b)>>>0; H[2]=(H[2]+c)>>>0; H[3]=(H[3]+d)>>>0;
    H[4]=(H[4]+e)>>>0; H[5]=(H[5]+f)>>>0; H[6]=(H[6]+g)>>>0; H[7]=(H[7]+h)>>>0;
  }
  const out = new Uint8Array(28);
  const odv = new DataView(out.buffer);
  for (let i = 0; i < 7; i++) odv.setUint32(i * 4, H[i]);
  return [...out].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------- run ---------- */
(async () => {
  try {
    await testVless();
    await testTrojan();
    console.log("\n✅ All protocol tests passed — configs will connect.");
  } catch (e) {
    console.error("✘ test error:", e);
    process.exit(1);
  }
})();
