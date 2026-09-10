// Read-only LIVE UI test: loads the REAL deployed panel, logs in with the
// real password, opens the real PM chat and a real ticket. No writes to live KV.
import { JSDOM } from "jsdom";

const BASE = "https://nika-launcher.nikanetteem.workers.dev";
const OWNER = "8940829322";
const PASSWORD = process.env.PANEL_PW || "NikaNet@1404";

let cookie = "";

// login via API
{
  const r = await fetch(`${BASE}/panel/api/password`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
    body: JSON.stringify({ id: Number(OWNER), password: PASSWORD }),
  });
  const sc = r.headers.get("set-cookie") || "";
  const m = sc.match(/npanel=([a-f0-9-]+)/);
  if (!m) { console.error("LIVE login failed:", r.status, await r.text()); process.exit(1); }
  cookie = "npanel=" + m[1];
  console.log("LIVE: logged in via password OK");
}

const html = await (await fetch(`${BASE}/panel`, { headers: { "user-agent": "Mozilla/5.0" } })).text();
const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
if (!scriptMatch) { console.error("no script"); process.exit(1); }

const dom = new JSDOM(html, { url: BASE + "/panel", runScripts: "outside-only", pretendToBeVisual: true });
const { window } = dom;
const doc = window.document;
const $ = (s) => doc.querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || doc).querySelectorAll(s));
window.confirm = () => true;
window.URL.createObjectURL = () => "blob:fake";
try { Object.defineProperty(window, "location", { value: { reload: () => {}, href: BASE + "/panel" }, configurable: true, writable: true }); } catch {}

window.fetch = async (path, init = {}) => {
  const url = String(path).startsWith("/") ? BASE + path : String(path);
  const headers = { ...(init.headers || {}), "user-agent": "Mozilla/5.0" };
  if (cookie) headers.cookie = cookie;
  const res = await fetch(url, { method: init.method || "GET", headers, body: init.body });
  const sc = res.headers.get("set-cookie");
  if (sc) { const mm = sc.match(/npanel=([a-f0-9-]+)/); if (mm) cookie = "npanel=" + mm[1]; else if (/npanel=;/.test(sc)) cookie = ""; }
  return res;
};

window.eval(scriptMatch[1]);

async function until(fn, ms = 4000, label = "") {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (fn()) return true; } catch {}
    await new Promise((r) => setTimeout(r, 40));
  }
  console.log("   (timeout: " + label + ")");
  return false;
}

let failed = 0;
const check = (n, ok, extra = "") => { console.log(`${ok ? "✅" : "❌"} ${n}${!ok && extra ? "  ← " + extra : ""}`); if (!ok) failed++; };

await until(() => !$("#appView").classList.contains("hidden"), 5000, "app loads");
check("LIVE: پنل بعد از ورود باز شد", !$("#appView").classList.contains("hidden"));

// PM tab
$('.nav button[data-v="pm"]').click();
await until(() => $("#pm-list").children.length > 0, 5000, "pm list");
const pmCount = $$("#pm-list li").length;
check("LIVE: لیست پیام شخصی رندر شد (" + pmCount + " چت)", pmCount > 0);
const firstPm = $$("#pm-list li")[0];
if (firstPm) {
  const id = firstPm.getAttribute("data-id");
  firstPm.click();
  const opened = await until(() => $("#pm-box") && !$("#pm-box").classList.contains("hidden"), 5000, "pm opens (id=" + id + ")");
  check("LIVE: کلیک روی چت پیام شخصی → باز شد", opened, "id=" + id);
  if (opened) {
    check("LIVE: هدر چت پر شد", ($("#pm-head").textContent || "").length > 2);
    check("LIVE: بدنهٔ پیام رندر شد", ($("#pm-thread").textContent || "").length > 2);
  }
}

// Support tab
$('.nav button[data-v="support"]').click();
await until(() => $("#ticket-list").children.length > 0, 5000, "ticket list");
const tkCount = $$("#ticket-list li").length;
check("LIVE: لیست تیکت‌ها رندر شد (" + tkCount + " تیکت)", tkCount > 0);
const firstTk = $$("#ticket-list li")[0];
if (firstTk) {
  const id = firstTk.getAttribute("data-id");
  firstTk.click();
  const opened = await until(() => $("#tk-box") && !$("#tk-box").classList.contains("hidden"), 5000, "ticket opens (id=" + id + ")");
  check("LIVE: کلیک روی تیکت → باز شد", opened, "id=" + id);
  if (opened) {
    check("LIVE: هدر تیکت پر شد", ($("#tk-head").textContent || "").length > 2);
    check("LIVE: بدنهٔ تیکت رندر شد", ($("#tk-thread").textContent || "").length > 2);
  }
}

console.log("\n===== LIVE UI RESULT =====");
console.log(failed ? `FAILED: ${failed}` : "ALL LIVE CHECKS PASSED ✅");
process.exit(failed ? 1 : 0);
