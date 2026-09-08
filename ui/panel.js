/* ================================================================
   Nika Net — Panel logic (API-first).
   When served by the Nika worker, it talks to /api/* and shows real
   data (users, usage, requests, activity). When opened as a static
   preview (no server), it shows an honest "preview" notice and nothing
   fake.
   ================================================================ */
"use strict";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

/* ---------- safe storage (theme/lang only) ---------- */
const store = (() => {
  let mem = {};
  try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); return localStorage; }
  catch (e) {
    return {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; },
    };
  }
})();

/* ---------- i18n ---------- */
const I18N = {
  fa: {
    dir: "rtl", lang: "fa",
    "login.title": "Nika Net", "login.sub": "پنل مدیریت پروکسی — روی Cloudflare Workers",
    "login.password": "رمز عبور ادمین", "login.passwordPh": "رمز عبور", "login.enter": "ورود به پنل",
    "login.hintFirst": "🔓 اولین ورود — رمزی که انتخاب می‌کنی به‌عنوان رمز ادمین ثبت می‌شود (حداقل ۴ کاراکتر)",
    "login.hintPass": "رمز عبور ادمین را وارد کن",
    "login.hintPreview": "این پیش‌نمایش فایل است — برای دادهٔ واقعی، پنل را از آدرس زندهٔ ورکر باز کن",
    "login.wrong": "رمز اشتباه است", "login.short": "رمز باید حداقل ۴ کاراکتر باشد",
    "nav.dash": "داشبورد", "nav.users": "کاربران", "nav.sub": "اشتراک", "nav.settings": "تنظیمات",
    "stat.users": "کاربران", "stat.active": "فعال", "stat.req": "درخواست امروز", "stat.gig": "گیگابایت مصرف", "stat.proto": "پروتکل فعال",
    "dash.traffic": "ترافیک (۷ روز اخیر)", "dash.gb": "بر حسب گیگابایت", "dash.usage": "مصرف", "dash.activity": "فعالیت‌های اخیر",
    "dash.today": "امروز", "dash.nochart": "هنوز دادهٔ ترافیکی ثبت نشده است", "act.empty": "هنوز فعالیتی ثبت نشده است",
    "users.title": "مدیریت کاربران", "users.add": "+ کاربر جدید", "users.name": "نام", "users.status": "وضعیت", "users.used": "مصرف", "users.expiry": "انقضا",
    "users.empty": "هنوز کاربری نیست — اول یک کاربر بساز",
    "u.active": "فعال", "u.inactive": "غیرفعال", "u.expired": "منقضی", "u.sub": "اشتراک", "u.del": "حذف",
    "sub.title": "ساخت کانفیگ اشتراک", "sub.user": "کاربر", "sub.userD": "انتخاب کاربر برای نمایش کانفیگ",
    "sub.vless": "VLESS", "sub.vlessD": "پروتکل اصلی — روی WebSocket + TLS",
    "sub.trojan": "Trojan", "sub.trojanD": "پروتکل دوم — استتار بهتر",
    "sub.warp": "WARP", "sub.warpD": "پشتیبانی از تماس‌ها (UDP) و شرایط بحرانی",
    "sub.preview": "پیش‌نمایش کانفیگ", "sub.previewD": "خروجی برای کلاینت‌ها", "sub.copy": "کپی", "sub.gen": "تولید مجدد",
    "sub.empty": "هنوز کاربری نساختی — اول از بخش «کاربران» یک کاربر بساز",
    "set.general": "عمومی", "set.title": "عنوان پنل", "set.host": "دامنه / Host ورکر", "set.sni": "SNI / Host جعلی",
    "set.wsPath": "مسیر WebSocket", "set.security": "امنیت", "set.newpass": "رمز عبور جدید", "set.brute": "محافظت Brute-Force",
    "set.bruteD": "مسدودسازی موقت بعد از تلاش ناموفق", "set.cleanip": "IP های تمیز", "set.cleanipD": "هر خط یک IP", "set.save": "ذخیره تنظیمات",
    "m.addUser": "کاربر جدید", "m.name": "نام کاربر", "m.namePh": "مثلاً: علی", "m.quota": "سهمیه (GB)", "m.days": "مدت (روز)",
    "m.save": "ذخیره", "m.cancel": "انصراف",
    "toast.copied": "کپی شد ✓", "toast.saved": "ذخیره شد ✓", "toast.deleted": "حذف شد", "toast.gen": "کانفیگ به‌روز شد ✓",
    "toast.toggled": "وضعیت تغییر کرد", "toast.preview": "در پیش‌نمایش، اتصال به سرور نیست",
    "common.error": "خطا در دریافت اطلاعات", "common.loading": "در حال بارگذاری…",
    "page.dash": "داشبورد", "page.dashD": "نمای کلی وضعیت پنل", "page.users": "کاربران", "page.usersD": "مدیریت کاربران و اشتراک‌ها",
    "page.sub": "اشتراک", "page.subD": "ساخت و پیش‌نمایش کانفیگ", "page.set": "تنظیمات", "page.setD": "پیکربندی پنل و امنیت",
  },
  en: {
    dir: "ltr", lang: "en",
    "login.title": "Nika Net", "login.sub": "Proxy control panel — on Cloudflare Workers",
    "login.password": "Admin password", "login.passwordPh": "Password", "login.enter": "Sign in",
    "login.hintFirst": "🔓 First sign-in — the password you choose becomes the admin password (min 4 chars)",
    "login.hintPass": "Enter the admin password",
    "login.hintPreview": "This is a static preview — open the live panel URL for real data",
    "login.wrong": "Wrong password", "login.short": "Password must be at least 4 characters",
    "nav.dash": "Dashboard", "nav.users": "Users", "nav.sub": "Subscription", "nav.settings": "Settings",
    "stat.users": "Users", "stat.active": "active", "stat.req": "Requests today", "stat.gig": "GB used", "stat.proto": "Active protocols",
    "dash.traffic": "Traffic (last 7 days)", "dash.gb": "in gigabytes", "dash.usage": "Usage", "dash.activity": "Recent activity",
    "dash.today": "today", "dash.nochart": "No traffic data yet", "act.empty": "No activity yet",
    "users.title": "User management", "users.add": "+ Add user", "users.name": "Name", "users.status": "Status", "users.used": "Usage", "users.expiry": "Expiry",
    "users.empty": "No users yet — create your first user",
    "u.active": "Active", "u.inactive": "Inactive", "u.expired": "Expired", "u.sub": "Sub", "u.del": "Delete",
    "sub.title": "Build subscription config", "sub.user": "User", "sub.userD": "Pick a user to show their config",
    "sub.vless": "VLESS", "sub.vlessD": "Primary protocol — over WebSocket + TLS",
    "sub.trojan": "Trojan", "sub.trojanD": "Secondary protocol — better stealth",
    "sub.warp": "WARP", "sub.warpD": "Calls (UDP) support & critical situations",
    "sub.preview": "Config preview", "sub.previewD": "Output for clients", "sub.copy": "Copy", "sub.gen": "Regenerate",
    "sub.empty": "No users yet — create one under Users first",
    "set.general": "General", "set.title": "Panel title", "set.host": "Worker domain / host", "set.sni": "Fake SNI / Host",
    "set.wsPath": "WebSocket path", "set.security": "Security", "set.newpass": "New password", "set.brute": "Brute-force protection",
    "set.bruteD": "Temporary block after failed attempts", "set.cleanip": "Clean IPs", "set.cleanipD": "One IP per line", "set.save": "Save settings",
    "m.addUser": "New user", "m.name": "Name", "m.namePh": "e.g. Ali", "m.quota": "Quota (GB)", "m.days": "Days",
    "m.save": "Save", "m.cancel": "Cancel",
    "toast.copied": "Copied ✓", "toast.saved": "Saved ✓", "toast.deleted": "Deleted", "toast.gen": "Config refreshed ✓",
    "toast.toggled": "Status changed", "toast.preview": "No server connection in preview mode",
    "common.error": "Failed to load", "common.loading": "Loading…",
    "page.dash": "Dashboard", "page.dashD": "Panel status overview", "page.users": "Users", "page.usersD": "Manage users & subscriptions",
    "page.sub": "Subscription", "page.subD": "Build & preview configs", "page.set": "Settings", "page.setD": "Panel config & security",
  },
};
let LANG = store.getItem("nn_lang") || "fa";
const t = (k) => (I18N[LANG] && I18N[LANG][k]) || I18N.fa[k] || k;
const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (n) => (n == null ? 0 : n).toLocaleString(LANG === "fa" ? "fa-IR" : "en-US");

