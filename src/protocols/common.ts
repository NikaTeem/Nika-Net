// Nika Net — shared protocol helpers (WebSocket stream → TCP socket piping).

// Accept an incoming websocket upgrade and return both ends of the pair.
// The CLIENT end goes into the 101 Response; the SERVER end is what we
// stream on (mirrors the proven edgetunnel pattern).
export function wsAccept(req: Request): { client: WebSocket; server: WebSocket } {
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
  server.accept();
  return { client, server };
}

// Turn a WebSocket into a ReadableStream<Uint8Array>.
// Key detail: 0-RTT "early data" arrives in the Sec-WebSocket-Protocol header
// and NO websocket message follows until we respond — so it MUST be enqueued
// immediately in start(). Waiting for a message first (as a naive pull()
// implementation does) deadlocks: we wait for a frame, the client waits for
// our reply, and the connection never proceeds.
export function makeReadableWebSocketStream(
  ws: WebSocket,
  earlyDataHeader: string,
  log: (msg: string) => void
): ReadableStream<Uint8Array> {
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (event: MessageEvent) => {
        if (cancelled) return;
        const d = event.data;
        if (d instanceof ArrayBuffer) controller.enqueue(new Uint8Array(d));
        else if (Array.isArray(d)) controller.enqueue(new Uint8Array(d));
        else if (typeof d === "string") controller.enqueue(new TextEncoder().encode(d));
      };
      ws.addEventListener("message", push);
      ws.addEventListener("close", () => {
        try { controller.close(); } catch { /* noop */ }
      });
      ws.addEventListener("error", () => {
        try { controller.error(new Error("ws error")); } catch { /* noop */ }
      });

      // deliver 0-RTT early data straight away
      if (earlyDataHeader) {
        try {
          // tolerate both standard and URL-safe base64 (and missing padding)
          let b64 = earlyDataHeader.replace(/-/g, "+").replace(/_/g, "/");
          while (b64.length % 4) b64 += "=";
          const early = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          if (early.length) controller.enqueue(early);
        } catch {
          /* invalid/absent early data header — ignore */
        }
      }
    },
    pull() {
      /* no-op: messages are enqueued by the event listeners */
    },
    cancel() {
      cancelled = true;
      try { ws.close(); } catch { /* noop */ }
    },
  });

  return stream;
}

export function jsonResp(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" },
  });
}
