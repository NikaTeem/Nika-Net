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
    --bg:#05070f;
    --card:rgba(255,255,255,.045);
    --card-solid:#0c1222;
    --border:rgba(148,163,184,.14);
    --border-strong:rgba(148,163,184,.22);
    --text:#eef2fb;
    --muted:#8b99b8;
    --faint:#5d6a8a;
    --cyan:#22d3ee; --violet:#818cf8; --green:#34d399; --rose:#fb7185; --amber:#fbbf24;
    --grad:linear-gradient(135deg,#22d3ee,#818cf8);
    --grad2:linear-gradient(120deg,#6366f1,#22d3ee 55%,#34d399);
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{
    font-family:"Vazirmatn","Vazir",-apple-system,"Segoe UI",Tahoma,"Iranian Sans",sans-serif;
    background:var(--bg); color:var(--text); min-height:100vh; overflow-x:hidden;
    background-image:
      radial-gradient(1200px 700px at 85% -10%, rgba(99,102,241,.16), transparent 60%),
      radial-gradient(1000px 600px at -10% 30%, rgba(34,211,238,.10), transparent 55%),
      radial-gradient(900px 700px at 60% 120%, rgba(244,63,94,.08), transparent 60%);
    background-attachment:fixed;
  }
  /* aurora blobs */
  .blob{position:fixed;border-radius:50%;filter:blur(90px);opacity:.5;z-index:0;pointer-events:none;animation:drift 26s ease-in-out infinite}
  .blob.b1{width:520px;height:520px;background:radial-gradient(circle,#4f46e5,transparent 65%);top:-180px;left:8%}
  .blob.b2{width:460px;height:460px;background:radial-gradient(circle,#0891b2,transparent 65%);bottom:-160px;right:4%;animation-delay:-8s}
  .blob.b3{width:340px;height:340px;background:radial-gradient(circle,#0e7490,transparent 65%);top:40%;right:38%;animation-delay:-16s}
  @keyframes drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-50px) scale(1.12)}}

  /* layout */
  .shell{position:relative;z-index:1;max-width:1080px;margin:0 auto;padding:0 18px 90px}

  /* top bar */
  .topbar{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:14px;
    padding:14px 18px;margin:0 -18px 26px;
    background:rgba(7,10,20,.72);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
    border-bottom:1px solid var(--border)}
  .brand{display:flex;align-items:center;gap:12px;flex:1;min-width:0}
  .logo{width:42px;height:42px;border-radius:13px;background:var(--grad2);display:grid;place-items:center;font-size:20px;
    box-shadow:0 8px 26px -10px rgba(34,211,238,.6), inset 0 0 0 1px rgba(255,255,255,.25)}
  .brand h1{font-size:16.5px;font-weight:800;letter-spacing:.2px;
    background:linear-gradient(90deg,#e0e7ff,#a5f3fc);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .brand .sub{color:var(--muted);font-size:11px;font-family:ui-monospace,monospace;direction:ltr}
  .top-actions{display:flex;align-items:center;gap:10px}
  .clock{font-family:ui-monospace,monospace;font-size:13px;color:var(--muted);
    background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:11px;padding:8px 13px;font-variant-numeric:tabular-nums}
  .live{display:inline-flex;align-items:center;gap:7px;font-size:11.5px;color:var(--green);
    background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.28);border-radius:99px;padding:6px 12px}
  .live .dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 0 rgba(52,211,153,.6);animation:pulse 2s infinite}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(52,211,153,.55)}70%{box-shadow:0 0 0 8px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}

  /* buttons */
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 18px;border-radius:13px;
    font-size:13.5px;font-weight:700;border:none;cursor:pointer;transition:.2s;color:#fff;font-family:inherit;white-space:nowrap}
  .btn:active{transform:translateY(1px) scale(.99)}
  .btn-p{background:var(--grad);box-shadow:0 10px 30px -12px rgba(34,211,238,.55)}
  .btn-p:hover{box-shadow:0 14px 34px -10px rgba(34,211,238,.7);filter:brightness(1.06)}
  .btn-s{background:linear-gradient(135deg,#059669,#10b981);box-shadow:0 10px 26px -14px rgba(16,185,129,.6)}
  .btn-ghost{background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--muted)}
  .btn-ghost:hover{background:rgba(255,255,255,.08);color:var(--text);border-color:var(--border-strong)}
  .btn-danger{background:rgba(251,113,133,.12);color:var(--rose);border:1px solid rgba(251,113,133,.3)}
  .btn-danger:hover{background:rgba(251,113,133,.2)}
  .btn-sm{padding:7px 12px;font-size:12px;border-radius:10px}
  .btn[disabled]{opacity:.5;cursor:default}

  /* cards */
  .card{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:22px;margin-bottom:18px;
    backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
    box-shadow:0 24px 70px -40px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.04);
    animation:rise .55s cubic-bezier(.2,.7,.3,1) both}
  .card h2{font-size:15.5px;font-weight:800;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:8px}
  .card h2 .mini{font-size:10.5px;color:var(--faint);font-family:ui-monospace,monospace;font-weight:500}
  @keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}

  /* hero */
  .hero{position:relative;border-radius:24px;padding:1.5px;margin-bottom:18px;
    background:linear-gradient(130deg,rgba(34,211,238,.5),rgba(129,140,248,.4) 45%,rgba(244,63,94,.3));
    box-shadow:0 30px 80px -40px rgba(99,102,241,.6);animation:rise .55s cubic-bezier(.2,.7,.3,1) both}
  .hero-inner{border-radius:22.5px;padding:26px 28px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;
    background:linear-gradient(160deg,rgba(12,17,32,.96),rgba(9,12,24,.92))}
  .hero h1{font-size:24px;font-weight:900;letter-spacing:.2px}
  .hero h1 .wave{display:inline-block;animation:wave 2.4s ease-in-out infinite;transform-origin:70% 70%}
  @keyframes wave{0%,60%,100%{transform:rotate(0)}10%{transform:rotate(16deg)}20%{transform:rotate(-8deg)}30%{transform:rotate(12deg)}40%{transform:rotate(-4deg)}50%{transform:rotate(8deg)}}
  .hero p{color:var(--muted);font-size:13px;margin-top:7px;line-height:1.9}
  .hero-right{display:flex;align-items:center;gap:18px}
  .hero-switch{text-align:center}
  .hero-switch .lbl{font-size:12px;color:var(--muted);margin-bottom:9px;font-weight:700}

  /* switch */
  .switch{position:relative;width:64px;height:34px;background:rgba(148,163,184,.18);border-radius:99px;cursor:pointer;transition:.3s;border:1px solid var(--border-strong);flex:none;display:inline-block}
  .switch::after{content:"";position:absolute;top:3px;right:3px;width:26px;height:26px;border-radius:99px;background:#cfd6e6;transition:.3s;box-shadow:0 2px 8px rgba(0,0,0,.4)}
  .switch.on{background:var(--grad);border-color:transparent;box-shadow:0 0 26px -4px rgba(34,211,238,.55)}
  .switch.on::after{transform:translateX(-32px);background:#fff}

  /* KPI grid */
  .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:18px}
  @media(max-width:1000px){.kpis{grid-template-columns:repeat(3,1fr)}}
  @media(max-width:640px){.kpis{grid-template-columns:repeat(2,1fr)}}
  .kpi{position:relative;background:var(--card);border:1px solid var(--border);border-radius:18px;padding:18px;
    backdrop-filter:blur(14px);overflow:hidden;transition:.25s;animation:rise .55s cubic-bezier(.2,.7,.3,1) both}
  .kpi:hover{transform:translateY(-4px);border-color:var(--border-strong);box-shadow:0 20px 50px -30px rgba(0,0,0,.9)}
  .kpi::before{content:"";position:absolute;top:0;right:0;left:0;height:2px;background:var(--tk,var(--grad2));opacity:.7}
  .kpi::after{content:"";position:absolute;width:120px;height:120px;border-radius:50%;top:-50px;left:-40px;
    background:radial-gradient(circle,var(--tk,var(--grad2)),transparent 70%);opacity:.12;filter:blur(6px)}
  .kpi .ico{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:18px;margin-bottom:13px;
    background:linear-gradient(140deg,var(--tk,var(--grad2)),transparent 140%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
  .kpi .v{font-size:26px;font-weight:900;font-family:ui-monospace,monospace;letter-spacing:.5px;font-variant-numeric:tabular-nums}
  .kpi .l{color:var(--muted);font-size:12px;margin-top:3px;font-weight:600}
  .kpi .s{color:var(--faint);font-size:10.5px;margin-top:4px}

  /* main grid: chart + feed */
  .grid-main{display:grid;grid-template-columns:1.7fr 1fr;gap:18px;margin-bottom:18px}
  @media(max-width:860px){.grid-main{grid-template-columns:1fr}}
  .chart-wrap{position:relative}
  .chart{width:100%;height:230px;display:block}
  .chart-tip{position:absolute;pointer-events:none;opacity:0;transition:opacity .15s;
    background:rgba(10,15,28,.95);border:1px solid var(--border-strong);border-radius:12px;padding:9px 12px;font-size:12px;
    box-shadow:0 14px 40px -14px rgba(0,0,0,.8);z-index:5;min-width:130px}
  .chart-tip .row{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:2px 0;color:var(--muted)}
  .chart-tip .row b{color:var(--text)}
  .dot-leg{width:8px;height:8px;border-radius:3px;display:inline-block;margin-left:6px;vertical-align:middle}
  .legend{display:flex;gap:18px;font-size:12px;color:var(--muted);margin-top:8px;flex-wrap:wrap}
  .empty-state{text-align:center;color:var(--faint);padding:30px 10px;font-size:13px}

  /* feed */
  .feed{display:flex;flex-direction:column;gap:4px;max-height:278px;overflow:auto}
  .feed::-webkit-scrollbar{width:8px}
  .feed::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:99px}
  .ev{display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:12px;transition:.15s;font-size:12.5px}
  .ev:hover{background:rgba(255,255,255,.04)}
  .ev .ic{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;font-size:14px;flex:none;background:rgba(255,255,255,.05);border:1px solid var(--border)}
  .ev .tx{flex:1;min-width:0}
  .ev .tx .a{color:var(--text);font-weight:700}
  .ev .tx .b{color:var(--faint);font-size:11px;font-family:ui-monospace,monospace;direction:ltr;text-align:right}
  .ev .when{color:var(--faint);font-size:11px;flex:none}

  /* forms */
  label{display:block;font-size:12px;color:var(--muted);margin:14px 0 7px;font-weight:700}
  input,select,textarea{width:100%;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:12px;
    padding:12px 14px;font-size:14px;color:var(--text);font-family:inherit;outline:none;transition:.2s}
  input:focus,select:focus,textarea:focus{border-color:var(--cyan);box-shadow:0 0 0 4px rgba(34,211,238,.14);background:rgba(255,255,255,.06)}
  textarea{resize:vertical;min-height:86px;line-height:1.9}
  select option{background:#0c1222;color:var(--text)}
  .field-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .field-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
  @media(max-width:640px){.field-grid,.field-grid3{grid-template-columns:1fr}}

  /* chips */
  .chips{display:flex;flex-direction:column;gap:8px}
  .chip{display:flex;align-items:center;justify-content:space-between;gap:10px;
    background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:13px;padding:11px 15px;font-size:13.5px;transition:.2s}
  .chip:hover{border-color:var(--border-strong)}
  .chip .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .chip .t .raw{font-family:ui-monospace,monospace;color:var(--faint);font-size:11px;direction:ltr;text-align:right}
  .chip .x{cursor:pointer;color:var(--rose);background:none;border:none;font-size:15px;padding:3px 7px;border-radius:8px;transition:.15s}
  .chip .x:hover{background:rgba(251,113,133,.14)}
  .chip a{color:var(--cyan);text-decoration:none;font-size:13px}
  .addrow{display:flex;gap:8px;margin-top:10px}
  .addrow input{flex:1}
  .hint{background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.25);border-radius:12px;padding:11px 13px;font-size:12px;color:var(--muted);line-height:1.9;margin-top:12px}
  .hint b{color:var(--amber)}

  /* users */
  .search{position:relative}
  .search input{padding-left:38px}
  .search::before{content:"🔍";position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:13px;opacity:.5}
  .utable{width:100%;border-collapse:collapse;font-size:13px}
  .utable th{color:var(--faint);font-weight:700;text-align:right;padding:10px 12px;border-bottom:1px solid var(--border);font-size:11px;letter-spacing:.3px}
  .utable td{padding:11px 12px;border-bottom:1px solid rgba(148,163,184,.08);vertical-align:middle}
  .utable tbody tr{transition:.15s}
  .utable tbody tr:hover{background:rgba(255,255,255,.03)}
  .usr{display:flex;align-items:center;gap:11px}
  .avatar{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-size:16px;font-weight:800;color:#fff;flex:none;
    background:var(--grad);box-shadow:0 4px 14px -6px rgba(99,102,241,.7);position:relative;overflow:hidden}
  .avatar img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}
  .avatar.owner{box-shadow:0 0 0 2px #0c1222, 0 0 0 4px var(--amber)}
  .uname{font-weight:800;font-size:13.5px}
  .umeta{color:var(--faint);font-size:11.5px;font-family:ui-monospace,monospace;cursor:pointer}
  .umeta:hover{color:var(--cyan)}
  .pill{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:99px;font-size:11px;font-weight:700;white-space:nowrap}
  .pill .d{width:6px;height:6px;border-radius:50%;background:currentColor}
  .pill.ok{background:rgba(52,211,153,.12);color:var(--green)}
  .pill.off{background:rgba(251,113,133,.12);color:var(--rose)}
  .pill.warn{background:rgba(251,191,36,.12);color:var(--amber)}
  .pill.info{background:rgba(125,211,252,.12);color:var(--cyan)}
  .pill.mute{background:rgba(148,163,184,.1);color:var(--muted)}

  /* toast */
  .toast{position:fixed;bottom:26px;right:50%;transform:translateX(50%) translateY(20px);background:#0d1426;
    border:1px solid var(--border-strong);border-right:3px solid var(--green);padding:13px 24px;border-radius:14px;font-size:13px;font-weight:700;
    box-shadow:0 24px 60px -24px rgba(0,0,0,.9);opacity:0;transition:.3s;pointer-events:none;z-index:99;max-width:92vw}
  .toast.show{opacity:1;transform:translateX(50%) translateY(0)}

  .hidden{display:none!important}
  .link{display:inline-flex;align-items:center;gap:8px;color:#fff;text-decoration:none;background:var(--grad);border-radius:13px;padding:12px 18px;font-size:13.5px;font-weight:700;
    box-shadow:0 10px 30px -12px rgba(34,211,238,.55);transition:.2s}
  .link:hover{filter:brightness(1.07)}
  ol{margin:12px 20px 0;color:var(--muted);font-size:13px;line-height:2.1}

  /* login */
  .login-shell{min-height:100vh;display:grid;place-items:center;padding:20px}
  .login-card{width:100%;max-width:420px;border-radius:24px;padding:2px;position:relative;z-index:1;
    background:linear-gradient(140deg,rgba(34,211,238,.5),rgba(129,140,248,.45) 50%,rgba(244,63,94,.3));
    box-shadow:0 40px 120px -40px rgba(99,102,241,.7);animation:rise .6s cubic-bezier(.2,.7,.3,1) both}
  .login-inner{border-radius:22px;padding:34px 30px;background:linear-gradient(165deg,rgba(12,17,32,.98),rgba(8,11,22,.96))}
  .login-logo{width:66px;height:66px;border-radius:20px;background:var(--grad2);display:grid;place-items:center;font-size:30px;margin:0 auto 16px;
    box-shadow:0 14px 40px -12px rgba(34,211,238,.6), inset 0 0 0 1px rgba(255,255,255,.25)}
  .login-inner h1{text-align:center;font-size:20px;font-weight:900}
  .login-inner .sub{text-align:center;color:var(--muted);font-size:12px;margin-top:6px;line-height:1.9}
  .otp{display:flex;gap:10px;margin-top:16px}
  .otp input{flex:1;text-align:center;font-size:22px;font-weight:800;letter-spacing:8px;font-family:ui-monospace,monospace;direction:ltr}
  .code-label{text-align:center;color:var(--faint);font-size:11px;margin-top:12px}
</style>
</head>
<body>
<div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>

<!-- ================= LOGIN ================= -->
<div class="login-shell" id="loginView">
  <div class="login-card">
    <div class="login-inner">
      <div class="login-logo">🤖</div>
      <h1>Nika Net</h1>
      <div class="sub">پنل مدیریت بات · ورود امن با کد تلگرام</div>
      <label style="text-align:right">آیدی عددی تلگرام شما</label>
      <input id="lgId" inputmode="numeric" placeholder="8940829322" dir="ltr" />
      <label style="text-align:right">کد تأیید (به تلگرامت ارسال می‌شود)</label>
      <div class="otp"><input id="lgCode" inputmode="numeric" placeholder="••••••" dir="ltr" maxlength="8" /></div>
      <div class="code-label">کد تا <b style="color:var(--amber)">۵ دقیقه</b> معتبر است</div>
      <div class="row" style="display:flex;gap:10px;margin-top:18px">
        <button class="btn btn-p" id="lgSend" style="flex:1">📨 دریافت کد</button>
        <button class="btn btn-s" id="lgGo" style="flex:1">✅ ورود</button>
      </div>
      <div class="hint" id="lgMsg">فقط <b>مالک ربات</b> می‌تواند کد دریافت کند.</div>
    </div>
  </div>
</div>

<!-- ================= APP ================= -->
<div id="appView" class="hidden">
  <div class="topbar">
    <div class="brand">
      <div class="logo">🤖</div>
      <div>
        <h1>Nika Net</h1>
        <div class="sub" id="botName">@…</div>
      </div>
    </div>
    <div class="top-actions">
      <span class="live"><span class="dot"></span>ربات آنلاین</span>
      <span class="clock" id="clock">—</span>
      <button class="btn btn-danger btn-sm" id="logout">خروج</button>
    </div>
  </div>

  <div class="shell">
    <!-- hero -->
    <div class="hero">
      <div class="hero-inner">
        <div>
          <h1>سلام، مالک <span class="wave">👋</span></h1>
          <p id="heroDate">—</p>
        </div>
        <div class="hero-right">
          <div class="hero-switch">
            <div class="lbl" id="heroFjLabel">عضویت اجباری</div>
            <div class="switch" id="heroFj"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- KPI -->
    <div class="kpis">
      <div class="kpi" style="--tk:linear-gradient(140deg,#22d3ee,#0891b2);animation-delay:.02s">
        <div class="ico">👥</div><div class="v" id="kpUsers">۰</div><div class="l">کاربر ربات</div><div class="s">کل کاربران ثبت‌شده</div>
      </div>
      <div class="kpi" style="--tk:linear-gradient(140deg,#fb7185,#e11d48);animation-delay:.07s">
        <div class="ico">🚫</div><div class="v" id="kpBlocked">۰</div><div class="l">مسدودشده</div><div class="s">غیرعضوها</div>
      </div>
      <div class="kpi" style="--tk:linear-gradient(140deg,#34d399,#059669);animation-delay:.12s">
        <div class="ico">✅</div><div class="v" id="kpVerified">۰</div><div class="l">تأیید عضویت</div><div class="s">ورود موفق بعد عضویت</div>
      </div>
      <div class="kpi" style="--tk:linear-gradient(140deg,#818cf8,#4f46e5);animation-delay:.17s">
        <div class="ico">📡</div><div class="v" id="kpChats">۰</div><div class="l">کانال هدف</div><div class="s">عضویت اجباری</div>
      </div>
      <div class="kpi" style="--tk:linear-gradient(140deg,#fbbf24,#d97706);animation-delay:.22s">
        <div class="ico">📈</div><div class="v" id="kpRate">—</div><div class="l">نرخ تأیید</div><div class="s">تأیید از کل بازرسی‌ها</div>
      </div>
    </div>

    <!-- chart + feed -->
    <div class="grid-main">
      <div class="card">
        <h2>📈 آمار عضویت <span class="mini">۷ روز اخیر · دادهٔ واقعی</span></h2>
        <div class="chart-wrap">
          <svg class="chart" id="chart" viewBox="0 0 640 230" preserveAspectRatio="none"></svg>
          <div class="chart-tip" id="chartTip"></div>
        </div>
        <div class="legend">
          <span><span class="dot-leg" style="background:var(--rose)"></span>مسدودشده</span>
          <span><span class="dot-leg" style="background:var(--green)"></span>تأیید عضویت</span>
        </div>
      </div>
      <div class="card">
        <h2>🕘 رویدادهای اخیر <span class="mini">آخرین فعالیت‌ها</span></h2>
        <div class="feed" id="fjLog"><div class="empty-state">—</div></div>
      </div>
    </div>

    <!-- forced join -->
    <div class="card">
      <h2>🔒 عضویت اجباری <span class="mini">غیرعضوها تا عضویت + تأیید، از ربات مسدودند</span></h2>
      <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:15px;padding:15px 18px">
        <div><b style="font-size:14px">فعال‌سازی عضویت اجباری</b>
          <div style="color:var(--muted);font-size:12px;margin-top:4px">هر پیام کاربر غیرعضو با پیام «عضو شو» پاسخ داده می‌شود</div>
        </div>
        <div class="switch" id="fjEnabled"></div>
      </div>

      <label>کانال‌ها / گروه‌های هدف</label>
      <div class="chips" id="fjChats"></div>
      <div class="addrow">
        <input id="fjAdd" placeholder="@myChannel یا -1001234567890 یا t.me/myChannel" dir="ltr" />
        <button class="btn btn-p" style="width:auto" id="fjAddBtn">➕ افزودن</button>
      </div>
      <div class="hint">⚡ وقتی ربات را در کانالی <b>ادمین</b> کنی، همان کانال خودکار اضافه و عضویت اجباری فعال می‌شود.</div>

      <div class="field-grid3">
        <div><label>شرط عضویت</label>
          <select id="fjMode"><option value="any">حداقل یکی (ANY)</option><option value="all">همه (ALL)</option></select>
        </div>
        <div><label>بازهٔ بررسی مجدد</label>
          <select id="fjRecheck"><option value="0">هر بار (بدون کش)</option><option value="1">هر ۱ ساعت</option><option value="6">هر ۶ ساعت</option><option value="24">هر ۲۴ ساعت</option></select>
        </div>
        <div><label>مشمولان</label>
          <select id="fjApply"><option value="all">همهٔ کاربران</option><option value="new">فقط کاربران جدید</option></select>
        </div>
      </div>

      <label>متن پیام «عضو شو»</label>
      <textarea id="fjMsg"></textarea>
      <label>متن دکمهٔ تأیید</label>
      <input id="fjBtn" dir="rtl" placeholder="✅ عضویت انجام شد — بررسی کن" />
      <label>پیام خوش‌آمد بعد از تأیید <span class="mini" style="font-size:10px">(خالی = پیش‌فرض)</span></label>
      <input id="fjWelcome" dir="rtl" placeholder="✅ عضویتت تأیید شد — خوش آمدی!" />

      <div class="field-grid">
        <div><label>آیدی‌های معاف (هر خط یکی)</label>
          <textarea id="fjExempt" dir="ltr" placeholder="123456789"></textarea>
        </div>
        <div><label>فاصلهٔ پیام «عضو شو» (ضد اسپم)</label>
          <select id="fjCool"><option value="0">هر پیام</option><option value="1">هر ۱ دقیقه</option><option value="2">هر ۲ دقیقه</option><option value="5">هر ۵ دقیقه</option><option value="10">هر ۱۰ دقیقه</option></select>
          <div class="hint" style="margin-top:10px">کاربر غیرعضو فقط هر چند دقیقه یک‌بار پیام «عضو شو» می‌گیرد.</div>
        </div>
      </div>

      <div class="row" style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
        <button class="btn btn-s" id="fjSave">💾 ذخیره تنظیمات</button>
        <button class="btn btn-ghost" id="fjTest">🔎 تست عضویت خودم</button>
      </div>
      <div id="fjTestOut" style="margin-top:14px"></div>
    </div>

    <!-- users -->
    <div class="card">
      <h2>👥 کاربران <span class="mini" id="usrCount">—</span></h2>
      <div class="search" style="margin-bottom:14px"><input id="usrSearch" placeholder="جستجو: نام، آیدی یا یوزرنیم…" /></div>
      <div style="max-height:440px;overflow:auto">
        <table class="utable">
          <thead><tr><th>کاربر</th><th>آیدی</th><th>وضعیت</th><th>آخرین بازدید</th><th></th></tr></thead>
          <tbody id="usrBody"></tbody>
        </table>
      </div>
      <div class="empty-state hidden" id="usrEmpty">کاربری یافت نشد</div>
    </div>

    <!-- broadcast + info -->
    <div class="grid-main">
      <div class="card">
        <h2>📣 پیام همگانی <span class="mini">برای همهٔ کاربران ربات</span></h2>
        <textarea id="bcText" placeholder="متن پیام (با HTML تلگرام: <b>ضخیم</b>، <code>کد</code>…)"></textarea>
        <div class="row" style="display:flex;gap:10px;margin-top:14px">
          <button class="btn btn-p" id="bcSend" style="flex:1">🚀 ارسال به همه</button>
        </div>
        <div class="hint" id="bcOut" style="display:none"></div>
      </div>
      <div class="card">
        <h2>⚙️ اطلاعات و دسترسی</h2>
        <a class="link" id="adminLink" href="#" target="_blank" rel="noopener">🔗 افزودن بات به‌عنوان ادمین کانال</a>
        <div style="margin-top:16px;display:flex;flex-direction:column;gap:9px;font-size:12.5px;color:var(--muted)">
          <div style="display:flex;justify-content:space-between"><span>آیدی مالک</span><b id="ownerId" style="font-family:ui-monospace,monospace;direction:ltr">—</b></div>
          <div style="display:flex;justify-content:space-between"><span>ربات</span><b id="botUname" style="font-family:ui-monospace,monospace;direction:ltr">—</b></div>
          <div style="display:flex;justify-content:space-between"><span>آدرس پنل</span><b id="panelUrl" style="font-family:ui-monospace,monospace;direction:ltr;max-width:200px;overflow:hidden;text-overflow:ellipsis">—</b></div>
        </div>
        <div class="hint">برای بررسی عضویت، ربات باید در کانال هدف <b>ادمین</b> باشد. با دکمهٔ بالا کانال را انتخاب کن تا خودکار اضافه شود.</div>
      </div>
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
    return d.toLocaleDateString("fa-IR", { month: "long", day: "numeric" }) + " · " +
           d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  }
  function countUp(el, to, suffix) {
    var t0 = null, dur = 900;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = faNum(Math.round(to * e)) + (suffix || "");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* clock */
  function tickClock() {
    var d = new Date();
    $("#clock").textContent = d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  setInterval(tickClock, 1000); tickClock();

  /* ---------- login ---------- */
  $("#lgSend").onclick = async function () {
    var id = $("#lgId").value.trim();
    if (!/^\\d{5,}$/.test(id)) { toast("آیدی عددی معتبر وارد کن"); return; }
    var r = await api("/panel/api/request", { method: "POST", body: { id: Number(id) } });
    if (r.ok && r.j.ok) { $("#lgMsg").innerHTML = "✅ کد به تلگرامت فرستاده شد — اینجا واردش کن."; toast("کد فرستاده شد ✓"); }
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
    var f = state.fj, b = state.bot;
    $("#botName").textContent = "@" + b.username;
    $("#heroDate").textContent = new Date().toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " · اینجا خلاصهٔ وضعیت رباتته";
    $("#botUname").textContent = "@" + b.username;
    $("#ownerId").textContent = b.ownerId;
    $("#panelUrl").textContent = b.origin + "/panel";
    $("#adminLink").href = b.adminLink;

    // KPI
    countUp($("#kpUsers"), state.stats.users);
    countUp($("#kpChats"), f.chats.length);
    var total = state.stats.blocked + state.stats.verified;
    $("#kpRate").textContent = total > 0 ? Math.round(100 * state.stats.verified / total).toLocaleString("fa-IR") + "٪" : "—";

    // hero + fj switch
    setSwitch($("#heroFj"), !!f.enabled);
    $("#heroFjLabel").textContent = f.enabled ? "عضویت اجباری: فعال" : "عضویت اجباری: غیرفعال";
    setSwitch($("#fjEnabled"), !!f.enabled);

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
      var d = document.createElement("div"); d.className = "chip";
      var t = document.createElement("div"); t.className = "t";
      t.innerHTML = "<b>" + (meta.title || c) + "</b> <span class=\\"raw\\">" + c + "</span>";
      var x = document.createElement("button"); x.className = "x"; x.textContent = "✕";
      x.onclick = function () { removeChat(c); };
      d.appendChild(t);
      if (meta.username) {
        var a = document.createElement("a"); a.href = "https://t.me/" + meta.username; a.target = "_blank"; a.rel = "noopener"; a.textContent = "🔗";
        d.appendChild(a);
      }
      d.appendChild(x); chips.appendChild(d);
    });
    if (!(f.chats || []).length) chips.innerHTML = '<div style="color:var(--faint);font-size:12.5px;padding:6px 2px">هنوز کانالی اضافه نشده</div>';
  }

  function setSwitch(el, on) {
    el.classList.toggle("on", !!on);
    el.setAttribute("data-on", on ? "1" : "0");
  }

  /* ---------- stats + chart ---------- */
  async function loadStats() {
    var r = await api("/panel/api/stats");
    if (!r.ok) return;
    stats = r.j;
    countUp($("#kpBlocked"), stats.blocked);
    countUp($("#kpVerified"), stats.verified);
    drawChart(stats.days || []);
    renderFeed(stats.log || []);
  }

  function renderFeed(log) {
    var map = {
      blocked: ["🚫", "مسدود شد", "rose"],
      verified: ["✅", "تأیید عضویت", "green"],
      chat_added: ["➕", "افزودن کانال", "cyan"],
      chat_removed: ["➖", "حذف کانال", "amber"],
      exempted: ["🛡", "معاف شد", "amber"],
      unexempted: ["🔓", "حذف معافیت", "rose"]
    };
    var html = "";
    log.forEach(function (e) {
      var m = map[e.ev] || ["•", e.ev, "muted"];
      var extra = e.extra ? " · " + e.extra : (e.chat ? " · " + e.chat : "");
      html += '<div class="ev"><div class="ic">' + m[0] + '</div>' +
        '<div class="tx"><div class="a">' + m[1] + '</div><div class="b">' + extra + '</div></div>' +
        '<div class="when">' + fmtTime(e.t) + '</div></div>';
    });
    $("#fjLog").innerHTML = html || '<div class="empty-state">هنوز رویدادی ثبت نشده</div>';
  }

  function drawChart(days) {
    var svg = $("#chart");
    var W = 640, H = 230, padL = 38, padR = 14, padT = 18, padB = 30;
    var iw = W - padL - padR, ih = H - padT - padB;
    var n = days.length || 1;
    var max = 1;
    days.forEach(function (d) { max = Math.max(max, d.blocked, d.verified); });
    var allZero = max <= 1 && days.every(function (d) { return !d.blocked && !d.verified; });
    if (allZero) { svg.innerHTML = ""; return; }

    function px(i) { return padL + (n === 1 ? iw / 2 : i * (iw / (n - 1))); }
    function py(v) { return padT + ih - (v / max) * ih; }

    function pts(key) {
      return days.map(function (d, i) { return [px(i), py(d[key] || 0)]; });
    }
    function smooth(pts) {
      if (pts.length < 2) return pts.length ? "M" + pts[0][0] + " " + pts[0][1] : "";
      var d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
      for (var i = 0; i < pts.length - 1; i++) {
        var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
        var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += " C" + c1x.toFixed(1) + " " + c1y.toFixed(1) + " " + c2x.toFixed(1) + " " + c2y.toFixed(1) + " " + p2[0].toFixed(1) + " " + p2[1].toFixed(1);
      }
      return d;
    }
    function area(pts) {
      var base = padT + ih;
      return smooth(pts) + " L" + pts[pts.length - 1][0].toFixed(1) + " " + base + " L" + pts[0][0].toFixed(1) + " " + base + " Z";
    }

    var pb = pts("blocked"), pv = pts("verified");
    var grid = "";
    for (var g = 0; g <= 3; g++) {
      var y = padT + (ih / 3) * g;
      var val = Math.round(max * (1 - g / 3));
      grid += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) + '" stroke="rgba(148,163,184,.12)" stroke-width="1"/>';
      grid += '<text x="' + (padL - 7) + '" y="' + (y + 4).toFixed(1) + '" font-size="10" fill="#5d6a8a" text-anchor="end">' + faNum(val) + "</text>";
    }
    var xl = "";
    days.forEach(function (d, i) {
      xl += '<text x="' + px(i).toFixed(1) + '" y="' + (H - 8) + '" font-size="10.5" fill="#8b99b8" text-anchor="middle">' + (d.label || "").slice(0, 5) + "</text>";
    });

    svg.innerHTML =
      '<defs>' +
      '<linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(251,113,133,.5)"/><stop offset="1" stop-color="rgba(251,113,133,0)"/></linearGradient>' +
      '<linearGradient id="gV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(52,211,153,.5)"/><stop offset="1" stop-color="rgba(52,211,153,0)"/></linearGradient>' +
      "</defs>" +
      grid + xl +
      '<path d="' + area(pb) + '" fill="url(#gR)"/>' +
      '<path d="' + area(pv) + '" fill="url(#gV)"/>' +
      '<path d="' + smooth(pb) + '" fill="none" stroke="#fb7185" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + smooth(pv) + '" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<line id="guide" y1="' + padT + '" y2="' + (padT + ih) + '" stroke="rgba(148,163,184,.35)" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>' +
      '<circle id="dotR" r="4" fill="#fb7185" stroke="#0c1222" stroke-width="1.5" opacity="0"/>' +
      '<circle id="dotV" r="4" fill="#34d399" stroke="#0c1222" stroke-width="1.5" opacity="0"/>';

    var tip = $("#chartTip");
    svg.addEventListener("mousemove", function (ev) {
      var rect = svg.getBoundingClientRect();
      var mx = ((ev.clientX - rect.left) / rect.width) * W;
      var rel = (mx - padL) / Math.max(1, iw);
      var i = Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1))));
      var x = px(i), d = days[i];
      $("#guide").setAttribute("x1", x); $("#guide").setAttribute("x2", x); $("#guide").setAttribute("opacity", "1");
      $("#dotR").setAttribute("cx", x); $("#dotR").setAttribute("cy", py(d.blocked)); $("#dotR").setAttribute("opacity", d.blocked > 0 ? "1" : "0");
      $("#dotV").setAttribute("cx", x); $("#dotV").setAttribute("cy", py(d.verified)); $("#dotV").setAttribute("opacity", d.verified > 0 ? "1" : "0");
      var lp = (i / (n - 1)) * (rect.width - 160);
      var left = Math.max(0, Math.min(rect.width - 160, lp));
      tip.innerHTML = '<div style="font-weight:800;color:var(--text);margin-bottom:4px">' + (d.label || "") + '</div>' +
        '<div class="row"><span><span class="dot-leg" style="background:var(--rose)"></span>مسدود</span><b>' + faNum(d.blocked) + '</b></div>' +
        '<div class="row"><span><span class="dot-leg" style="background:var(--green)"></span>تأیید</span><b>' + faNum(d.verified) + '</b></div>';
      tip.style.left = left + "px";
      tip.style.top = "6px";
      tip.style.opacity = "1";
    });
    svg.addEventListener("mouseleave", function () {
      $("#guide").setAttribute("opacity", "0");
      $("#dotR").setAttribute("opacity", "0");
      $("#dotV").setAttribute("opacity", "0");
      tip.style.opacity = "0";
    });
  }

  /* ---------- users ---------- */
  async function loadUsers() {
    var r = await api("/panel/api/users");
    if (!r.ok) return;
    users = r.j.users || [];
    $("#usrCount").textContent = faNum(users.length) + " نفر";
    renderUsers();
  }

  function statusBadge(u) {
    if (u.owner) return '<span class="pill info"><span class="d"></span>👑 مالک</span>';
    if (u.exempt) return '<span class="pill warn"><span class="d"></span>🛡 معاف</span>';
    if (!u.fjEnabled) return '<span class="pill mute"><span class="d"></span>آزاد</span>';
    if (u.joined) return '<span class="pill ok"><span class="d"></span>✓ عضو</span>';
    return '<span class="pill off"><span class="d"></span>⛔ مسدود</span>';
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

      var td1 = document.createElement("td");
      var usr = document.createElement("div"); usr.className = "usr";
      var av = document.createElement("div"); av.className = "avatar" + (u.owner ? " owner" : ""); av.textContent = initial;
      if (u.photo) {
        var img = document.createElement("img");
        img.src = "/panel/api/photo/" + u.id; img.alt = "";
        img.onload = function () { av.textContent = ""; av.appendChild(img); };
        img.onerror = function () {
          if (!img.getAttribute("data-r")) { img.setAttribute("data-r", "1"); setTimeout(function () { img.src = "/panel/api/photo/" + u.id + "?r=" + Date.now(); }, 800); }
          else img.remove();
        };
      }
      usr.appendChild(av);
      var nm = document.createElement("div");
      var nmn = document.createElement("div"); nmn.className = "uname"; nmn.textContent = full || "بدون نام";
      nm.appendChild(nmn);
      var um = document.createElement("div"); um.className = "umeta";
      if (u.username) { um.textContent = "@" + u.username; um.onclick = function () { window.open("https://t.me/" + u.username, "_blank"); }; }
      else um.textContent = "بدون یوزرنیم";
      nm.appendChild(um);
      usr.appendChild(nm);
      td1.appendChild(usr);

      var td2 = document.createElement("td");
      var idv = document.createElement("div"); idv.className = "umeta"; idv.dir = "ltr"; idv.textContent = u.id; idv.style.cursor = "pointer";
      idv.onclick = function () { copyId(u.id); };
      td2.appendChild(idv);

      var td3 = document.createElement("td"); td3.innerHTML = statusBadge(u);

      var td4 = document.createElement("td");
      var ls = document.createElement("div"); ls.className = "umeta"; ls.style.cursor = "default"; ls.textContent = fmtTime(u.lastSeen);
      td4.appendChild(ls);

      var td5 = document.createElement("td");
      var acts = document.createElement("div"); acts.style.display = "flex"; acts.style.gap = "6px"; acts.style.flexWrap = "wrap";
      var cp = document.createElement("button"); cp.className = "btn btn-ghost btn-sm"; cp.textContent = "📋 کپی";
      cp.onclick = function () { copyId(u.id); };
      acts.appendChild(cp);
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
  $("#heroFj").onclick = async function () {
    var r = await api("/panel/api/fj", { method: "POST", body: { enabled: state.fj.enabled ? false : true } });
    if (r.ok) { state = r.j.state; render(); toast(state.fj.enabled ? "عضویت اجباری روشن شد ✓" : "عضویت اجباری خاموش شد"); }
  };
  $("#fjEnabled").onclick = function () { $("#heroFj").onclick(); };

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
    if (!r.ok) { out.innerHTML = '<div style="color:var(--rose)">خطا</div>'; return; }
    var html = "";
    (r.j.results || []).forEach(function (x) {
      var u = x.you ? '<span class="pill ok"><span class="d"></span>✓ تو عضو هستی</span>' : '<span class="pill off"><span class="d"></span>✗ تو عضو نیستی (' + (x.youStatus || "error") + ')</span>';
      var b = x.botAdmin ? '<span class="pill ok"><span class="d"></span>ربات ادمین ✓</span>' : '<span class="pill off"><span class="d"></span>ربات ادمین نیست (' + (x.botStatus || "error") + ')</span>';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:12px;padding:11px 14px;margin-top:8px;font-size:12.5px"><b>' + x.chat + '</b><span style="display:flex;gap:8px;flex-wrap:wrap">' + u + b + '</span></div>';
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
    var o = $("#bcOut"); o.style.display = "block";
    if (r.ok) { o.innerHTML = "✅ پیام به <b>" + faNum(r.j.sent) + "</b> از " + faNum(r.j.total) + " کاربر ارسال شد."; toast("پیام همگانی ارسال شد ✓"); }
    else { o.innerHTML = "<b>⛔ " + (r.j.error || "خطا") + "</b>"; }
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
