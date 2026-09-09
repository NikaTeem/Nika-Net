// Nika Net Launcher — web admin panel (served at /panel).
//
// Auth flow: the owner enters their numeric Telegram ID → the bot sends a
// one-time 6-digit code to that chat → the owner enters the code → a signed
// HttpOnly session cookie is issued. The panel manages the bot's forced-join
// (عضویت اجباری) feature and shows the "make bot admin in channel" deep link.

import { Env } from "./types";
import * as tg from "./telegram";
import * as fj from "./forcedjoin";

const PANEL_HTML = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Nika Net — پنل مدیریت بات</title>
<style>
  :root{
    --bg:#0a0e18; --card:rgba(19,26,44,.78); --card2:rgba(28,37,62,.55); --border:#26314e;
    --text:#e9eef9; --muted:#93a0bd; --accent:#7dd3fc; --accent2:#34d399;
    --grad:linear-gradient(135deg,#4f46e5,#0ea5e9); --grad2:linear-gradient(135deg,#6366f1,#22d3ee 55%,#34d399);
    --ok:#34d399; --warn:#fbbf24; --bad:#fb7185;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:"Vazirmatn",-apple-system,"Segoe UI",Tahoma,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
  body::before{content:"";position:fixed;inset:0;pointer-events:none;
    background:radial-gradient(900px 520px at 86% -12%, rgba(99,102,241,.22), transparent 62%),
               radial-gradient(820px 640px at -8% 112%, rgba(34,211,238,.15), transparent 60%)}
  .wrap{max-width:860px;margin:0 auto;padding:28px 18px 60px;position:relative}
  .top{display:flex;align-items:center;gap:14px;margin-bottom:22px}
  .logo{width:52px;height:52px;border-radius:50%;background:var(--grad);display:grid;place-items:center;font-size:24px;box-shadow:0 8px 26px -12px rgba(34,211,238,.5)}
  h1{font-size:20px;font-weight:700;background:var(--grad2);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .sub{color:var(--muted);font-size:12.5px;font-family:ui-monospace,monospace}
  .card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:22px;margin-bottom:16px;backdrop-filter:blur(12px);box-shadow:0 22px 60px -32px rgba(0,0,0,.85)}
  .card h2{font-size:15px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between}
  .card h2 .mini{font-size:10.5px;color:var(--muted);font-family:ui-monospace,monospace;font-weight:500}
  label{display:block;font-size:12px;color:var(--muted);margin:14px 0 7px;font-weight:600}
  input,select,textarea{width:100%;background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;font-size:14px;color:var(--text);font-family:inherit;outline:none}
  input:focus,select:focus,textarea:focus{border-color:var(--accent);box-shadow:0 0 0 4px rgba(34,211,238,.14)}
  textarea{resize:vertical;min-height:86px;line-height:1.8}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:700;border:none;cursor:pointer;transition:.18s;color:#fff}
  .btn:active{transform:translateY(1px)}
  .btn-p{background:var(--grad);box-shadow:0 8px 26px -12px rgba(34,211,238,.5);width:100%}
  .btn-s{background:linear-gradient(135deg,#059669,#10b981)}
  .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted)}
  .btn-ghost:hover{background:var(--card2);color:var(--text)}
  .btn-danger{background:rgba(251,113,133,.13);color:var(--bad);border:1px solid rgba(251,113,133,.3)}
  .row{display:flex;gap:10px}
  .row .btn{flex:1}
  .grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px}
  .stat{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px;position:relative;overflow:hidden}
  .stat::after{content:"";position:absolute;top:0;right:0;left:0;height:2px;background:var(--grad2);opacity:.6}
  .stat .v{font-size:24px;font-weight:700;font-family:ui-monospace,monospace;background:var(--grad2);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .stat .l{color:var(--muted);font-size:12px;margin-top:3px}
  .toggle{position:relative;width:52px;height:28px;background:var(--border);border-radius:99px;cursor:pointer;transition:.25s;border:1px solid var(--muted);flex:none}
  .toggle::after{content:"";position:absolute;top:2px;right:2px;width:22px;height:22px;border-radius:99px;background:var(--muted);transition:.25s}
  .toggle.on{background:var(--grad);border-color:transparent}
  .toggle.on::after{transform:translateX(-24px);background:#fff}
  .badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:700;font-family:ui-monospace,monospace}
  .badge.ok{background:rgba(52,211,153,.13);color:var(--ok)}
  .badge.off{background:rgba(251,113,133,.13);color:var(--bad)}
  .chips{display:flex;flex-direction:column;gap:8px}
  .chip{display:flex;align-items:center;justify-content:space-between;background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:10px 14px;font-family:ui-monospace,monospace;font-size:13px}
  .chip .x{cursor:pointer;color:var(--bad);background:none;border:none;font-size:15px}
  .addrow{display:flex;gap:8px;margin-top:10px}
  .addrow input{flex:1}
  .hint{background:rgba(99,102,241,.12);border:1px solid var(--border);border-radius:12px;padding:11px 13px;font-size:12px;color:var(--muted);line-height:1.9;margin-top:12px}
  .hint b{color:var(--warn)}
  code{font-family:ui-monospace,monospace;background:var(--card2);padding:1px 7px;border-radius:7px;font-size:12.5px;color:var(--accent)}
  a.link{display:inline-flex;align-items:center;gap:8px;color:#fff;text-decoration:none;background:var(--grad);border-radius:12px;padding:12px 18px;font-size:14px;font-weight:700}
  ol{margin:12px 20px 0;color:var(--muted);font-size:13px;line-height:2}
  .toast{position:fixed;bottom:22px;right:50%;transform:translateX(50%);background:#0e1424;border:1px solid var(--border);border-right:3px solid var(--accent2);padding:12px 22px;border-radius:14px;font-size:13px;font-weight:600;box-shadow:0 22px 60px -32px rgba(0,0,0,.9);opacity:0;transition:.3s;pointer-events:none;z-index:99}
  .toast.show{opacity:1}
  .hidden{display:none!important}
  .field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media(max-width:640px){.field-grid{grid-template-columns:1fr}}
  .testrow{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;background:var(--card2);border:1px solid var(--border);margin-top:8px;font-size:13px;font-family:ui-monospace,monospace}
</style>
</head>
<body>
<div class="wrap">

  <!-- ================= LOGIN ================= -->
  <div id="loginView">
    <div class="top"><div class="logo">🤖</div><div><h1>Nika Net · پنل مدیریت بات</h1><div class="sub">ورود امن با کد تأیید تلگرام</div></div></div>
    <div class="card">
      <h2>🔐 ورود مالک <span class="mini">فقط برای مالک ربات</span></h2>
      <label>آیدی عددی تلگرام شما</label>
      <input id="lgId" inputmode="numeric" placeholder="مثلاً 8940829322" dir="ltr" />
      <label>کد تأیید (در تلگرام برای شما ارسال می‌شود)</label>
      <input id="lgCode" inputmode="numeric" placeholder="••••••" dir="ltr" />
      <div class="row" style="margin-top:16px">
        <button class="btn btn-p" id="lgSend">📨 دریافت کد در تلگرام</button>
        <button class="btn btn-s" id="lgGo">✅ ورود</button>
      </div>
      <div class="hint" id="lgMsg">آیدی عددی خودت را وارد کن و «دریافت کد» را بزن — ربات فقط برای <b>مالک ربات</b> کد می‌فرستد. کد تا <b>۵ دقیقه</b> معتبر است.</div>
    </div>
  </div>

  <!-- ================= APP ================= -->
  <div id="appView" class="hidden">
    <div class="top"><div class="logo">🤖</div>
      <div style="flex:1"><h1>Nika Net · پنل مدیریت بات</h1><div class="sub" id="botName">@…</div></div>
      <button class="btn btn-danger" id="logout">خروج</button>
    </div>

    <div class="grid3">
      <div class="stat"><div class="v" id="stUsers">0</div><div class="l">کاربر ربات</div></div>
      <div class="stat"><div class="v" id="stFj">—</div><div class="l">عضویت اجباری</div></div>
      <div class="stat"><div class="v" id="stChats">0</div><div class="l">کانال هدف</div></div>
    </div>

    <!-- Forced join -->
    <div class="card">
      <h2>🔒 عضویت اجباری <span class="mini">کاربر باید عضو کانال باشد تا از ربات استفاده کند</span></h2>

      <div style="display:flex;align-items:center;justify-content:space-between">
        <div><b>فعال‌سازی عضویت اجباری</b><div style="color:var(--muted);font-size:12px;margin-top:3px">وقتی روشن باشد، هر پیام کاربر غیرعضو با پیام «عضو شو» پاسخ داده می‌شود</div></div>
        <div class="toggle" id="fjEnabled"></div>
      </div>

      <label>کانال‌ها / گروه‌های هدف (username یا آیدی عددی یا لینک t.me)</label>
      <div class="chips" id="fjChats"></div>
      <div class="addrow">
        <input id="fjAdd" placeholder="@myChannel یا -1001234567890 یا t.me/myChannel" dir="ltr" />
        <button class="btn btn-p" style="width:auto" id="fjAddBtn">➕ افزودن</button>
      </div>

      <div class="field-grid">
        <div><label>شرط عضویت</label>
          <select id="fjMode">
            <option value="any">عضویت در حداقل یکی (ANY)</option>
            <option value="all">عضویت در همه (ALL)</option>
          </select>
        </div>
        <div><label>بررسی مجدد عضویت</label>
          <select id="fjRecheck">
            <option value="0">هر بار (بدون کش)</option>
            <option value="1">هر ۱ ساعت</option>
            <option value="6">هر ۶ ساعت</option>
            <option value="24">هر ۲۴ ساعت</option>
          </select>
        </div>
      </div>

      <label>متن پیام «عضو شو» (می‌توانی از {name} استفاده کنی)</label>
      <textarea id="fjMsg"></textarea>

      <label>متن دکمهٔ تأیید عضویت</label>
      <input id="fjBtn" dir="rtl" placeholder="✅ عضویت انجام شد — بررسی کن" />

      <label>آیدی‌های معاف از عضویت (هر خط یکی — مالک همیشه معاف است)</label>
      <textarea id="fjExempt" dir="ltr" placeholder="123456789"></textarea>

      <div class="row" style="margin-top:16px">
        <button class="btn btn-s" id="fjSave">💾 ذخیره تنظیمات</button>
        <button class="btn btn-ghost" id="fjTest">🔎 تست عضویت خودم</button>
      </div>
      <div id="fjTestOut" style="margin-top:12px"></div>
    </div>

    <!-- Admin in channel -->
    <div class="card">
      <h2>👑 ادمین کردن بات در کانال <span class="mini">پیش‌نیاز عضویت اجباری</span></h2>
      <p style="color:var(--muted);font-size:13px;line-height:2">برای اینکه ربات بتواند عضویت کاربران را بررسی کند، باید در کانال/گروه هدف <b>ادمین</b> باشد. روی دکمهٔ زیر بزن و کانال را انتخاب کن:</p>
      <a class="link" id="adminLink" href="#" target="_blank" rel="noopener">🔗 افزودن بات به‌عنوان ادمین کانال</a>
      <ol>
        <li>روی دکمهٔ بالا بزن (باید خودت ادمینِ همان کانال باشی).</li>
        <li>کانال/گروه موردنظر را انتخاب کن و «Make admin» را بزن.</li>
        <li>دسترسی‌های لازم: ارسال پیام، حذف پیام، دعوت کاربر.</li>
        <li>برگرد و در «عضویت اجباری» همان کانال را اضافه و ذخیره کن.</li>
      </ol>
      <div class="hint">⚠️ بدون ادمین بودن ربات، بررسی عضویت (<code>getChatMember</code>) خطا می‌دهد و عضویت اجباری کار نمی‌کند.</div>
    </div>

    <div class="card">
      <h2>ℹ️ اطلاعات</h2>
      <div class="testrow">آیدی مالک: <b id="ownerId">—</b></div>
      <div class="testrow">آدرس پنل: <b id="panelUrl" dir="ltr">—</b></div>
      <div class="testrow">ربات: <b id="botUname" dir="ltr">—</b></div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var toastTimer;
  function toast(m) {
    var el = $("#toast"); el.textContent = m; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2400);
  }
  async function api(path, opts) {
    var init = { method: opts && opts.method || "GET", headers: {} };
    if (opts && opts.body !== undefined) { init.headers["content-type"] = "application/json"; init.body = JSON.stringify(opts.body); }
    var r = await fetch(path, init);
    var j = {}; try { j = await r.json(); } catch (e) {}
    return { status: r.status, ok: r.ok, j: j };
  }

  /* ---------- login ---------- */
  $("#lgSend").onclick = async function () {
    var id = $("#lgId").value.trim();
    if (!/^\\d{5,}$/.test(id)) { toast("آیدی عددی معتبر وارد کن"); return; }
    var r = await api("/panel/api/request", { method: "POST", body: { id: Number(id) } });
    if (r.ok && r.j.ok) { $("#lgMsg").innerHTML = "✅ کد تأیید به تلگرامت فرستاده شد — اینجا واردش کن و «ورود» را بزن."; toast("کد فرستاده شد ✓"); }
    else { $("#lgMsg").innerHTML = "<b>⛔ " + (r.j.error || "خطا") + "</b>"; toast(r.j.error || "خطا"); }
  };
  $("#lgGo").onclick = async function () {
    var id = $("#lgId").value.trim(), code = $("#lgCode").value.trim();
    if (!/^\\d{5,}$/.test(id) || !/^\\d{4,8}$/.test(code)) { toast("آیدی و کد را کامل وارد کن"); return; }
    var r = await api("/panel/api/verify", { method: "POST", body: { id: Number(id), code: code } });
    if (r.ok && r.j.ok) { toast("خوش آمدی ✓"); await load(); }
    else toast(r.j.error || "کد اشتباه است");
  };
  $("#lgId").addEventListener("keydown", function (e) { if (e.key === "Enter") $("#lgSend").click(); });
  $("#lgCode").addEventListener("keydown", function (e) { if (e.key === "Enter") $("#lgGo").click(); });

  $("#logout").onclick = async function () { await api("/panel/api/logout", { method: "POST" }); location.reload(); };

  /* ---------- app ---------- */
  var state = null;
  async function load() {
    var r = await api("/panel/api/state");
    if (!r.ok) { $("#loginView").classList.remove("hidden"); $("#appView").classList.add("hidden"); return; }
    state = r.j;
    $("#loginView").classList.add("hidden");
    $("#appView").classList.remove("hidden");
    render();
  }

  function render() {
    var fj = state.fj;
    $("#botName").textContent = "@" + state.bot.username;
    $("#stUsers").textContent = state.stats.users.toLocaleString("fa-IR");
    $("#stFj").textContent = fj.enabled ? "روشن" : "خاموش";
    $("#stChats").textContent = (fj.chats.length || 0).toLocaleString("fa-IR");

    $("#fjEnabled").classList.toggle("on", !!fj.enabled);
    $("#fjMode").value = fj.mode === "all" ? "all" : "any";
    $("#fjRecheck").value = String(fj.recheckHours);
    $("#fjMsg").value = fj.message;
    $("#fjBtn").value = fj.buttonText;
    $("#fjExempt").value = (fj.exempt || []).join("\\n");

    var chips = $("#fjChats");
    chips.innerHTML = "";
    (fj.chats || []).forEach(function (c) {
      var d = document.createElement("div"); d.className = "chip";
      var s = document.createElement("span"); s.textContent = c;
      var x = document.createElement("button"); x.className = "x"; x.textContent = "✕";
      x.onclick = function () { removeChat(c); };
      d.appendChild(s); d.appendChild(x); chips.appendChild(d);
    });
    if (!(fj.chats || []).length) chips.innerHTML = '<div style="color:var(--muted);font-size:12.5px">هنوز کانالی اضافه نشده</div>';

    $("#ownerId").textContent = state.bot.ownerId;
    $("#panelUrl").textContent = state.bot.origin + "/panel";
    $("#botUname").textContent = "@" + state.bot.username;
    $("#adminLink").href = state.bot.adminLink;
  }

  var chats = [];
  $("#fjAddBtn").onclick = async function () {
    var v = $("#fjAdd").value.trim();
    if (!v) return;
    var r = await api("/panel/api/fj", { method: "POST", body: { addChat: v } });
    if (r.ok) { state = r.j.state; $("#fjAdd").value = ""; render(); toast("کانال اضافه شد ✓"); }
    else toast(r.j.error || "خطا — کانال را چک کن");
  };
  function removeChat(c) {
    api("/panel/api/fj", { method: "POST", body: { removeChat: c } }).then(function (r) {
      if (r.ok) { state = r.j.state; render(); toast("حذف شد"); }
    });
  }
  $("#fjEnabled").onclick = async function () {
    var r = await api("/panel/api/fj", { method: "POST", body: { enabled: !state.fj.enabled } });
    if (r.ok) { state = r.j.state; render(); toast(state.fj.enabled ? "عضویت اجباری روشن شد ✓" : "عضویت اجباری خاموش شد"); }
  };
  $("#fjSave").onclick = async function () {
    var r = await api("/panel/api/fj", {
      method: "POST",
      body: {
        mode: $("#fjMode").value,
        recheckHours: Number($("#fjRecheck").value),
        message: $("#fjMsg").value,
        buttonText: $("#fjBtn").value,
        exempt: $("#fjExempt").value.split("\\n").map(function (x) { return x.trim(); }).filter(Boolean).map(Number).filter(function (n) { return !isNaN(n); }),
      },
    });
    if (r.ok) { state = r.j.state; render(); toast("ذخیره شد ✓"); }
    else toast("خطا در ذخیره");
  };
  $("#fjTest").onclick = async function () {
    var out = $("#fjTestOut");
    out.innerHTML = '<div style="color:var(--muted);font-size:12.5px">در حال بررسی عضویت تو…</div>';
    var r = await api("/panel/api/test", { method: "POST" });
    if (!r.ok) { out.innerHTML = '<div style="color:var(--bad)">خطا</div>'; return; }
    var html = "";
    (r.j.results || []).forEach(function (x) {
      var u = x.you
        ? '<span class="badge ok">✓ تو عضو هستی</span>'
        : '<span class="badge off">✗ تو عضو نیستی (' + (x.youStatus || "error") + ')</span>';
      var b = x.botAdmin
        ? '<span class="badge ok">ربات ادمین ✓</span>'
        : '<span class="badge off">ربات ادمین نیست (' + (x.botStatus || "error") + ')</span>';
      html += '<div class="testrow" style="flex-direction:column;align-items:flex-start;gap:8px"><div>' + x.chat + '</div><div style="display:flex;gap:8px;flex-wrap:wrap">' + u + b + '</div></div>';
    });
    out.innerHTML = html || '<div style="color:var(--muted);font-size:12.5px">کانالی تنظیم نشده</div>';
  };

  load();
})();
</script>
</body>
</html>`;

/* ---------------- helpers ---------------- */

function json(resp: unknown, status = 200): Response {
  return new Response(JSON.stringify(resp), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });

async function readJson(req: Request): Promise<Record<string, any>> {
  try {
    return (await req.json()) as Record<string, any>;
  } catch {
    return {};
  }
}

const SESSION_KEY = "panel:sess:";
const CODE_KEY = "panel:code:";
const CD_KEY = "panel:cd:";

function randomCode(): string {
  const b = new Uint8Array(4);
  crypto.getRandomValues(b);
  const n = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
  return String(100000 + (n % 900000));
}

async function panelOwner(env: Env, req: Request): Promise<number | null> {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)npanel=([a-f0-9-]+)/);
  if (!m) return null;
  const raw = await env.BOT_KV.get(SESSION_KEY + m[1]);
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isNaN(id) ? null : id;
}

async function countUsers(env: Env): Promise<number> {
  let n = 0;
  let cursor: string | undefined;
  do {
    const list = await env.BOT_KV.list({ prefix: "u:", cursor, limit: 1000 });
    n += list.keys.length;
    cursor = (list as any).list_complete ? undefined : (list as any).cursor;
  } while (cursor);
  return n;
}

/* ---------------- main handler ---------------- */
export async function handlePanel(env: Env, req: Request, url: URL): Promise<Response> {
  const path = url.pathname;

  if (path === "/panel" || path === "/panel/") {
    await fj.setOrigin(env, url.origin);
    return html(PANEL_HTML);
  }

  const api = path.replace("/panel/api/", "");

  if (path === "/panel/api/request" && req.method === "POST") {
    const b = await readJson(req);
    const id = Number(b.id);
    const owner = await fj.ownerId(env);
    if (!Number.isInteger(id) || id !== owner) {
      return json({ ok: false, error: "فقط مالک ربات می‌تواند وارد شود" }, 403);
    }
    // 30s cooldown to avoid spamming the owner
    const cd = await env.BOT_KV.get(CD_KEY + id);
    if (cd && Date.now() - parseInt(cd, 10) < 30_000) {
      return json({ ok: false, error: "لطفاً چند لحظه صبر کن (کد قبلی هنوز معتبر است)" }, 429);
    }
    const code = randomCode();
    await env.BOT_KV.put(CODE_KEY + id, code, { expirationTtl: 300 });
    await env.BOT_KV.put(CD_KEY + id, String(Date.now()), { expirationTtl: 60 });
    try {
      const r: any = await tg.sendMessage(env, id, `🔐 <b>کد ورود پنل مدیریت</b>\n\n<code>${code}</code>\n\nاین کد تا <b>۵ دقیقه</b> معتبر است. آن را برای کسی نفرست.`);
      if (!r?.ok) throw new Error(r?.description || "sendMessage failed");
    } catch (e) {
      await env.BOT_KV.delete(CODE_KEY + id).catch(() => {});
      return json({ ok: false, error: "کد ساخته شد ولی ارسال به تلگرام ناموفق بود — دوباره تلاش کن" }, 502);
    }
    return json({ ok: true, sent: true });
  }

  if (path === "/panel/api/verify" && req.method === "POST") {
    const b = await readJson(req);
    const id = Number(b.id);
    const owner = await fj.ownerId(env);
    if (!Number.isInteger(id) || id !== owner) return json({ ok: false, error: "نامعتبر" }, 403);
    const code = (await env.BOT_KV.get(CODE_KEY + id)) || "";
    if (!code || String(b.code || "").trim() !== code) {
      return json({ ok: false, error: "کد اشتباه یا منقضی شده — دوباره درخواست بده" }, 401);
    }
    await env.BOT_KV.delete(CODE_KEY + id);
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    await env.BOT_KV.put(SESSION_KEY + token, String(id), { expirationTtl: 86400 });
    const res = json({ ok: true });
    res.headers.set("set-cookie", `npanel=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`);
    return res;
  }

  if (path === "/panel/api/logout" && req.method === "POST") {
    const cookie = req.headers.get("cookie") || "";
    const m = cookie.match(/(?:^|;\s*)npanel=([a-f0-9-]+)/);
    if (m) await env.BOT_KV.delete(SESSION_KEY + m[1]);
    const res = json({ ok: true });
    res.headers.set("set-cookie", "npanel=; HttpOnly; Path=/; Max-Age=0");
    return res;
  }

  /* ---- everything below requires a valid session ---- */
  const owner = await panelOwner(env, req);
  if (owner === null) return json({ error: "unauthorized" }, 401);

  if (path === "/panel/api/state" && req.method === "GET") {
    const meta = await fj.botMeta(env);
    const cfg = await fj.getConfig(env);
    return json({
      ok: true,
      bot: {
        username: meta.username,
        origin: meta.origin,
        ownerId: owner,
        adminLink: fj.adminDeepLink(meta.username),
      },
      fj: cfg,
      stats: { users: await countUsers(env) },
    });
  }

  if (path === "/panel/api/fj" && req.method === "POST") {
    const b = await readJson(req);
    const cfg = await fj.getConfig(env);
    const patch: Partial<fj.FjConfig> = {};

    if (typeof b.enabled === "boolean") patch.enabled = b.enabled;
    if (typeof b.mode === "string") patch.mode = b.mode === "all" ? "all" : "any";
    if (b.recheckHours !== undefined) patch.recheckHours = Number(b.recheckHours);
    if (typeof b.message === "string") patch.message = b.message;
    if (typeof b.buttonText === "string") patch.buttonText = b.buttonText;
    if (Array.isArray(b.exempt)) patch.exempt = b.exempt;

    // add/remove a single chat (validated against Telegram so we never store junk)
    if (typeof b.addChat === "string") {
      const ch = fj.normalizeChat(b.addChat);
      if (!ch) return json({ ok: false, error: "فرمت کانال نامعتبر است" }, 400);
      const test = await fj.checkBotAdmin(env, ch);
      if (!test.ok) {
        return json({
          ok: false,
          error: test.status === "error"
            ? `بات نمی‌تواند «${ch}» را ببیند — آیدی/لینک را چک کن`
            : `بات در «${ch}» ادمین نیست (وضعیت: ${test.status}). اول با دکمهٔ «ادمین کردن ربات» در منوی بات یا پنل، بات را ادمین کن`,
        }, 400);
      }
      patch.chats = Array.from(new Set([...cfg.chats, ch]));
    }
    if (typeof b.removeChat === "string") {
      patch.chats = cfg.chats.filter((c) => c !== b.removeChat);
    }

    const saved = await fj.saveConfig(env, patch);
    return json({ ok: true, state: { fj: saved } });
  }

  if (path === "/panel/api/test" && req.method === "POST") {
    const cfg = await fj.getConfig(env);
    const results = [];
    for (const ch of cfg.chats) {
      const [me, bot] = await Promise.all([
        fj.checkChat(env, owner, ch),
        fj.checkBotAdmin(env, ch),
      ]);
      results.push({ chat: ch, you: me.ok, youStatus: me.status, botAdmin: bot.ok, botStatus: bot.status });
    }
    return json({ ok: true, results });
  }

  return json({ error: "not found" }, 404);
}
