<div dir="rtl" align="center">
  <img src="assets/logo.jpg" width="110" style="border-radius:50%;border:3px dashed #8a8a93" alt="لوگوی Nika Net"/>
</div>

<h1 align="center" dir="rtl" style="font-family:Georgia,serif">Nika Net<span style="color:#8a8a93">.</span></h1>

<p align="center" dir="rtl"><em>پنل پروکسی با حال‌وهوای کاغذ و مداد — مقاوم در برابر فیلترینگ، روی یک Cloudflare Worker و با پلن رایگان.</em></p>

<p align="center">
  <a href="README.md">🇬🇧 English</a> &nbsp;·&nbsp;
  <a href="#-نصب-سریع">🚀 نصب سریع</a> &nbsp;·&nbsp;
  <a href="#-ساختار-پروژه">📁 ساختار</a> &nbsp;·&nbsp;
  <a href="#-api">🔌 API</a> &nbsp;·&nbsp;
  <a href="ROADMAP.md">🗺️ نقشهٔ راه</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-brightgreen" alt="مجوز MIT"/>
  <img src="https://img.shields.io/badge/version-0.2.0-8a8a93" alt="نسخه ۰.۲.۰"/>
  <img src="https://img.shields.io/badge/Cloudflare-Workers-f38020?logo=cloudflare&logoColor=white" alt="پلتفرم"/>
  <img src="https://img.shields.io/badge/protocols-VLESS%20%C2%B7%20Trojan%20%C2%B7%20WARP-6366f1" alt="پروتکل‌ها"/>
</p>

<p align="center"><img src="assets/hero.svg" width="100%" alt="Nika Net — نسخهٔ گرافیت"/></p>

<div align="center">
  <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/NikaTeem/Nika-Net">
    <img src="https://deploy.workers.cloudflare.com/button" alt="استقرار روی Cloudflare Workers"/>
  </a>
</div>

---

## <div dir="rtl">Nika Net چیست؟</div>

<div dir="rtl">

**Nika Net** یک پنل مدیریت و ورکر لبه است که Cloudflare Worker شما را به یک دروازهٔ مقاوم در برابر فیلترینگ با پشتیبانی از **VLESS**، **Trojan** و **WARP** تبدیل می‌کند. شما آن را روی اکانت رایگان Cloudflare خودتان مستقر می‌کنید — دامنه، پهنای باند و داده‌ها همه مال خودتان است. بدون سرور مشترک، بدون واسطه، بدون هزینه.

پنل دوزبانه (فارسی RTL + انگلیسی)، تم کلاسیک **گرافیت و مداد**، مدیریت چندکاربره و لینک اشتراک اختصاصی برای هر کاربر دارد.

</div>

## ✨ ویژگی‌ها

| | |
|---|---|
| ✏️ **تم گرافیت / کاغذ** | حال‌وهوای نوستالژیک و دست‌نویس — حاشیه‌های نقطه‌چین مدادی، بافت کاغذ، تایپوگرافی سریف و تایپرایتر، تم تاریک و روشن |
| 🌐 **دوزبانه و RTL** | فارسی و انگلیسی در یک پنل، با یک کلیک |
| 👥 **چندکاربره** | سهمیه (گیگابایت)، انقضا (روز)، فعال/غیرفعال و یک لینک خصوصی برای هر کاربر |
| 🔌 **خروجی چند فرمت** | Base64 (v2rayNG)، Clash/Mihomo، Sing-box و WireGuard (WARP) |
| 🛡️ **امنیت** | رمز ادمین هش‌شده با SHA-256، نشست امضاشده با HMAC، مسیر مخفی ادمین و استتار مسیرهای ناشناخته |
| ⚡ **بدون سرور** | کاملاً روی لبه اجرا می‌شود — پلن رایگان، مقیاس خودکار، بدون نگهداری |

## 🧭 پروتکل‌ها