function applyLang() {
  const d = I18N[LANG];
  document.documentElement.lang = d.lang;
  document.documentElement.dir = d.dir;
  $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $$("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  setPage(currentPage);
}

/* ---------- theme ---------- */
let THEME = store.getItem("nn_theme") || "dark";
function applyTheme() {
  document.documentElement.dataset.theme = THEME;
  $("#iconMoon").classList.toggle("hidden", THEME !== "dark");
  $("#iconSun").classList.toggle("hidden", THEME !== "light");
}
$("#themeBtn").onclick = () => { THEME = THEME === "dark" ? "light" : "dark"; store.setItem("nn_theme", THEME); applyTheme(); };
$("#langBtn").onclick = () => { LANG = LANG === "fa" ? "en" : "fa"; store.setItem("nn_lang", LANG); applyLang(); };

/* ---------- state ---------- */
let MODE = "preview"; // "live" | "preview"
let SETUP = false;
let currentPage = "dashboard";
let currentFmt = "base64";
let proto = { vless: true, trojan: true, warp: true };
const state = { status: null, users: [], settings: null, selectedUserId: null, gen: null };

/* ---------- api ---------- */
async function api(path, opts = {}) {
  const init = { method: opts.method || "GET", headers: {} };
  if (opts.body !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(opts.body);
  }
  return fetch(path, init); // same-origin: cookies included automatically
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

/* ---------- boot ---------- */
async function init() {
  applyTheme();
  applyLang();
  try {
    const res = await api("/api/info");
    const info = await res.json();
    if (res.ok && info && typeof info.setup === "boolean") {
      MODE = "live";
      SETUP = info.setup;
      if (info.protocols) proto = info.protocols;
      await checkSession();
      return;
    }
  } catch (e) { /* fall through to preview */ }
  MODE = "preview";
  $("#demoHint").textContent = t("login.hintPreview");
  showLogin();
}

async function checkSession() {
  const res = await api("/api/status");
  if (res.ok) {
    await loadAll();
    showApp();
  } else {
    $("#demoHint").textContent = SETUP ? t("login.hintFirst") : t("login.hintPass");
    showLogin();
  }
}

function showLogin() { $("#appView").classList.add("hidden"); $("#loginView").classList.remove("hidden"); }
function showApp() { $("#loginView").classList.add("hidden"); $("#appView").classList.remove("hidden"); }

/* ---------- auth ---------- */
async function doLogin() {
  if (MODE !== "live") { toast(t("toast.preview")); return; }
  const pass = $("#loginPass").value;
  if (!pass) { $("#loginError").textContent = t("login.short"); return; }
  const res = await api("/api/login", { method: "POST", body: { password: pass } });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    if (data.setup) SETUP = false;
    $("#loginPass").value = "";
    $("#loginError").textContent = "";
    await loadAll();
    showApp();
  } else {
    $("#loginError").textContent = data.error === "password too short" ? t("login.short") : t("login.wrong");
  }
}
$("#loginBtn").onclick = doLogin;
$("#loginPass").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });

