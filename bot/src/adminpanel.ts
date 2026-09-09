// Nika Net Launcher — web admin panel (served at /panel).
//
// Auth flow: the owner enters their numeric Telegram ID → the bot sends a
// one-time 6-digit code to that chat → the owner enters the code → a signed
// HttpOnly session cookie is issued. The panel manages the bot's forced-join
// (عضویت اجباری) feature, shows the "make bot admin in channel" deep link,
// lists real users and broadcasts announcements.

import { Env } from "./types";
import * as tg from "./telegram";
import * as st from "./state";
import * as fj from "./forcedjoin";

const PANEL_HTML = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Nika Net — پنل مدیریت بات</title>
<style>
  :root{
    --bg:#070b14; --card:rgba(16,23,40,.72); --card2:rgba(28,37,62,.5); --border:#232f4d;
    --text:#e9eef9; --muted:#8fa0c0; --accent:#7dd3fc; --accent2:#34d399;
    --grad:linear-gradient(135deg,#4f46e5,#0ea5e9); --grad2:linear-gradient(135deg,#6366f1,#22d3ee 55%,#34d399);
    --ok:#34d399; --warn:#fbbf24; --bad:#fb7185;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:"Vazirmatn","Segoe UI",Tahoma,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
  body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
    background:radial-gradient(900px 520px at 86% -12%, rgba(99,102,241,.24), transparent 62%),
               radial-gradient(820px 640px at -8% 112%, rgba(34,211,238,.16), transparent 60%)}
  .wrap{max-width:920px;margin:0 auto;padding:26px 16px 70px;position:relative;z-index:1}
  .top{display:flex;align-items:center;gap:14px;margin-bottom:20px}
  .logo{width:52px;height:52px;border-radius:50%;background:var(--grad);display:grid;place-items:center;font-size:24px;box-shadow:0 8px 26px -12px rgba(34,211,238,.5)}
  h1{font-size:19px;font-weight:700;background:var(--grad2);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .sub{color:var(--muted);font-size:12px;font-family:ui-monospace,monospace}
  .card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:22px;margin-bottom:16px;backdrop-filter:blur(12px);box-shadow:0 22px 60px -32px rgba(0,0,0,.85)}
  .card h2{font-size:15px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:8px}
  .card h2 .mini{font-size:10.5px;color:var(--muted);font-family:ui-monospace,monospace;font-weight:500;text-align:left}
  label{display:block;font-size:12px;color:var(--muted);margin:14px 0 7px;font-weight:600}
  input,select,textarea{width:100%;background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;font-size:14px;color:var(--text);font-family:inherit;outline:none}
  input:focus,select:focus,textarea:focus{border-color:var(--accent);box-shadow:0 0 0 4px rgba(34,211,238,.14)}
  textarea{resize:vertical;min-height:86px;line-height:1.9}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:700;border:none;cursor:pointer;transition:.18s;color:#fff}
  .btn:active{transform:translateY(1px)}
  .btn-p{background:var(--grad);box-shadow:0 8px 26px -12px rgba(34,211,238,.5);width:100%}
  .btn-s{background:linear-gradient(135deg,#059669,#10b981)}
  .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted)}
  .btn-ghost:hover{background:var(--card2);color:var(--text)}
  .btn-danger{background:rgba(251,113,133,.13);color:var(--bad);border:1px solid rgba(251,113,133,.3)}
  .btn-sm{padding:7px 12px;font-size:12.5px;border-radius:10px}
  .row{display:flex;gap:10px}
  .row .btn{flex:1}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}
  .stat{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px;position:relative;overflow:hidden;cursor:default}
  .stat::after{content:"";position:absolute;top:0;right:0;left:0;height:2px;background:var(--grad2);opacity:.55}
  .stat .v{font-size:24px;font-weight:700;font-family:ui-monospace,monospace;background:var(--grad2);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .stat .l{color:var(--muted);font-size:12px;margin-top:3px}
  .toggle{position:relative;width:52px;height:28px;background:var(--border);border-radius:99px;cursor:pointer;transition:.25s;border:1px solid var(--muted);flex:none}
  .toggle::after{content:"";position:absolute;top:2px;right:2px;width:22px;height:22px;border-radius:99px;background:var(--muted);transition:.25s}
  .toggle.on{background:var(--grad);border-color:transparent}
  .toggle.on::after{transform:translateX(-24px);background:#fff}
  .badge{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;font-family:ui-monospace,monospace;white-space:nowrap}
  .badge.ok{background:rgba(52,211,153,.13);color:var(--ok)}
  .badge.off{background:rgba(251,113,133,.13);color:var(--bad)}
  .badge.warn{background:rgba(251,191,36,.13);color:var(--warn)}
  .badge.info{background:rgba(125,211,252,.13);color:var(--accent)}
  .badge.mute{background:rgba(143,160,192,.12);color:var(--muted)}
  .chips{display:flex;flex-direction:column;gap:8px}
  .chip{display:flex;align-items:center;justify-content:space-between;background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:10px 14px;font-size:13.5px;gap:10px}
  .chip .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .chip .t b{font-weight:700}
  .chip .t .raw{font-family:ui-monospace,monospace;color:var(--muted);font-size:11.5px}
  .chip .x{cursor:pointer;color:var(--bad);background:none;border:none;font-size:15px;padding:2px 6px}
  .chip a{color:var(--accent);text-decoration:none;font-size:12px;font-family:ui-monospace,monospace}
  .addrow{display:flex;gap:8px;margin-top:10px}
  .addrow input{flex:1}
  .hint{background:rgba(99,102,241,.12);border:1px solid var(--border);border-radius:12px;padding:11px 13px;font-size:12px;color:var(--muted);line-height:1.9;margin-top:12px}
  .hint b{color:var(--warn)}
  code{font-family:ui-monospace,monospace;background:var(--card2);padding:1px 7px;border-radius:7px;font-size:12.5px;color:var(--accent)}
  a.link{display:inline-flex;align-items:center;gap:8px;color:#fff;text-decoration:none;background:var(--grad);border-radius:12px;padding:12px 18px;font-size:14px;font-weight:700}
  ol{margin:12px 20px 0;color:var(--muted);font-size:13px;line-height:2}
  .toast{position:fixed;bottom:22px;right:50%;transform:translateX(50%);background:#0e1424;border:1px solid var(--border);border-right:3px solid var(--accent2);padding:12px 22px;border-radius:14px;font-size:13px;font-weight:600;box-shadow:0 22px 60px -32px rgba(0,0,0,.9);opacity:0;transition:.3s;pointer-events:none;z-index:99;max-width:92vw}
  .toast.show{opacity:1}
  .hidden{display:none!important}
  .field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .field-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
  @media(max-width:640px){.field-grid,.field-grid3{grid-template-columns:1fr}}
  .testrow{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;background:var(--card2);border:1px solid var(--border);margin-top:8px;font-size:13px;font-family:ui-monospace,monospace;flex-wrap:wrap}
  .utable{width:100%;border-collapse:collapse;font-size:13px}
  .utable th{color:var(--muted);font-weight:600;text-align:right;padding:8px 10px;border-bottom:1px solid var(--border);font-size:11.5px}
  .utable td{padding:9px 10px;border-bottom:1px solid rgba(35,47,77,.5);vertical-align:middle}
  .utable tr:hover td{background:rgba(28,37,62,.4)}
  .usr{display:flex;align-items:center;gap:10px}
  .avatar{width:38px;height:38px;border-radius:50%;background:var(--grad);display:grid;place-items:center;font-size:15px;font-weight:700;color:#fff;flex:none;overflow:hidden;position:relative}
  .avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0}
  .uname{font-weight:700}
  .umeta{color:var(--muted);font-size:11.5px;font-family:ui-monospace,monospace}
  .search{position:relative}
  .search input{padding-left:38px}
  .search::before{content:"🔍";position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:13px;opacity:.6}
  .chart{width:100%;height:150px;margin-top:8px}
  .legend{display:flex;gap:16px;font-size:12px;color:var(--muted);margin-top:6px}
  .legend .dot{width:9px;height:9px;border-radius:3px;display:inline-block;margin-left:5px;vertical-align:middle}
  .log{font-family:ui-monospace,monospace;font-size:12px;line-height:2;color:var(--muted)}
  .log .ev{display:inline-block;min-width:78px}
  .tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
  .tab{padding:8px 16px;border-radius:99px;font-size:13px;font-weight:700;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer}
  .tab.on{background:var(--grad);color:#fff;border-color:transparent}
  .empty{color:var(--muted);text-align:center;padding:26px 0;font-size:13px}
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
      <button class="btn btn-danger btn-sm" id="logout">خروج</button>
    </div>

    <div class="grid">
      <div class="stat"><div class="v" id="stUsers">0</div><div class="l">کاربر ربات</div></div>
      <div class="stat"><div class="v" id="stBlocked">0</div><div class="l">مسدود (غیرعضو)</div></div>
      <div class="stat"><div class="v" id="stVerified">0</div><div class="l">تأیید عضویت</div></div>
      <div class="stat"><div class="v" id="stChats">0</div><div class="l">کانال هدف</div></div>
      <div class="stat"><div class="v" id="stFj">—</div><div class="l">عضویت اجباری</div></div>
    </div>

    <!-- Forced join -->
    <div class="card">
      <h2>🔒 عضویت اجباری <span class="mini">کاربر باید عضو کانال باشد تا از ربات استفاده کند</span></h2>

      <div style="display:flex;align-items:center;justify-content:space-between">
        <div><b>فعال‌سازی عضویت اجباری</b><div style="color:var(--muted);font-size:12px;margin-top:3px">وقتی روشن باشد، هر پیام کاربر غیرعضو با پیام «عضو شو» پاسخ داده می‌شود</div></div>
        <div class="toggle" id="fjEnabled"></div>
      </div>

      <label>کانال‌ها / گروه‌های هدف <span class="mini" style="font-size:10px">(username یا آیدی عددی یا لینک t.me)</span></label>
      <div class="chips" id="fjChats"></div>
      <div class="addrow">
        <input id="fjAdd" placeholder="@myChannel یا -1001234567890 یا t.me/myChannel" dir="ltr" />
        <button class="btn btn-p" style="width:auto" id="fjAddBtn">➕ افزودن</button>
      </div>
      <div class="hint">⚡ <b>اتوماتیک:</b> وقتی ربات را در یک کانال «ادمین» کنی (با دکمهٔ پایین یا از منوی ربات)، همان کانال <b>خودکار</b> اضافه و عضویت اجباری فعال می‌شود. با حذف ادمینی، خودکار حذف می‌شود.</div>

      <div class="field-grid3">
        <div><label>شرط عضویت</label>
          <select id="fjMode">
            <option value="any">حداقل یکی (ANY)</option>
            <option value="all">همه (ALL)</option>
          </select>
        </div>
        <div><label>بازهٔ بررسی مجدد</label>
          <select id="fjRecheck">
            <option value="0">هر بار (بدون کش)</option>
            <option value="1">هر ۱ ساعت</option>
            <option value="6">هر ۶ ساعت</option>
            <option value="24">هر ۲۴ ساعت</option>
          </select>
        </div>
        <div><label>مشمولان</label>
          <select id="fjApply">
            <option value="all">همهٔ کاربران</option>
            <option value="new">فقط کاربران جدید</option>
          </select>
        </div>
      </div>

      <label>متن پیام «عضو شو» <span class="mini">می‌توانی از {name} استفاده کنی</span></label>
      <textarea id="fjMsg"></textarea>

      <label>متن دکمهٔ تأیید عضویت</label>
      <input id="fjBtn" dir="rtl" placeholder="✅ عضویت انجام شد — بررسی کن" />

      <label>پیام خوش‌آمد بعد از تأیید <span class="mini">(خالی = پیش‌فرض)</span></label>
      <input id="fjWelcome" dir="rtl" placeholder="✅ عضویتت تأیید شد — خوش آمدی!" />

      <div class="field-grid">
        <div><label>آیدی‌های معاف از عضویت (هر خط یکی)</label>
          <textarea id="fjExempt" dir="ltr" placeholder="123456789"></textarea>
        </div>
        <div><label>فاصلهٔ ارسال پیام «عضو شو» (ضد اسپم)</label>
          <select id="fjCool">
            <option value="0">هر پیام</option>
            <option value="1">هر ۱ دقیقه</option>
            <option value="2">هر ۲ دقیقه</option>
            <option value="5">هر ۵ دقیقه</option>
            <option value="10">هر ۱۰ دقیقه</option>
          </select>
          <div class="hint" style="margin-top:10px">اگر یک کاربر غیرعضو پیام بفرستد، فقط هر چند دقیقه یک‌بار پیام «عضو شو» می‌گیرد تا اسپم نشود.</div>
        </div>
      </div>

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
        <li>کانال به‌صورت <b>خودکار</b> به عضویت اجباری اضافه می‌شود.</li>
      </ol>
      <div class="hint">⚠️ بدون ادمین بودن ربات، بررسی عضویت (<code>getChatMember</code>) خطا می‌دهد و عضویت اجباری کار نمی‌کند.</div>
    </div>

    <!-- Analytics -->
    <div class="card">
      <h2>📈 آمار عضویت <span class="mini">دادهٔ واقعی ۷ روز اخیر</span></h2>
      <svg class="chart" id="chart" viewBox="0 0 600 150" preserveAspectRatio="none"></svg>
      <div class="legend"><span><span class="dot" style="background:var(--bad)"></span>مسدودشده (غیرعضو)</span><span><span class="dot" style="background:var(--ok)"></span>تأیید عضویت</span></div>
      <label>رویدادهای اخیر</label>
      <div class="log" id="fjLog">—</div>
    </div>

    <!-- Users -->
    <div class="card">
      <h2>👥 کاربران <span class="mini" id="stUsers2">0 نفر</span></h2>
      <div class="search" style="margin-bottom:12px"><input id="usrSearch" placeholder="جستجو: نام، آیدی یا یوزرنیم…" /></div>
      <div style="max-height:420px;overflow:auto">
        <table class="utable">
          <thead><tr><th>کاربر</th><th>آیدی</th><th>وضعیت</th><th>آخرین بازدید</th><th></th></tr></thead>
          <tbody id="usrBody"></tbody>
        </table>
      </div>
      <div class="empty hidden" id="usrEmpty">کاربری یافت نشد</div>
    </div>

    <!-- Broadcast -->
    <div class="card">
      <h2>📣 پیام همگانی <span class="mini">برای همهٔ کاربران ربات</span></h2>
      <textarea id="bcText" placeholder="متن پیام (با HTML تلگرام: <b>ضخیم</b>، <code>کد</code>…)"></textarea>
      <div class="row" style="margin-top:12px">
        <button class="btn btn-p" id="bcSend">🚀 ارسال به همه</button>
      </div>
      <div class="hint" id="bcOut" style="display:none"></div>
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
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }
  async function api(path, opts) {
    var init = { method: (opts && opts.method) || "GET", headers: {} };
    if (opts && opts.body !== undefined) { init.headers["content-type"] = "application/json"; init.body = JSON.stringify(opts.body); }
    var r = await fetch(path, init);
    var j = {}; try { j = await r.json(); } catch (e) {}
    return { status: r.status, ok: r.ok, j: j };
  }
  function faNum(n) { return (n || 0).toLocaleString("fa-IR"); }
  function fmtTime(ts) {
    if (!ts) return "—";
    var d = new Date(ts);
    return d.toLocaleDateString("fa-IR", { month: "long", day: "numeric" }) + " " + d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
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

  /* ---------- state ---------- */
  var state = null, users = [], stats = null;

  async function load() {
    var r = await api("/panel/api/state");
    // KV sessions can lag a heartbeat — retry once before showing the login
    if (!r.ok && r.status === 401) {
      await new Promise(function (res) { setTimeout(res, 700); });
      r = await api("/panel/api/state");
    }
    if (!r.ok) { $("#loginView").classList.remove("hidden"); $("#appView").classList.add("hidden"); return; }
    state = r.j;
    $("#loginView").classList.add("hidden");
    $("#appView").classList.remove("hidden");
    render();
    await Promise.all([loadStats(), loadUsers()]);
  }

  function render() {
    var f = state.fj;
    $("#botName").textContent = "@" + state.bot.username;
    $("#stUsers").textContent = faNum(state.stats.users);
    $("#stChats").textContent = faNum(f.chats.length);
    $("#stFj").textContent = f.enabled ? "روشن" : "خاموش";
    $("#stFj").style.color = f.enabled ? "var(--ok)" : "var(--bad)";

    $("#fjEnabled").classList.toggle("on", !!f.enabled);
    $("#fjMode").value = f.mode === "all" ? "all" : "any";
    $("#fjRecheck").value = String(f.recheckHours);
    $("#fjApply").value = f.applyTo === "new" ? "new" : "all";
    $("#fjMsg").value = f.message;
    $("#fjBtn").value = f.buttonText;
    $("#fjWelcome").value = f.verifyMessage || "";
    $("#fjExempt").value = (f.exempt || []).join("\\n");
    $("#fjCool").value = String(f.promptCooldownMin === undefined ? 2 : f.promptCooldownMin);

    var chips = $("#fjChats");
    chips.innerHTML = "";
    (f.chats || []).forEach(function (c) {
      var meta = (f.chatMeta && f.chatMeta[c]) || {};
      var title = meta.title || c;
      var d = document.createElement("div"); d.className = "chip";
      var t = document.createElement("div"); t.className = "t";
      t.innerHTML = "<b>" + title + "</b><div class=\\"raw\\">" + c + "</div>";
      var x = document.createElement("button"); x.className = "x"; x.textContent = "✕";
      x.onclick = function () { removeChat(c); };
      d.appendChild(t);
      if (meta.username) {
        var a = document.createElement("a"); a.href = "https://t.me/" + meta.username; a.target = "_blank"; a.rel = "noopener"; a.textContent = "🔗";
        d.appendChild(a);
      }
      d.appendChild(x); chips.appendChild(d);
    });
    if (!(f.chats || []).length) chips.innerHTML = '<div style="color:var(--muted);font-size:12.5px">هنوز کانالی اضافه نشده</div>';

    $("#ownerId").textContent = state.bot.ownerId;
    $("#panelUrl").textContent = state.bot.origin + "/panel";
    $("#botUname").textContent = "@" + state.bot.username;
    $("#adminLink").href = state.bot.adminLink;
  }

  /* ---------- stats + chart ---------- */
  async function loadStats() {
    var r = await api("/panel/api/stats");
    if (!r.ok) return;
    stats = r.j;
    $("#stBlocked").textContent = faNum(stats.blocked);
    $("#stVerified").textContent = faNum(stats.verified);
    drawChart(stats.days || []);
    var log = stats.log || [];
    var html = "";
    log.forEach(function (e) {
      var icon = e.ev === "blocked" ? "🚫" : e.ev === "verified" ? "✅" : e.ev === "chat_added" ? "➕" : e.ev === "chat_removed" ? "➖" : e.ev === "exempted" ? "🛡" : e.ev === "unexempted" ? "🔓" : "•";
      var lbl = e.ev === "blocked" ? "مسدود" : e.ev === "verified" ? "تأیید" : e.ev === "chat_added" ? "افزودن کانال" : e.ev === "chat_removed" ? "حذف کانال" : e.ev === "exempted" ? "معاف شد" : e.ev === "unexempted" ? "حذف معافیت" : e.ev;
      var extra = e.extra ? " (" + e.extra + ")" : (e.chat ? " (" + e.chat + ")" : "");
      html += '<div><span class="ev">' + icon + " " + lbl + '</span><span style="opacity:.7">' + fmtTime(e.t) + '</span> ' + extra + "</div>";
    });
    $("#fjLog").innerHTML = html || "هنوز رویدادی ثبت نشده";
  }

  function drawChart(days) {
    var svg = $("#chart");
    var W = 600, H = 150, pad = 6;
    var max = 1;
    days.forEach(function (d) { max = Math.max(max, d.blocked, d.verified); });
    var n = days.length, bw = (W - pad * 2) / n;
    var bars = "";
    days.forEach(function (d, i) {
      var x = pad + i * bw + bw * 0.15;
      var w = bw * 0.7, gap = 2;
      var wb = (w - gap) / 2;
      var hb = Math.max(d.blocked > 0 ? 3 : 0, (d.blocked / max) * (H - 34));
      var hv = Math.max(d.verified > 0 ? 3 : 0, (d.verified / max) * (H - 34));
      bars += '<rect x="' + x.toFixed(1) + '" y="' + (H - 20 - hb).toFixed(1) + '" width="' + wb.toFixed(1) + '" height="' + hb.toFixed(1) + '" rx="3" fill="rgba(251,113,133,.85)"/>';
      bars += '<rect x="' + (x + wb + gap).toFixed(1) + '" y="' + (H - 20 - hv).toFixed(1) + '" width="' + wb.toFixed(1) + '" height="' + hv.toFixed(1) + '" rx="3" fill="rgba(52,211,153,.85)"/>';
      bars += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 6) + '" font-size="10" fill="#8fa0c0" text-anchor="middle">' + d.label.slice(0, 5) + "</text>";
    });
    svg.innerHTML = '<line x1="0" y1="' + (H - 20) + '" x2="600" y2="' + (H - 20) + '" stroke="#232f4d" stroke-width="1"/>' + bars;
  }

  /* ---------- users ---------- */
  async function loadUsers() {
    var r = await api("/panel/api/users");
    if (!r.ok) return;
    users = r.j.users || [];
    $("#stUsers2").textContent = faNum(users.length) + " نفر";
    renderUsers();
  }

  function statusBadge(u) {
    if (u.owner) return '<span class="badge info">👑 مالک</span>';
    if (u.exempt) return '<span class="badge warn">🛡 معاف</span>';
    if (!u.fjEnabled) return '<span class="badge mute">آزاد</span>';
    if (u.joined) return '<span class="badge ok">✓ عضو</span>';
    return '<span class="badge off">⛔ مسدود</span>';
  }

  function copyId(id) {
    var ta = document.createElement("textarea");
    ta.value = String(id);
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); toast("آیدی کپی شد ✓"); } catch (e) { toast("کپی نشد"); }
    ta.remove();
  }

  function renderUsers() {
    var q = ($("#usrSearch").value || "").trim().toLowerCase();
    var list = users.filter(function (u) {
      if (!q) return true;
      return (String(u.id).indexOf(q) >= 0) ||
             ((u.name || "").toLowerCase().indexOf(q) >= 0) ||
             ((u.lastName || "").toLowerCase().indexOf(q) >= 0) ||
             ((u.username || "").toLowerCase().indexOf(q) >= 0);
    });
    var body = $("#usrBody");
    body.innerHTML = "";
    $("#usrEmpty").classList.toggle("hidden", list.length > 0);
    list.forEach(function (u) {
      var tr = document.createElement("tr");
      var full = ((u.name || "") + " " + (u.lastName || "")).trim();
      var initial = (full || "؟").charAt(0);

      // cell 1: avatar (photo or initial) + full name + @username
      var td1 = document.createElement("td");
      var usr = document.createElement("div"); usr.className = "usr";
      var av = document.createElement("div"); av.className = "avatar"; av.textContent = initial;
      if (u.photo) {
        var img = document.createElement("img");
        img.src = "/panel/api/photo/" + u.id;
        img.alt = "";
        img.onload = function () { av.textContent = ""; av.appendChild(img); };
        img.onerror = function () {
          if (!img.getAttribute("data-r")) {
            img.setAttribute("data-r", "1");
            setTimeout(function () { img.src = "/panel/api/photo/" + u.id + "?r=" + Date.now(); }, 800);
          } else img.remove();
        };
      }
      usr.appendChild(av);
      var nm = document.createElement("div");
      var nmn = document.createElement("div"); nmn.className = "uname"; nmn.textContent = full || "بدون نام";
      nm.appendChild(nmn);
      var um = document.createElement("div"); um.className = "umeta";
      if (u.username) {
        um.textContent = "@" + u.username;
        um.style.cursor = "pointer"; um.title = "باز کردن پروفایل تلگرام";
        um.onclick = function () { window.open("https://t.me/" + u.username, "_blank"); };
      } else um.textContent = "بدون یوزرنیم";
      nm.appendChild(um);
      usr.appendChild(nm);
      td1.appendChild(usr);

      // cell 2: numeric id + copy button
      var td2 = document.createElement("td");
      var idv = document.createElement("div"); idv.className = "umeta"; idv.dir = "ltr"; idv.textContent = u.id;
      var cp = document.createElement("button"); cp.className = "btn btn-ghost btn-sm"; cp.style.marginTop = "4px"; cp.textContent = "📋 کپی";
      cp.onclick = function () { copyId(u.id); };
      td2.appendChild(idv); td2.appendChild(cp);

      // cell 3: status badge
      var td3 = document.createElement("td");
      td3.innerHTML = statusBadge(u);

      // cell 4: last seen
      var td4 = document.createElement("td");
      var ls = document.createElement("div"); ls.className = "umeta"; ls.textContent = fmtTime(u.lastSeen);
      td4.appendChild(ls);

      // cell 5: actions (open profile + exempt)
      var td5 = document.createElement("td");
      var acts = document.createElement("div"); acts.style.display = "flex"; acts.style.gap = "6px"; acts.style.flexWrap = "wrap";
      if (u.username) {
        var link = document.createElement("button"); link.className = "btn btn-ghost btn-sm"; link.textContent = "🔗";
        link.title = "پروفایل تلگرام";
        link.onclick = function () { window.open("https://t.me/" + u.username, "_blank"); };
        acts.appendChild(link);
      }
      if (!u.owner) {
        var b = document.createElement("button");
        b.className = "btn btn-ghost btn-sm";
        b.textContent = u.exempt ? "لغو معافیت" : "معاف کن";
        b.onclick = function () { toggleExempt(u); };
        acts.appendChild(b);
      }
      td5.appendChild(acts);

      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4); tr.appendChild(td5);
      body.appendChild(tr);
    });
  }
  $("#usrSearch").addEventListener("input", renderUsers);

  async function toggleExempt(u) {
    var r = await api("/panel/api/exempt", { method: "POST", body: { id: u.id, exempt: !u.exempt } });
    if (r.ok) { state = r.j.state; await loadUsers(); render(); toast(u.exempt ? "از معافیت خارج شد" : "معاف شد ✓"); }
    else toast(r.j.error || "خطا");
  }

  /* ---------- forced join actions ---------- */
  $("#fjAddBtn").onclick = async function () {
    var v = $("#fjAdd").value.trim();
    if (!v) return;
    var r = await api("/panel/api/fj", { method: "POST", body: { addChat: v } });
    if (r.ok) { state = r.j.state; $("#fjAdd").value = ""; render(); await loadStats(); toast("کانال اضافه شد ✓"); }
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
        applyTo: $("#fjApply").value,
        message: $("#fjMsg").value,
        buttonText: $("#fjBtn").value,
        verifyMessage: $("#fjWelcome").value,
        promptCooldownMin: Number($("#fjCool").value),
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

  /* ---------- broadcast ---------- */
  $("#bcSend").onclick = async function () {
    var text = $("#bcText").value.trim();
    if (!text) { toast("متن پیام را بنویس"); return; }
    $("#bcSend").disabled = true; $("#bcSend").textContent = "در حال ارسال…";
    var r = await api("/panel/api/broadcast", { method: "POST", body: { text: text } });
    $("#bcSend").disabled = false; $("#bcSend").textContent = "🚀 ارسال به همه";
    if (r.ok) {
      var o = $("#bcOut"); o.style.display = "block";
      o.innerHTML = "✅ پیام به <b>" + faNum(r.j.sent) + "</b> از " + faNum(r.j.total) + " کاربر ارسال شد.";
      toast("پیام همگانی ارسال شد ✓");
    } else { var o2 = $("#bcOut"); o2.style.display = "block"; o2.innerHTML = "<b>⛔ " + (r.j.error || "خطا") + "</b>"; }
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

/* ---------------- profile enrichment ---------------- */

// Build one user row for the panel: full profile (name, username, photo)
// cached in KV and refreshed from Telegram at most once a day.
async function userRow(env: Env, id: number, owner: number, cfg: fj.FjConfig): Promise<Record<string, any>> {
  let meta = await st.getMeta(env, id);
  const now = Date.now();
  const staleName = !meta.nameAt || now - meta.nameAt > 24 * 3600_000 || !meta.firstName;
  if (staleName) {
    try {
      const r: any = await tg.getChat(env, id);
      const res = r?.result;
      if (res && res.type === "private") {
        meta.firstName = res.first_name || meta.firstName || "";
        meta.lastName = res.last_name || meta.lastName || "";
        meta.username = res.username || meta.username || "";
        if (res.photo?.small_file_id) meta.photoFileId = res.photo.small_file_id;
        else if (res.photo?.big_file_id && !meta.photoFileId) meta.photoFileId = res.photo.big_file_id;
        meta.nameAt = now;
        await st.saveMeta(env, id, meta);
      }
    } catch { /* keep cached meta */ }
  }
  const joined = await fj.isCachedJoined(env, id, cfg);
  return {
    id,
    name: meta.firstName || "",
    lastName: meta.lastName || "",
    username: meta.username || "",
    photo: !!meta.photoFileId,
    lastSeen: meta.at || 0,
    owner: id === owner,
    exempt: cfg.exempt.includes(id),
    fjEnabled: cfg.enabled && cfg.chats.length > 0,
    joined,
  };
}

// Stream a user's Telegram profile photo to the browser WITHOUT leaking the
// bot token (the worker resolves file_id → file_path and fetches server-side).
async function photoResponse(env: Env, uid: number): Promise<Response> {
  const meta = await st.getMeta(env, uid);
  let fileId = meta.photoFileId || "";
  if (!fileId) {
    try {
      const r: any = await tg.getUserProfilePhotos(env, uid, 1);
      const photos: any[][] = r?.result?.photos;
      if (photos && photos.length && photos[0].length) {
        fileId = photos[0][0]?.file_id || photos[0][photos[0].length - 1]?.file_id || "";
      }
    } catch { /* ignore */ }
    if (fileId) {
      meta.photoFileId = fileId;
      await st.saveMeta(env, uid, meta);
    }
  }
  if (!fileId) return new Response("", { status: 404 });
  try {
    const g: any = await tg.getFile(env, fileId);
    const fp: string | undefined = g?.result?.file_path;
    if (!fp) return new Response("", { status: 404 });
    const img = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_TOKEN}/${fp}`);
    if (!img.ok || !img.body) return new Response("", { status: 404 });
    const ct = img.headers.get("content-type") || "image/jpeg";
    return new Response(img.body, {
      headers: {
        "content-type": ct,
        "cache-control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("", { status: 404 });
  }
}

/* ---------------- main handler ---------------- */
export async function handlePanel(env: Env, req: Request, url: URL): Promise<Response> {
  const path = url.pathname;

  if (path === "/panel" || path === "/panel/") {
    await fj.setOrigin(env, url.origin);
    return html(PANEL_HTML);
  }

  if (path === "/panel/api/request" && req.method === "POST") {
    const b = await readJson(req);
    const id = Number(b.id);
    const owner = await fj.ownerId(env);
    if (!Number.isInteger(id) || id !== owner) {
      return json({ ok: false, error: "فقط مالک ربات می‌تواند وارد شود" }, 403);
    }
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
    const cfg = await fj.ensureTitles(env, await fj.getConfig(env));
    const ids = await tg.listUserChatIds(env);
    const s = await fj.stats(env, 1);
    return json({
      ok: true,
      bot: {
        username: meta.username,
        origin: meta.origin,
        ownerId: owner,
        adminLink: fj.adminDeepLink(meta.username),
      },
      fj: cfg,
      stats: { users: ids.length, blocked: s.blocked, verified: s.verified },
    });
  }

  if (path === "/panel/api/stats" && req.method === "GET") {
    return json(await fj.stats(env, 7));
  }

  if (path === "/panel/api/users" && req.method === "GET") {
    const cfg = await fj.getConfig(env);
    const ids = (await tg.listUserChatIds(env)).slice(0, 300);
    const users: Record<string, any>[] = [];
    // chunked concurrency to avoid Telegram burst rate limits
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      const part = await Promise.all(chunk.map((id) => userRow(env, id, owner, cfg)));
      users.push(...part);
    }
    users.sort((a, b) => {
      if (a.owner !== b.owner) return a.owner ? -1 : 1;
      return b.lastSeen - a.lastSeen;
    });
    return json({ ok: true, users });
  }

  if (path.startsWith("/panel/api/photo/") && req.method === "GET") {
    const uid = parseInt(path.replace("/panel/api/photo/", ""), 10);
    if (!Number.isInteger(uid) || uid <= 0) return json({ error: "bad id" }, 400);
    return await photoResponse(env, uid);
  }

  if (path === "/panel/api/exempt" && req.method === "POST") {
    const b = await readJson(req);
    const id = Number(b.id);
    if (!Number.isInteger(id) || id === owner) {
      return json({ ok: false, error: "مالک قابل معاف‌کردن نیست" }, 400);
    }
    const cfg = await fj.getConfig(env);
    const set = new Set(cfg.exempt);
    if (b.exempt) set.add(id);
    else set.delete(id);
    const saved = await fj.saveConfig(env, { exempt: Array.from(set) });
    await fj.recordEvent(env, { ev: b.exempt ? "exempted" : "unexempted", uid: id });
    return json({ ok: true, state: { fj: saved } });
  }

  if (path === "/panel/api/broadcast" && req.method === "POST") {
    const b = await readJson(req);
    const text = String(b.text || "").trim();
    if (!text) return json({ ok: false, error: "متن خالی است" }, 400);
    const ids = await tg.listUserChatIds(env);
    let sent = 0;
    for (const id of ids) {
      try {
        await tg.sendMessage(env, id, text);
        sent++;
      } catch {
        /* skip blocked/unreachable */
      }
    }
    return json({ ok: true, sent, total: ids.length });
  }

  if (path === "/panel/api/fj" && req.method === "POST") {
    const b = await readJson(req);
    const cfg = await fj.getConfig(env);
    const patch: Partial<fj.FjConfig> = {};

    if (typeof b.enabled === "boolean") patch.enabled = b.enabled;
    if (typeof b.mode === "string") patch.mode = b.mode === "all" ? "all" : "any";
    if (b.recheckHours !== undefined) patch.recheckHours = Number(b.recheckHours);
    if (typeof b.applyTo === "string") patch.applyTo = b.applyTo === "new" ? "new" : "all";
    if (typeof b.message === "string") patch.message = b.message;
    if (typeof b.buttonText === "string") patch.buttonText = b.buttonText;
    if (typeof b.verifyMessage === "string") patch.verifyMessage = b.verifyMessage;
    if (b.promptCooldownMin !== undefined) patch.promptCooldownMin = Number(b.promptCooldownMin);
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
            : `بات در «${ch}» ادمین نیست (وضعیت: ${test.status}). اول با دکمهٔ «ادمین کردن ربات» بات را ادمین کن`,
        }, 400);
      }
      patch.chats = Array.from(new Set([...cfg.chats, ch]));
      const meta = await fj.chatTitle(env, ch);
      patch.chatMeta = { ...cfg.chatMeta, [ch]: meta };
      await fj.recordEvent(env, { ev: "chat_added", uid: owner, chat: ch, extra: meta.title });
    }
    if (typeof b.removeChat === "string") {
      patch.chats = cfg.chats.filter((c) => c !== b.removeChat);
      await fj.recordEvent(env, { ev: "chat_removed", uid: owner, chat: b.removeChat });
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