| پروتکل | وضعیت | توضیح |
|---|---|---|
| **VLESS** | ✅ | پروتکل اصلی — روی WebSocket + TLS با خروجی `cloudflare:sockets` |
| **Trojan** | ✅ | پروتکل دوم — استتار بهتر، احراز هویت با SHA-224 |
| **WARP** | ✅ | خروجی کانفیگ WireGuard — تماس‌ها (UDP) و شرایط بحرانی |

> ⚠️ UDP توسط VLESS/Trojan روی ورکر منتقل نمی‌شود (محدودیت پلتفرم) — برای تماس صوتی/تصویری از WARP استفاده کنید.

## 🚀 نصب سریع

```bash
# ۱) دریافت پروژه
git clone https://github.com/NikaTeem/Nika-Net.git
cd Nika-Net

# ۲) نصب و ساخت
npm install
npm run build          # → dist/worker.js (یک فایل قابل استقرار)

# ۳) استقرار روی Cloudflare
npx wrangler login
npm run deploy
```

سپس `https://<your-worker>.workers.dev/admin` را باز کنید، در اولین ورود رمز ادمین را تعیین کنید و تمام.

### استقرار دستی (بدون CLI)

1. داشبورد Cloudflare → Workers & Pages → **Create Worker**.
2. محتوای `dist/worker.js` را paste کنید و **Save and Deploy** بزنید.
3. *(اختیاری)* یک **KV namespace** با binding نام `NIKA_KV` بسازید — یا دیتابیس **D1** با نام `NIKA_DB` و جدول `kv (key TEXT PRIMARY KEY, value TEXT)`.
4. مسیر `/admin` را باز کنید.

## 📁 ساختار پروژه

```
nika-net/
├── ui/index.html        ← پنل (تک‌فایل، بدون وابستگی خارجی، لوگو جاسازی‌شده)
├── assets/              ← لوگو و بنر (مستندات)
├── docs/index.html      ← لندینگ‌پیج (GitHub Pages)
├── src/
│   ├── worker.ts        ← نقطهٔ ورود: روتینگ + API + اشتراک + استتار
│   ├── types.ts         ← تایپ‌های مشترک
│   ├── settings.ts      ← لایهٔ ذخیره‌سازی (D1 / KV / حافظه)
│   ├── auth.ts          ← هش رمز + نشست امضاشده
│   ├── generators.ts    ← مولدهای base64 / clash / sing-box / wireguard
│   └── protocols/
│       ├── common.ts    ← ابزارهای WebSocket → TCP
│       ├── vless.ts     ← هندلر VLESS روی WebSocket
│       └── trojan.ts    ← هندلر Trojan روی WebSocket (SHA-224)
├── scripts/build.js     ← esbuild → یک dist/worker.js واحد
├── wrangler.jsonc       ← پیکربندی Cloudflare
├── package.json / tsconfig.json
├── ROADMAP.md
└── README.md / README.fa.md / LICENSE
```

## 🔌 API

| مسیر | توضیح |
|---|---|
| `/admin` | پنل مدیریت |
| `POST /api/login` | ورود (اولین بار: تعیین رمز) |
| `GET /api/status` | وضعیت پنل (نیازمند نشست) |
| `GET/POST/DELETE /api/users` | مدیریت کاربران |
| `GET/POST /api/settings` | خواندن/ذخیره تنظیمات |
| `GET /api/gen?id=<userId>` | تولید کانفیگ کاربر |
| `GET /sub/<token>` | اشتراک کاربر (Base64) |
| `GET /sub/<token>.yaml` | اشتراک Clash |
| `GET /sub/<token>.json` | اشتراک Sing-box |
| `GET /<uuid>` | دریافت کانفیگ با UUID کاربر |
| WS `?uuid=<u>&proto=vless\|trojan` | اتصال پروکسی |

## 🗺️ نقشهٔ راه

Fragment (ضد-DPI)، پریست اپراتورهای ایران (همراه اول/ایرانسل/رایتل/مخابرات)، اسکنر IP تمیز داخل پنل، ربات تلگرام، بکاپ JSON — در [ROADMAP.md](ROADMAP.md).

## 📜 مجوز

[MIT](LICENSE) — برای استفادهٔ شخصی و یادگیری آزاد است. مسئولیت استفاده با شماست.

</div>
