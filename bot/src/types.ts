// Nika Net Launcher — shared types
export interface Env {
  TELEGRAM_TOKEN: string;
  WEBHOOK_SECRET: string;
  NIKA_SECRET: string;
  BOT_KV: KVNamespace;
  BOT_ADMIN_KEY?: string;
}
