// Nika Net — shared protocol helpers (WebSocket stream → TCP socket piping).

export function makeReadableWebSocketStream(
  ws: WebSocket,
  earlyDataHeader: string,
  log: (msg: string) => void
): { stream: ReadableStream<Uint8Array>; removeEarlyData: () => Uint8Array | null } {
  let earlyData: Uint8Array | null = null;
  try {
    if (earlyDataHeader) earlyData = Uint8Array.from(atob(earlyDataHeader), (c) => c.charCodeAt(0));
  } catch {
    earlyData = null;
  }
  let resolveReady: (() => void) | null = null;
  const ready = new Promise<void>((r) => (resolveReady = r));

  ws.addEventListener("message", () => { if (resolveReady) { resolveReady(); resolveReady = null; } });
  ws.addEventListener("error", () => { if (resolveReady) { resolveReady(); resolveReady = null; } });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (event: MessageEvent) => {
        const d = event.data;
        if (d instanceof ArrayBuffer) controller.enqueue(new Uint8Array(d));
        else if (Array.isArray(d)) controller.enqueue(new Uint8Array(d));
        else if (typeof d === "string") controller.enqueue(new TextEncoder().encode(d));
      };
      ws.addEventListener("message", push);
      ws.addEventListener("close", () => {
        try { controller.close(); } catch { /* noop */ }
      });
      ws.addEventListener("error", () => { try { controller.error(new Error("ws error")); } catch { /* noop */ } });
    },
    async pull() { await ready; },
    cancel() { try { ws.close(); } catch { /* noop */ } },
  });

  return {
    stream,
    removeEarlyData: () => { const e = earlyData; earlyData = null; return e; },
  };
}

export function wsAccept(req: Request): WebSocket {
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
  server.accept();
  return server;
}

export function jsonResp(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" },
  });
}