$("#logoutBtn").onclick = async () => {
  if (MODE === "live") { try { await api("/api/logout", { method: "POST" }); } catch (e) {} }
  state.status = null; state.users = []; state.settings = null; state.selectedUserId = null; state.gen = null;
  showLogin();
};

/* ---------- data ---------- */
async function loadAll() {
  try {
    const [st, us, se] = await Promise.all([
      api("/api/status").then((r) => r.json()),
      api("/api/users").then((r) => r.json()),
      api("/api/settings").then((r) => r.json()),
    ]);
    state.status = st;
    state.users = Array.isArray(us) ? us : [];
    state.settings = se;
    if (se && se.protocols) proto = se.protocols;
    syncProtoToggles();
    if (!state.selectedUserId && state.users.length) state.selectedUserId = state.users[0].id;
    if (state.selectedUserId && !state.users.find((u) => u.id === state.selectedUserId)) state.selectedUserId = state.users[0] ? state.users[0].id : null;
    renderDashboard();
    renderUsers();
    renderSub();
  } catch (e) {
    toast(t("common.error"));
  }
}

/* ---------- navigation ---------- */
const PAGES = { dashboard: "page.dash", users: "page.users", subscription: "page.sub", settings: "page.set" };
const DESCS = { dashboard: "page.dashD", users: "page.usersD", subscription: "page.subD", settings: "page.setD" };
function setPage(p) {
  currentPage = p;
  $$("#nav .nav-item").forEach((b) => b.classList.toggle("active", b.dataset.page === p));
  ["dashboard", "users", "subscription", "settings"].forEach((x) => $("#page-" + x).classList.toggle("hidden", x !== p));
  $("#pageTitle").textContent = t(PAGES[p]);
  $("#pageDesc").textContent = t(DESCS[p]);
  if (p === "settings") fillSettingsForm();
}
$$("#nav .nav-item").forEach((b) => (b.onclick = () => setPage(b.dataset.page)));

