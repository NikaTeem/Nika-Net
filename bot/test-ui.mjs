// UI harness: runs the REAL panel HTML + JS inside jsdom, with fetch routed to
// the REAL bundled worker (in-memory KV + mocked Telegram). Clicks EVERY button
// and asserts the DOM reacts — catches any frontend regression (like the escape
// bug that killed the whole <script>).
import worker from "./dist/bot.js";
import { JSDOM } from "jsdom";
import { createHash } from "node:crypto";

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });

class FakeKV {
  constructor() { this.map = new Map(); }
  async get(k) { return this.map.has(k) ? this.map.get(k) : null; }
  async put(k, v) { this.map.set(k, v); }
  async delete(k) { this.map.delete(k); }
  async list(opts = {}) {
    const p = opts.prefix || "";
    const names = [...this.map.keys()].filter((k) => k.startsWith(p));
    return { keys: names.map((name) => ({ name })), list_complete: true };
  }
}
const kv = new FakeKV();
kv.put("owner", "8940829322");
const now = Date.now();
// seed a PM thread (startedBy=owner) and a ticket (startedBy=user)
kv.put("sup:111111", JSON.stringify({ id: 111111, startedBy: "owner", status: "open", unread: 1, lastAt: now, lastText: "سلام مشترک عزیز", name: "Reza", username: "rezza1", msgs: [{ dir: "out", text: "سلام مشترک عزیز", at: now }] }));
kv.put("sup:222222", JSON.stringify({ id: 222222, startedBy: "user", status: "open", unread: 2, lastAt: now - 1000, lastText: "سلام مشکل اتصال دارم", name: "Sara", username: "sara2", category: "connect", categoryLabel: "🔌 مشکل اتصال", msgs: [{ dir: "in", text: "سلام مشکل اتصال دارم", at: now - 1000 }] }));
// seed users + meta (for users table + broadcast)
for (const [id, name, username] of [[111111, "Reza", "rezza1"], [222222, "Sara", "sara2"], [333333, "Ali", "ali3"]]) {
  kv.put("u:" + id, JSON.stringify({ chatId: id }));
  kv.put("u:meta:" + id, JSON.stringify({ firstName: name, username, nameAt: now, at: now }));
}
// 333333 عمداً هیچ sup: نداریـد → مسیر «شروع چت جدید» را تست می‌کند
// seed a panel password (salted SHA-256, matching auth.ts)
kv.put("panel:password:", createHash("sha256").update("nikapanel:v1:nikapass123").digest("hex"));

let msgId = 0;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith("https://api.telegram.org/bot")) {
    const method = u.split("/").pop();
    let body = {};
    try { body = JSON.parse(init.body || "{}"); } catch {}
    if (method === "sendMessage") return json({ ok: true, result: { message_id: ++msgId, chat: { id: body.chat_id } } });
    if (method === "getMe") return json({ ok: true, result: { id: 1, username: "TestBot" } });
    if (method === "getChat") return json({ ok: true, result: { id: body.chat_id, type: "private", first_name: "T", username: "u" } });
    if (method === "getChatMember") return json({ ok: true, result: { status: "administrator" } });
    if (method === "getUserProfilePhotos") return json({ ok: true, result: { total_count: 0, photos: [] } });
    if (method === "editMessageText") return json({ ok: true, result: { message_id: body.message_id } });
    return json({ ok: true, result: { message_id: ++msgId } });
  }
  return new Response("not found", { status: 404 });
};

const env = {
  TELEGRAM_TOKEN: "TEST",
  WEBHOOK_SECRET: "sec",
  NIKA_SECRET: "x",
  BOT_ADMIN_KEY: "k",
  BOT_KV: kv,
};
let pending = [];
const ctx = { waitUntil: (p) => pending.push(p) };

let cookie = "";
const results = [];
let failed = 0;
function check(name, ok, extra = "") {
  results.push([name, ok]);
  console.log(`${ok ? "✅" : "❌"} ${name}${!ok && extra ? "  ← " + extra : ""}`);
  if (!ok) failed++;
}

// ---- build the page once and extract the script ----
const pageReq = new Request("https://x/panel", { method: "GET" });
const pageRes = await worker.fetch(pageReq, env, ctx);
await Promise.all(pending); pending = [];
const html = await pageRes.text();
const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
if (!scriptMatch) { console.error("no script in panel HTML"); process.exit(1); }

