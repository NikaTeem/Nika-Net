// Nika Net — authentication helpers (SHA-256 password + signed session).

import { Settings } from "./types";

const enc = new TextEncoder();

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

// HMAC-SHA256 signed session cookie value: payload.signature
export async function signSession(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return payload + "." + [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifySession(secret: string, token: string): Promise<boolean> {
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const expected = await signSession(secret, payload);
  const a = expected.split(".")[1];
  const b = token.slice(i + 1);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let j = 0; j < a.length; j++) diff |= a.charCodeAt(j) ^ b.charCodeAt(j);
  return diff === 0;
}

export async function isAuthed(req: Request, settings: Settings): Promise<boolean> {
  const cookie = (req.headers.get("Cookie") || "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("nika_session="));
  if (!cookie) return false;
  const token = decodeURIComponent(cookie.split("=").slice(1).join("="));
  return verifySession(settings.sessionSecret, token);
}

export const SESSION_COOKIE = "nika_session";
