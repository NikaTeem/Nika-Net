// Nika Net Launcher — Cloudflare Worker entry point (Telegram webhook).

import { Env } from "./types";
import * as tg from "./telegram";
import { handleUpdate, broadcastAll, announceLatest, handleScheduled } from "./flow";

const infoHtml = `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>Nika Net Launcher</title>
<style>body{font-family:Georgia,serif;background:#0e0e0f;color:#e8e5df;display:grid;place-items:center;height:100vh;margin:0}
.card{border:2px dashed #8a8a93;border-radius:18px;padding:40px;text-align:center;max-width:420px}
h1{margin:0 0 8px} p{color:#8f8e95;font-family:monospace;line-height:1.8}</style></head>
<body><div class="card"><h1>⚡ Nika Net Launcher</h1>
<p>ربات لانچر Nika Net اینجا اجرا می‌شود.<br/>برای استفاده، در تلگرام به رباتت پیام بده.</p></div></body></html>`;

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/webhook") {
      const secret = req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
      if (secret !== env.WEBHOOK_SECRET) return new Response("unauthorized", { status: 401 });
      const update = (await req.json()) as tg.TgUpdate;
      ctx.waitUntil(handleUpdate(env, update));
      return new Response("ok");
    }

    // admin-triggered broadcast (used when shipping an update)
    if (req.method === "POST" && url.pathname === "/broadcast") {
      const key = req.headers.get("x-admin-key") || "";
      if (!env.BOT_ADMIN_KEY || key !== env.BOT_ADMIN_KEY) return new Response("unauthorized", { status: 401 });
      const body = (await req.json().catch(() => ({}))) as { text?: string };
      const text = (body.text || "").trim();
      if (!text) return new Response("empty message", { status: 400 });
      const r = await broadcastAll(env, text);
      return new Response(JSON.stringify({ ok: true, ...r }), { headers: { "content-type": "application/json" } });
    }

    // admin-triggered update announcement (checks GitHub version.json → notifies everyone)
    if (req.method === "POST" && url.pathname === "/announce") {
      const key = req.headers.get("x-admin-key") || "";
      if (!env.BOT_ADMIN_KEY || key !== env.BOT_ADMIN_KEY) return new Response("unauthorized", { status: 401 });
      const r = await announceLatest(env);
      return new Response(JSON.stringify({ ok: true, ...r }), { headers: { "content-type": "application/json" } });
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(infoHtml, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    return new Response("not found", { status: 404 });
  },

  // cron trigger → auto-detect a new panel release and notify every user
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env));
  },
};