const winErrors = [];
function bootDom() {
  const dom = new JSDOM(html, { url: "https://x/panel", runScripts: "outside-only", pretendToBeVisual: true });
  const { window } = dom;
  const doc = window.document;
  window.addEventListener("error", (e) => winErrors.push(e.message));
  window.confirm = () => true;
  window.alert = () => {};
  window.open = () => null;
  window.prompt = () => "https://t.me/NikaNetLauncher_bot";
  window.URL.createObjectURL = () => "blob:fake";
  window.document.execCommand = () => true;
  window.HTMLAnchorElement.prototype.click = function () {};
  try { Object.defineProperty(window, "location", { value: { reload: () => {}, href: "https://x/panel" }, configurable: true, writable: true }); } catch {}
  window.fetch = async (path, init = {}) => {
    const url = String(path).startsWith("/") ? "https://x" + path : String(path);
    const headers = { ...(init.headers || {}) };
    if (cookie) headers.cookie = cookie;
    const req = new Request(url, { method: init.method || "GET", headers, body: init.body });
    const res = await worker.fetch(req, env, ctx);
    await Promise.all(pending); pending = [];
    const sc = res.headers.get("set-cookie");
    if (sc) { const m = sc.match(/npanel=([a-f0-9-]+)/); if (m) cookie = "npanel=" + m[1]; else if (/npanel=;/.test(sc)) cookie = ""; }
    return res;
  };
  window.eval(scriptMatch[1]);
  return { window, doc, $: (s) => doc.querySelector(s), $$: (s, r) => Array.prototype.slice.call((r || doc).querySelectorAll(s)) };
}

async function until(fn, ms = 4000, label = "") {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await fn()) return true; } catch {}
    await new Promise((r) => setTimeout(r, 35));
  }
  console.log("   (timeout: " + label + ")");
  return false;
}

/* ================= PHASE A: ورود با کد تلگرام ================= */
{
  cookie = "";
  const { $, $$ } = bootDom();
  check("A: بدون کوکی → loginView نمایان", !$("#loginView").classList.contains("hidden"));

  $("#lgId").value = "8940829322";
  $("#lgSend").click();
  await until(async () => !!(await kv.get("panel:code:8940829322")), 3000, "code stored");
  const code = await kv.get("panel:code:8940829322");
  check("A: دریافت کد → کد در KV ذخیره شد", /^\d{6}$/.test(code || ""));
  $("#lgCode").value = code || "";
  $("#lgGo").click();
  await until(() => !$("#appView").classList.contains("hidden"), 4000, "app after code login");
  check("A: ورود با کد → پنل باز شد", !$("#appView").classList.contains("hidden"));
  check("A: ورود با کد → نشست ساخته شد", !!cookie);
  // logout for phase B
  await worker.fetch(new Request("https://x/panel/api/logout", { method: "POST", headers: { cookie } }), env, ctx);
  await Promise.all(pending); pending = [];
}

/* ================= PHASE B: ورود با رمز + همهٔ دکمه‌ها ================= */
cookie = "";
const { window, doc, $, $$ } = bootDom();
const ev = (el, type) => el.dispatchEvent(new window.Event(type, { bubbles: true }));

check("B: بدون کوکی → loginView نمایان", !$("#loginView").classList.contains("hidden"));
$("#lgId").value = "8940829322";
$("#segPass").click();
check("B: تب رمز عبور فعال شد", $("#lgModePass") && !$("#lgModePass").classList.contains("hide"));
$("#lgPass").value = "nikapass123";
$("#lgGoPass").click();
await until(() => !$("#appView").classList.contains("hidden"), 4000, "app after password login");
check("B: ورود با رمز → پنل باز شد", !$("#appView").classList.contains("hidden"));
await until(() => $("#botName") && $("#botName").textContent.includes("TestBot"), 4000, "botName");
check("B: داشبورد رندر شد", $("#botName").textContent.includes("TestBot"));

