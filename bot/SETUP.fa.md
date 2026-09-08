<div dir="rtl">

# 🤖 Nika Net Launcher — راهنمای کامل راه‌اندازی

ربات تلگرامی که روی Cloudflare Workers (رایگان) اجرا می‌شود و برایت پنل Nika Net می‌سازد.

---

## قدم ۱ — ساخت ربات تلگرام (روی گوشی/دسکتاپ)

1. در تلگرام به **[@BotFather](https://t.me/BotFather)** برو و `Start` بزن.
2. دستور `/newbot` را بفرست.
3. یک **اسم** برای ربات بده (مثلاً `Nika Net Launcher`).
4. یک **یوزرنیم** بده که با `bot` تمام شود (مثلاً `NikaNetLauncher_bot` — اگر گرفته بود، یک عدد اضافه کن).
5. BotFather یک **توکن** به تو می‌دهد، شبیه:
   `123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
6. این توکن را کپی کن — در قدم آخر می‌فرستی.

---

## قدم ۲ — ساخت توکن Cloudflare (با دسترسی‌های آماده)

روی این لینک بزن — **همهٔ دسترسی‌های لازم از قبل تیک خورده‌اند**:

> 🔗 https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22workers_kv_storage%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22workers_routes%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22user_details%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22memberships%22%2C%22type%22%3A%22read%22%7D%5D&accountId=*&zoneId=all&name=Nika%20Net

سپس فقط:
1. **Continue to summary** را بزن
2. **Create Token** را بزن
3. توکن ساخته‌شده را کپی کن

> ⚠️ اگر اول وارد داشبورد Cloudflare نیستی، اول login کن و بعد دوباره لینک را باز کن.

---

## قدم ۳ — ارسال توکن‌ها

دو توکن را بفرست:
- توکن **ربات تلگرام** (از قدم ۱)
- توکن **Cloudflare** (از قدم ۲)

بقیه‌اش با ماست: ربات روی اکانت Cloudflare خودت مستقر می‌شود و webhook وصل می‌شود.

---

## نحوهٔ کار ربات بعد از راه‌اندازی

1. `/start` بزن → منوی اصلی
2. **🔑 لینک مستقیم توکن** → صفحهٔ ساخت توکن با دسترسی‌های آماده
3. توکن را بفرست → ربات می‌پرسد **«ذخیره کنم؟»** با دو دکمهٔ **بله / نه**
4. **🚀 ساخت پنل جدید** → اسم پنل را بفرست → پنل ساخته می‌شود و آدرس `/admin` را می‌دهد

### امنیت
- توکن‌ها با **AES-GCM** (کلید مخفی Worker) رمزنگاری و در KV ذخیره می‌شوند.
- توکن هر کاربر فقط برای خودش است (حالت چندکاربره هم کار می‌کند).

### فایل‌ها
| فایل | نقش |
|---|---|
| `bot/src/worker.ts` | ورودی Worker (webhook تلگرام) |
| `bot/src/flow.ts` | ماشین حالت مکالمه |
| `bot/src/ui.ts` | پیام‌ها و کیبوردهای زیبا |
| `bot/src/cloudflare.ts` | API کلودفلر (توکن، ورکر، KV، زیردامنه) |
| `bot/src/crypto.ts` | رمزنگاری AES-GCM |
| `bot/scripts/build.js` | باندل + جاسازی کد پنل |
| `bot/scripts/deploy.mjs` | استقرار خودکار روی Cloudflare |

</div>
