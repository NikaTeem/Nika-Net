// Nika Net — subscription landing page (served at /sub/<token> for browsers).
// Self-contained: inline CSS/JS, app logos as data URIs, embedded QR generator.

import { LOGO_HIDDIFY, LOGO_HAPP, LOGO_V2RAYNG, LOGO_V2BOX } from "./logos";

declare const QRCODE_LIB: string;

const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const FA = "۰۱۲۳۴۵۶۷۸۹";
const fa = (n: number | string): string => String(n).replace(/\d/g, (d) => FA[+d]);

export interface SubPageData {
  name: string;
  active: boolean;
  quota: number; // GB
  used: number; // GB
  days: number; // validity days
  origin: string; // https://name.sub.workers.dev
  token: string;
  version: string;
  protocols: { vless: boolean; trojan: boolean; warp: boolean };
}

export function renderSubPage(d: SubPageData): string {
  const subRaw = `${d.origin}/sub/${d.token}`;
  const clash = `${subRaw}.yaml`;
  const singbox = `${subRaw}.json`;
  const enc = encodeURIComponent;

  const v2rayng = `v2rayng://install-sub?url=${enc(subRaw)}&name=${enc("Nika Net")}`;
  const v2box = `v2box://install-sub?url=${enc(subRaw)}&name=${enc("Nika Net")}`;
  const hiddify = `hiddify://import/${subRaw}#Nika%20Net`;
  const happ = `happ://add/${subRaw}`;

  const pct = d.quota > 0 ? Math.max(0, Math.min(100, Math.round((d.used / d.quota) * 100))) : 0;
  const stateLabel = d.active ? "فعال" : "غیرفعال";
  const stateCls = d.active ? "on" : "off";

  const protos = [
    d.protocols.vless ? "VLESS" : "",
    d.protocols.trojan ? "Trojan" : "",
    d.protocols.warp ? "WARP" : "",
  ].filter(Boolean);

  const qr = QRCODE_LIB.replace(/<\/script/gi, "<\\/script");

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>لینک ساب • Nika Net</title>
<style>
:root{
  --bg:#0a0c12; --bg2:#0f1220; --card:rgba(255,255,255,.045); --card2:rgba(255,255,255,.07);
  --border:rgba(255,255,255,.09); --txt:#eef0f8; --muted:#9aa1b8;
  --a1:#7c5cff; --a2:#22d3ee; --grad:linear-gradient(135deg,#7c5cff,#22d3ee);
  --ok:#34d399; --warn:#fbbf24; --bad:#fb7185; --shadow:0 20px 60px rgba(0,0,0,.45);
}
@media (prefers-color-scheme: light){
  :root{
    --bg:#eef0f8; --bg2:#ffffff; --card:#ffffff; --card2:#f4f5fb;
    --border:rgba(20,24,48,.10); --txt:#141828; --muted:#5b6279; --shadow:0 16px 50px rgba(40,48,90,.14);
  }
}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{
  font-family:"Vazirmatn","IRANSansX","Segoe UI",Tahoma,"Helvetica Neue",sans-serif;
  background:var(--bg); color:var(--txt); min-height:100vh; line-height:1.7;
  background-image:
    radial-gradient(60vw 40vw at 110% -10%, rgba(124,92,255,.28), transparent 60%),
    radial-gradient(55vw 40vw at -10% 10%, rgba(34,211,238,.20), transparent 60%),
    radial-gradient(40vw 35vw at 50% 120%, rgba(124,92,255,.16), transparent 60%);
  background-attachment:fixed;
}
.wrap{max-width:520px;margin:0 auto;padding:26px 16px 40px}
/* ---------- hero ---------- */
.hero{text-align:center;padding:14px 6px 8px;animation:up .5s ease both}
.brand{display:inline-flex;align-items:center;gap:8px;font-weight:800;letter-spacing:.5px;
  background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;
  font-size:1.05rem;direction:ltr}
.brand .dot{width:9px;height:9px;border-radius:50%;background:var(--grad);box-shadow:0 0 12px #22d3ee}
.hero h1{margin-top:14px;font-size:1.7rem;font-weight:800}
.hero p{color:var(--muted);font-size:.95rem;margin-top:2px}
.chip{display:inline-flex;align-items:center;gap:7px;margin-top:12px;padding:6px 16px;border-radius:999px;
  font-size:.85rem;font-weight:700;border:1px solid var(--border);background:var(--card)}
.chip .b{width:8px;height:8px;border-radius:50%}
.chip.on .b{background:var(--ok);box-shadow:0 0 10px var(--ok);animation:pulse 2s infinite}
.chip.off .b{background:var(--bad);box-shadow:0 0 10px var(--bad)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
/* ---------- cards ---------- */
.card{background:var(--card);border:1px solid var(--border);border-radius:20px;
  padding:20px;margin-top:16px;box-shadow:var(--shadow);backdrop-filter:blur(14px);
  animation:up .55s ease both}
.card h2{font-size:1.02rem;font-weight:800;display:flex;align-items:center;gap:8px}
.card .sub{color:var(--muted);font-size:.82rem;margin-top:4px}
@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
/* ---------- meter ---------- */
.meter{height:12px;border-radius:99px;background:var(--card2);overflow:hidden;margin:14px 0 6px}
.meter>i{display:block;height:100%;border-radius:99px;background:var(--grad);
  box-shadow:0 0 14px rgba(34,211,238,.55);transition:width .8s cubic-bezier(.2,.8,.2,1)}
.mlabel{display:flex;justify-content:space-between;font-size:.8rem;color:var(--muted)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
.stat{background:var(--card2);border:1px solid var(--border);border-radius:14px;padding:10px 6px;text-align:center}
.stat b{display:block;font-size:1.05rem}
.stat span{font-size:.72rem;color:var(--muted)}
.protos{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}
.protos i{font-style:normal;font-size:.72rem;font-weight:700;padding:4px 12px;border-radius:999px;
  color:#fff;background:var(--grad)}
/* ---------- link box ---------- */
.linkbox{display:flex;gap:8px;margin-top:12px}
.linkbox input{flex:1;min-width:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.78rem;
  padding:11px 12px;border-radius:12px;border:1px solid var(--border);background:var(--card2);color:var(--txt);
  direction:ltr;text-align:left;outline:none}
.btn{border:0;cursor:pointer;font-family:inherit;font-weight:800;border-radius:12px;padding:11px 18px;
  font-size:.9rem;transition:transform .12s ease,filter .12s ease;color:#fff;background:var(--grad);
  box-shadow:0 8px 22px rgba(124,92,255,.35);white-space:nowrap}
.btn:active{transform:scale(.96)}
.btn.ghost{background:var(--card2);color:var(--txt);border:1px solid var(--border);box-shadow:none}
.btn.small{padding:8px 14px;font-size:.8rem}
.formats{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.frow{display:flex;align-items:center;gap:8px;background:var(--card2);border:1px solid var(--border);
  border-radius:13px;padding:9px 12px}
.frow .k{font-weight:700;font-size:.82rem;flex:0 0 74px}
.frow .k em{font-style:normal;font-size:.7rem;color:var(--muted);display:block;font-weight:400}
.frow code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;
  font-size:.74rem;color:var(--muted);text-align:left}
/* ---------- apps ---------- */
.apps{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px}
.app{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 8px 13px;border-radius:18px;
  background:var(--card2);border:1px solid var(--border);text-decoration:none;color:var(--txt);
  transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease;position:relative}
.app:hover{transform:translateY(-4px);border-color:transparent;box-shadow:0 14px 34px rgba(124,92,255,.28)}
.app img{width:62px;height:62px;border-radius:20%;object-fit:cover;box-shadow:0 8px 20px rgba(0,0,0,.28);
  background:#fff}
.app b{font-size:.92rem}
.app em{font-style:normal;font-size:.7rem;color:var(--muted)}
.app .go{position:absolute;top:10px;inset-inline-start:10px;font-size:.68rem;font-weight:700;
  background:var(--grad);color:#fff;padding:3px 9px;border-radius:999px}
/* ---------- qr ---------- */
.qrbox{display:flex;gap:16px;align-items:center;margin-top:14px}
#qr{background:#fff;border-radius:16px;padding:10px;line-height:0;box-shadow:0 12px 30px rgba(0,0,0,.3)}
#qr svg{display:block;width:150px;height:150px}
.qrbox .t{font-size:.82rem;color:var(--muted)}
.qrbox .t b{color:var(--txt);display:block;font-size:.95rem;margin-bottom:4px}
/* ---------- footer ---------- */
.foot{text-align:center;color:var(--muted);font-size:.76rem;margin-top:22px}
.foot b{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
/* ---------- toast ---------- */
#toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);
  background:var(--grad);color:#fff;font-weight:700;font-size:.86rem;padding:11px 22px;border-radius:999px;
  opacity:0;transition:all .3s ease;box-shadow:0 14px 40px rgba(0,0,0,.4);z-index:99;pointer-events:none}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
</style>
</head>
<body>
<div class="wrap">

  <header class="hero">
    <div class="brand"><span class="dot"></span>NIKA NET</div>
    <h1>سلام ${esc(d.name)} 👋</h1>
    <p>اشتراک شخصی تو آماده‌ست — با یه لمس وصل شو</p>
    <div class="chip ${stateCls}"><span class="b"></span>${stateLabel}</div>
  </header>

  <section class="card">
    <h2>📊 وضعیت اشتراک</h2>
    <div class="meter"><i style="width:${pct}%"></i></div>
    <div class="mlabel"><span>مصرف</span><span>${fa(pct)}٪</span></div>
    <div class="stats">
      <div class="stat"><b>${fa(d.quota)} GB</b><span>حجم کل</span></div>
      <div class="stat"><b>${fa(d.used)} GB</b><span>مصرف شده</span></div>
      <div class="stat"><b>${fa(d.days)}</b><span>روز اعتبار</span></div>
    </div>
    <div class="protos">${protos.map((p) => `<i>${p}</i>`).join("")}</div>
  </section>

  <section class="card">
    <h2>📋 کپی لینک ساب</h2>
    <p class="sub">این لینک اشتراک شخصی توئه — کپیش کن یا مستقیم وارد اپ کن.</p>
    <div class="linkbox">
      <input id="rawLink" readonly value="${esc(subRaw)}"/>
      <button class="btn" onclick="copyRaw()">کپی</button>
    </div>
    <div class="formats">
      <div class="frow">
        <div class="k">Base64<em>V2rayNG</em></div>
        <code>${esc(subRaw)}</code>
        <button class="btn ghost small" onclick="copyRaw()">کپی</button>
      </div>
      <div class="frow">
        <div class="k">Clash<em>YAML</em></div>
        <code>${esc(clash)}</code>
        <button class="btn ghost small" onclick="copyClash()">کپی</button>
      </div>
      <div class="frow">
        <div class="k">Sing-box<em>JSON</em></div>
        <code>${esc(singbox)}</code>
        <button class="btn ghost small" onclick="copySing()">کپی</button>
      </div>
    </div>
  </section>

  <section class="card">
    <h2>📱 اتصال سریع با اپ</h2>
    <p class="sub">روی اپ موردنظرت بزن تا کانفیگ خودکار واردش بشه ⚡</p>
    <div class="apps">
      <a class="app" href="${v2rayng}"><span class="go">⚡</span><img src="${LOGO_V2RAYNG}" alt="V2rayNG"/><b>V2rayNG</b><em>اندروید</em></a>
      <a class="app" href="${hiddify}"><span class="go">⚡</span><img src="${LOGO_HIDDIFY}" alt="Hiddify"/><b>Hiddify</b><em>همه‌ی پلتفرم‌ها</em></a>
      <a class="app" href="${happ}"><span class="go">⚡</span><img src="${LOGO_HAPP}" alt="Happ"/><b>Happ</b><em>اندروید · iOS</em></a>
      <a class="app" href="${v2box}"><span class="go">⚡</span><img src="${LOGO_V2BOX}" alt="V2Box"/><b>V2Box</b><em>iOS · macOS</em></a>
    </div>
  </section>

  <section class="card">
    <h2>🔳 اسکن سریع</h2>
    <div class="qrbox">
      <div id="qr"></div>
      <div class="t"><b>با دوربین اسکن کن</b>داخل اپ، از بخش «اسکن QR» همین کد رو بخون تا مستقیم وارد بشه.</div>
    </div>
  </section>

  <footer class="foot">ساخته‌شده با <b>NIKA NET</b> · نسخه ${esc(d.version)}<br/>لینک سابت رو جایی امن نگه دار 🔐</footer>
</div>

<div id="toast">کپی شد ✓</div>

<script>${qr}</script>
<script>
(function(){
  var RAW=${JSON.stringify(subRaw)};
  var CLASH=${JSON.stringify(clash)};
  var SING=${JSON.stringify(singbox)};
  function toast(m){
    var t=document.getElementById('toast'); t.textContent=m; t.classList.add('show');
    setTimeout(function(){t.classList.remove('show')},1600);
  }
  function copyText(v){
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(v).then(function(){toast('کپی شد ✓')},function(){legacy(v)});
    }else{legacy(v)}
  }
  function legacy(v){
    var i=document.createElement('input');i.value=v;document.body.appendChild(i);i.select();
    try{document.execCommand('copy');toast('کپی شد ✓')}catch(e){toast('کپی نشد ✗')}
    document.body.removeChild(i);
  }
  window.copyRaw=function(){copyText(RAW)};
  window.copyClash=function(){copyText(CLASH)};
  window.copySing=function(){copyText(SING)};
  try{
    var qr=qrcode(0,'M');qr.addData(RAW);qr.make();
    document.getElementById('qr').innerHTML=qr.createSvgTag({cellSize:5,margin:2});
  }catch(e){document.getElementById('qr').innerHTML='';}
})();
</script>
</body>
</html>`;
}