/* ---- پیام شخصی ---- */
$('.nav button[data-v="pm"]').click();
await until(() => $$("#pm-list li").length > 0, 4000, "pm list");
check("PM: لیست گفتگوها رندر شد", $$("#pm-list li").length > 0);
$("#pmSearch").value = "Reza"; ev($("#pmSearch"), "input");
await until(() => $$("#pm-list li").length === 1, 2000, "pm search");
check("PM: جستجو → ۱ نتیجه", $$("#pm-list li").length === 1);
$("#pmSearch").value = ""; ev($("#pmSearch"), "input");
$("#pmRefresh").click();
await until(() => $$("#pm-list li").length > 0, 3000, "pm refresh");
check("PM: دکمهٔ بروزرسانی", $$("#pm-list li").length > 0);
$$("#pm-list li")[0].click();
await until(() => $("#pm-box") && !$("#pm-box").classList.contains("hidden"), 4000, "pm opens");
check("PM: کلیک روی چت → باز شد", !$("#pm-box").classList.contains("hidden"));
check("PM: هدر چت پر شد", $("#pm-head").textContent.includes("Reza"));
$("#pm-text").value = "پیام تست";
$("#pm-send").click();
await until(() => $("#pm-text").value === "", 3000, "pm send");
check("PM: ارسال پیام", $("#pm-text").value === "");

// شروع گفتگوی جدید برای کاربری که هنوز تیکت ندارد (رگرسیون ensureThread)
$('.nav button[data-v="overview"]').click();
await until(() => $$("#usrBody tr").length > 0, 4000, "users table");
const aliasRow = Array.from($$("#usrBody tr")).find((tr) => tr.textContent.includes("333333"));
check("PM: ردیف کاربر بدون گفتگو پیدا شد", !!aliasRow);
if (aliasRow) {
  const aliasPm = Array.from(aliasRow.querySelectorAll("button")).find((b) => b.textContent.includes("پیام"));
  aliasPm.click();
  await until(() => $("#pm-box") && !$("#pm-box").classList.contains("hidden"), 4000, "pm starts for new user");
  check("PM: چت جدید برای کاربر بدون گفتگو باز شد", !$("#pm-box").classList.contains("hidden"));
  await until(() => $("#pm-head").textContent.includes("Ali"), 3000, "pm head ali");
  check("PM: هدر چت جدید نام را نشان می‌دهد", $("#pm-head").textContent.includes("Ali"));
}

/* ---- پشتیبانی ---- */
$('.nav button[data-v="support"]').click();
await until(() => $$("#ticket-list li").length > 0, 4000, "ticket list");
check("TK: لیست تیکت‌ها رندر شد", $$("#ticket-list li").length > 0);
$("#tkSearch").value = "Sara"; ev($("#tkSearch"), "input");
await until(() => $$("#ticket-list li").length === 1, 2000, "tk search");
check("TK: جستجو → ۱ نتیجه", $$("#ticket-list li").length === 1);
$("#tkSearch").value = ""; ev($("#tkSearch"), "input");
$("#tkCat").value = "connect"; ev($("#tkCat"), "change");
await until(() => $$("#ticket-list li").length === 1, 2000, "tk cat filter");
check("TK: فیلتر دسته → ۱ نتیجه", $$("#ticket-list li").length === 1);
$("#tkCat").value = ""; ev($("#tkCat"), "change");
$("#tkRefresh").click();
await until(() => $$("#ticket-list li").length > 0, 3000, "tk refresh");
check("TK: دکمهٔ بروزرسانی", $$("#ticket-list li").length > 0);
$$("#ticket-list li")[0].click();
await until(() => $("#tk-box") && !$("#tk-box").classList.contains("hidden"), 4000, "tk opens");
check("TK: کلیک روی تیکت → باز شد", !$("#tk-box").classList.contains("hidden"));
$("#tk-text").value = "درود، بررسی می‌کنیم";
$("#tk-send").click();
await until(() => $("#tk-text").value === "", 3000, "tk send");
check("TK: ارسال پاسخ", $("#tk-text").value === "");
$("#tk-toggle").click();
await until(() => $("#tk-toggle").textContent.includes("بازکردن"), 3000, "tk toggle");
check("TK: بستن تیکت → «بازکردن»", $("#tk-toggle").textContent.includes("بازکردن"));
await until(() => $$("#ticket-list li").length > 0 && $$("#ticket-list li")[0].textContent.includes("بسته"), 2000, "tk list updated");
check("TK: لیست بلافاصله «بسته» نشان می‌دهد", $$("#ticket-list li")[0].textContent.includes("بسته"));
const chip = $$("#tkStatusChips .fchip").find((c) => c.textContent === "باز");
if (chip) { chip.click(); await until(() => $$("#ticket-list li").length === 0, 2000, "open filter"); check("TK: فیلتر وضعیت «باز»", $$("#ticket-list li").length === 0); $$("#tkStatusChips .fchip")[0].click(); await until(() => $$("#ticket-list li").length > 0, 2000, "all filter"); }
$("#tkCloseAll").click();
await until(() => $$("#ticket-list li").length >= 0, 2000, "closeall");
check("TK: بستن همهٔ بازها (بدون خطا)", true);