/* ---------- dashboard ---------- */
function renderDashboard() {
  const st = state.status || {};
  $("#stUsers").textContent = num(st.users);
  $("#stUsersT").textContent = `${t("stat.active")}: ${num(st.active)}`;
  $("#stReq").textContent = num(st.requestsToday);
  $("#stReqT").textContent = t("dash.today");
  $("#stGig").textContent = (st.usedGb || 0).toFixed(2);
  $("#stGigT").textContent = "GB";
  const enabled = ["vless", "trojan", "warp"].filter((p) => st.protocols && st.protocols[p]);
  $("#stProto").textContent = enabled.length;
  $("#stProtoT").textContent = enabled.map((p) => p.toUpperCase()).join("·") || "—";
  drawChart(st.traffic7d);
  renderActivity(st.activity);
}

function drawChart(series) {
  const el = $("#chart");
  const empty = $("#chartEmpty");
  if (!series || !series.length || series.every((p) => (p.gb || 0) === 0)) {
    el.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.textContent = t("dash.nochart");
    return;
  }
  el.classList.remove("hidden");
  empty.classList.add("hidden");
  const data = series.map((p) => p.gb || 0);
  const W = 560, H = 190, P = 8;
  const max = Math.max(...data, 0.01) * 1.2;
  const pts = data.map((v, i) => [P + (i * (W - 2 * P)) / (data.length - 1), H - P - (v / max) * (H - 2 * P)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  $("#linePath").setAttribute("d", line);
  $("#areaPath").setAttribute("d", line + ` L${pts[pts.length - 1][0]},${H - P} L${pts[0][0]},${H - P} Z`);
}

function renderActivity(list) {
  const el = $("#activity");
  if (!list || !list.length) { el.innerHTML = `<div class="empty">${t("act.empty")}</div>`; return; }
  el.innerHTML = list
    .slice(0, 8)
    .map((a) => {
      const when = new Date(a.time).toLocaleString(LANG === "fa" ? "fa-IR" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      return `<div class="row"><div><div class="k">${a.icon ? a.icon + " " : ""}${escHtml(a.text)}</div><div class="d">${when}</div></div></div>`;
    })
    .join("");
}

/* ---------- users ---------- */
function renderUsers() {
  const tb = $("#usersBody");
  if (!state.users.length) {
    tb.innerHTML = `<tr><td colspan="5"><div class="empty">${t("users.empty")}</div></td></tr>`;
    return;
  }
  tb.innerHTML = state.users
    .map((u) => {
      const quota = Number(u.quota) || 0;
      const used = Number(u.used) || 0;
      const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
      const exp = (Number(u.days) || 0) > 0 ? `${u.days} ${t("m.days").toLowerCase()}` : t("u.expired");
      return `<tr>
        <td><b>${escHtml(u.name)}</b></td>
        <td><span class="badge ${u.active ? "ok" : "off"}" style="cursor:pointer" onclick="toggleUser('${u.id}')"><span class="dot"></span>${t(u.active ? "u.active" : "u.inactive")}</span></td>
        <td><div>${used.toFixed(2)} / ${quota} GB</div><div class="progress"><div style="width:${pct}%"></div></div></td>
        <td>${exp}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost" style="padding:7px 12px;font-size:11.5px" onclick="subFor('${u.id}')">🔗 ${t("u.sub")}</button>
          <button class="btn btn-danger" style="padding:7px 12px;font-size:11.5px" onclick="delUser('${u.id}')">✕</button>
        </td></tr>`;
    })
    .join("");
}

async function toggleUser(id) {
  if (MODE !== "live") { toast(t("toast.preview")); return; }
  const res = await api("/api/users/toggle", { method: "POST", body: { id } });
  if (res.ok) { toast(t("toast.toggled")); await loadAll(); }
  else toast(t("common.error"));
}

async function delUser(id) {
  if (MODE !== "live") { toast(t("toast.preview")); return; }
  const res = await api("/api/users?id=" + encodeURIComponent(id), { method: "DELETE" });
  if (res.ok) { toast(t("toast.deleted")); await loadAll(); }
  else toast(t("common.error"));
}

function subFor(id) {
  state.selectedUserId = id;
  setPage("subscription");
  renderSub();
}

/* ---------- add user modal ---------- */
function openAddUser() {
  if (MODE !== "live") { toast(t("toast.preview")); return; }
  $("#modalBack").classList.remove("hidden");
  $("#modalBack").innerHTML = `<div class="modal">
    <h3 data-i18n="m.addUser">کاربر جدید</h3>
    <div class="field"><label data-i18n="m.name">نام کاربر</label><input class="input" id="mName" data-i18n-ph="m.namePh" placeholder="مثلاً: علی"/></div>
    <div class="field-grid">
      <div class="field"><label data-i18n="m.quota">سهمیه (GB)</label><input class="input" id="mQuota" type="number" value="50"/></div>
      <div class="field"><label data-i18n="m.days">مدت (روز)</label><input class="input" id="mDays" type="number" value="30"/></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn btn-primary" id="mSave" data-i18n="m.save">ذخیره</button>
      <button class="btn btn-ghost" id="mCancel" data-i18n="m.cancel">انصراف</button>
    </div>
  </div>`;
  applyLang();
  $("#mCancel").onclick = () => $("#modalBack").classList.add("hidden");
  $("#mSave").onclick = async () => {
    const name = $("#mName").value.trim() || t("m.namePh");
    const quota = +$("#mQuota").value || 50;
    const days = +$("#mDays").value || 30;
    const res = await api("/api/users", { method: "POST", body: { name, quota, days } });
    if (res.ok) { toast(t("toast.saved")); $("#modalBack").classList.add("hidden"); await loadAll(); }
    else toast(t("common.error"));
  };
}
$("#addUserBtn").onclick = openAddUser;
$("#modalBack").onclick = (e) => { if (e.target.id === "modalBack") $("#modalBack").classList.add("hidden"); };

/* ---------- subscription ---------- */
async function renderSub() {
  syncProtoToggles();
  const sel = $("#subUserSel");
  if (sel) {
    sel.innerHTML = state.users.map((u) => `<option value="${u.id}">${escHtml(u.name)}</option>`).join("");
    if (state.selectedUserId) sel.value = state.selectedUserId;
  }
  if (!state.users.length) {
    $("#fmtOut").textContent = t("sub.empty");
    $("#copyBtn").disabled = true;
    return;
  }
  $("#copyBtn").disabled = false;
  await loadGen();
}

async function loadGen() {
  const id = state.selectedUserId || (state.users[0] && state.users[0].id);
  if (!id) return;
  try {
    const res = await api("/api/gen?id=" + encodeURIComponent(id));
    if (!res.ok) { $("#fmtOut").textContent = t("common.error"); return; }
    state.gen = await res.json();
    renderFmt();
  } catch (e) {
    $("#fmtOut").textContent = t("common.error");
  }
}

function renderFmt() {
  const g = state.gen || {};
  const map = {
    base64: "vmess://" + (g.base64 || ""),
    clash: g.clash || "",
    singbox: g.singbox || "",
    warp: g.warp || `# WARP ${LANG === "fa" ? "غیرفعال است" : "disabled"}`,
  };
  $("#fmtOut").textContent = map[currentFmt] || "";
}

function syncProtoToggles() {
  $$(".toggle[data-p]").forEach((el) => {
    const p = el.dataset.p;
    el.classList.toggle("on", !!proto[p]);
  });
}

async function toggleProto(el) {
  const p = el.dataset.p;
  el.classList.toggle("on");
  proto[p] = el.classList.contains("on");
  if (MODE === "live") {
    const res = await api("/api/settings", { method: "POST", body: { protocols: proto } });
    if (res.ok) { toast(t("toast.saved")); await loadGen(); }
    else { el.classList.toggle("on"); proto[p] = !proto[p]; }
  }
}

$$("#fmtTabs .tab").forEach((b) => (b.onclick = () => {
  currentFmt = b.dataset.fmt;
  $$("#fmtTabs .tab").forEach((x) => x.classList.toggle("active", x === b));
  renderFmt();
}));
$("#copyBtn").onclick = async () => {
  try { await navigator.clipboard.writeText($("#fmtOut").textContent); toast(t("toast.copied")); }
  catch (e) { toast("✕"); }
};
$("#refreshBtn").onclick = () => { loadGen(); toast(t("toast.gen")); };

/* ---------- settings ---------- */
function fillSettingsForm() {
  $("#setTitle").value = (state.settings && state.settings.title) || "";
  $("#setHost").value = (state.settings && state.settings.host) || "";
  $("#setSni").value = (state.settings && state.settings.sni) || "";
  $("#setWsPath").value = (state.settings && state.settings.wsPath) || "";
  $("#setIps").value = ((state.settings && state.settings.cleanIps) || []).join("\n");
}
$("#saveBtn").onclick = async () => {
  if (MODE !== "live") { toast(t("toast.preview")); return; }
  const body = {
    title: $("#setTitle").value || "Nika Net",
    host: $("#setHost").value,
    sni: $("#setSni").value,
    wsPath: $("#setWsPath").value || "/nika-ws",
    cleanIps: $("#setIps").value.split("\n").map((x) => x.trim()).filter(Boolean),
    protocols: proto,
  };
  const res = await api("/api/settings", { method: "POST", body });
  if (res.ok) { toast(t("toast.saved")); await loadAll(); }
  else toast(t("common.error"));
};

/* ---------- boot ---------- */
init();
