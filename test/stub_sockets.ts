// Test stub for `cloudflare:sockets` (aliased in via esbuild).
export interface FakeSocket {
  hostname: string;
  port: number;
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  written: Uint8Array[];
  controller?: ReadableStreamDefaultController<Uint8Array>;
  close(): void;
  push(d: Uint8Array): void;
}
export const connections: FakeSocket[] = [];
export function connect(opts: { hostname: string; port: number }): FakeSocket {
  const s: FakeSocket = {
    hostname: opts.hostname,
    port: opts.port,
    written: [],
    readable: null as any,
    writable: null as any,
    close() { /* noop */ },
    push(d: Uint8Array) { s.controller?.enqueue(d); },
  };
  s.writable = new WritableStream<Uint8Array>({ write(c) { s.written.push(new Uint8Array(c)); } });
  s.readable = new ReadableStream<Uint8Array>({ start(c) { s.controller = c; } });
  connections.push(s);
  return s;
}