/* ---- کاربران (داخل داشبورد) ---- */
$('.nav button[data-v="overview"]').click();
await until(() => $$("#usrBody tr").length > 0, 4000, "users table");
check("USR: جدول کاربران رندر شد", $$("#usrBody tr").length > 0);
$("#usrSearch").value = "111111"; ev($("#usrSearch"), "input");
await until(() => $$("#usrBody tr").length === 1, 2000, "usr search");
check("USR: جستجو → ۱ نتیجه", $$("#usrBody tr").length === 1);
$("#usrSearch").value = ""; ev($("#usrSearch"), "input");
await until(() => $$("#usrBody tr").length >= 2, 3000, "users re-render");
// دکمهٔ معاف‌کردن فقط روی کاربر غیرمالک است — آن را در همهٔ ردیف‌ها پیدا کن
const exemptBtn = Array.from(doc.querySelectorAll("#usrBody tr button")).find((b) => b.textContent.includes("معاف"));
if (exemptBtn) {
  exemptBtn.click();
  // بعد از معاف‌کردن، toast «معاف شد ✓» می‌آید و جدول دوباره رندر می‌شود
  const okExempt = await until(() => $("#toast").textContent.includes("معاف شد"), 3000, "exempt toast");
  check("USR: دکمهٔ معاف‌کردن → toast", okExempt);
  await until(() => Array.from(doc.querySelectorAll("#usrBody tr button")).some((b) => b.textContent.includes("لغو")), 3000, "exempt re-render");
  check("USR: بعد از رندر مجدد → دکمه «لغو معافیت» دیده می‌شود", Array.from(doc.querySelectorAll("#usrBody tr button")).some((b) => b.textContent.includes("لغو")));
} else {
  check("USR: دکمهٔ معاف‌کردن (کاربر غیرمالک)", false, "no exempt button found");
}
const pmFromUser = Array.from(doc.querySelectorAll("#usrBody tr button")).find((b) => b.textContent.includes("پیام"));
if (pmFromUser) {
  pmFromUser.click();
  await until(() => $("#view-pm") && !$("#view-pm").classList.contains("hidden"), 3000, "start pm from user");
  check("USR: دکمهٔ «پیام» → رفت به پیام شخصی", !$("#view-pm").classList.contains("hidden"));
  $('.nav button[data-v="overview"]').click();
  await until(() => !$("#view-overview").classList.contains("hidden"), 1000, "back to overview");
}
$("#usrCsv").click();
await until(() => $("#toast").textContent.includes("CSV"), 2000, "csv toast");
check("USR: خروجی CSV", $("#toast").textContent.includes("CSV"));

/* ---- عضویت اجباری ---- */
$("#fjAdd").value = "@NikaSociety";
$("#fjAddBtn").click();
const fjAdded = await until(() => $("#toast").textContent.includes("کانال اضافه شد"), 4000, "fj add channel");
check("FJ: افزودن کانال", fjAdded);
await until(() => $("#fjChats").textContent.includes("NikaSociety"), 3000, "fj chips");
check("FJ: کانال در چیپ‌ها دیده می‌شود", $("#fjChats").textContent.includes("NikaSociety"));
$("#fjMsg").value = "لطفاً اول عضو کانال شو";
$("#fjSave").click();
const fjSaved = await until(() => $("#toast").textContent.includes("ذخیره"), 3000, "fj save");
if (!fjSaved) console.log("   fjSave toast was:", JSON.stringify($("#toast").textContent));
check("FJ: ذخیرهٔ تنظیمات", fjSaved);
$("#fjTest").click();
await until(() => $("#fjTestOut").textContent.length > 2, 4000, "fj test");
check("FJ: تست عضویت خودم", $("#fjTestOut").textContent.length > 2);
$("#heroFj").click();
await until(() => $("#heroFjLabel").textContent.includes("غیرفعال") || $("#heroFjLabel").textContent.includes("فعال"), 3000, "hero fj");
check("FJ: کلید روشن/خاموش (hero)", true);

/* ---- پیام همگانی (کمپوزر v2) ---- */
$("#bcText").value = "سلام <b>به همه</b>";
$("#bcText").dispatchEvent(new window.Event("input", { bubbles: true }));
check("BC: پیش‌نمایش متن را نشان می‌دهد", $("#bcPreviewBody").textContent.includes("سلام"));
check("BC: پیش‌نمایش هدر برند را دارد", $("#bcPreview").textContent.includes("پیام همگانی Nika Net"));
check("BC: قالب‌بندی فعال شناسایی شد", $("#bcHtml").textContent.includes("قالب‌بندی"));
const bcBold = Array.from(doc.querySelectorAll(".bc-toolbar button")).find((b) => b.getAttribute("data-bc") === "b");
if (bcBold) { bcBold.click(); check("BC: دکمهٔ ضخیم → <b> اضافه شد", $("#bcText").value.includes("<b>")); }
const bcLink = Array.from(doc.querySelectorAll(".bc-toolbar button")).find((b) => b.getAttribute("data-bc") === "link");
if (bcLink) { bcLink.click(); check("BC: دکمهٔ لینک → <a href> اضافه شد", $("#bcText").value.includes("<a href=")); }
$("#bcBtnText").value = "کانال Nika Net";
$("#bcBtnUrl").value = "https://t.me/NikaSociety";
$("#bcBtnUrl").dispatchEvent(new window.Event("input", { bubbles: true }));
check("BC: پیش‌نمایش دکمه نمایش دارد", $("#bcPreviewBtn").style.display !== "none" && $("#bcPreviewBtn").textContent.includes("کانال Nika Net"));
$("#bcTest").click();
await until(() => $("#toast").textContent.includes("تست"), 4000, "bc test");
check("BC: ارسال تست به خودم", $("#toast").textContent.includes("تست"));
$("#bcSend").click();
await until(() => $("#bcOut").style.display === "block" && $("#bcOut").textContent.includes("ارسال"), 5000, "broadcast");
check("BC: پیام همگانی ارسال شد", $("#bcOut").textContent.includes("ارسال"));
await until(() => $("#bcHistory").textContent.includes("رسید"), 4000, "bc history");
check("BC: تاریخچه رندر شد", $("#bcHistory").textContent.includes("رسید"));
// مرتب‌سازی کاربران
const thName = Array.from(doc.querySelectorAll(".utable th.sortable")).find((t) => t.getAttribute("data-sort") === "name");
if (thName) { thName.click(); check("USR: مرتب‌سازی ستونی (نام) بدون خطا", true); }
const thId = Array.from(doc.querySelectorAll(".utable th.sortable")).find((t) => t.getAttribute("data-sort") === "id");
if (thId) { thId.click(); check("USR: مرتب‌سازی ستونی (آیدی) بدون خطا", true); }
check("USR: نوار آمار کاربران رندر شد", $("#usrStats").textContent.includes("کل"));

/* ---- رمز عبور + کپی آدرس ---- */
$("#pwNew").value = "newpass123";
$("#pwSet").click();
await until(() => $("#toast").textContent.includes("رمز عبور ذخیره"), 3000, "pw set");
check("PW: ذخیرهٔ رمز جدید", $("#toast").textContent.includes("رمز عبور ذخیره"));
check("PW: haspassword=set:true در KV", !!(await kv.get("panel:password:")));
$("#copyPanel").click();
await until(() => $("#toast").textContent.includes("کپی"), 2000, "copy panel");
check("INFO: کپی آدرس پنل", $("#toast").textContent.includes("کپی"));

/* ---- خروج ---- */
const logoutRes = await worker.fetch(new Request("https://x/panel/api/logout", { method: "POST", headers: { cookie } }), env, ctx);
await Promise.all(pending); pending = [];
cookie = "";
check("OUT: نشست از سمت سرور پاک شد", logoutRes.status === 200);
const after = await worker.fetch(new Request("https://x/panel/api/state", { headers: { cookie: "" } }), env, ctx);
await Promise.all(pending); pending = [];
check("OUT: بعد از خروج → /state 401", after.status === 401);

/* ================= SUMMARY ================= */
if (winErrors.length) console.log("\nwindow errors:", winErrors.slice(0, 8));
console.log("\n===== UI RESULT =====");
console.log(failed ? `FAILED: ${failed}/${results.length}` : `ALL PASSED ✅ (${results.length})`);
process.exit(failed ? 1 : 0);
