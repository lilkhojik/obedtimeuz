# ObedTime — sayt + backend + admin panel

To'liq ishlaydigan tizim: ochiq sayt (statik emas — Node.js backend orqali),
ma'lumotlar bazasi (SQLite), va faqat sizga ma'lum bo'lgan manzilda joylashgan
himoyalangan admin panel.

## Nima ichida bor

```
obedtime/
  server.js           — asosiy server (Express)
  db.js                — SQLite sxemasi va boshlang'ich ma'lumotlar
  auth.js               — login, sessiya, urinishlarni cheklash
  mailer.js, telegram.js — email va Telegram orqali xabar yuborish
  default-content.js    — saytning standart matnlari (UZ/RU)
  scripts/create-admin.js — admin login/parolni yaratish skripti
  public/               — ochiq sayt (HTML/CSS/JS)
  views/admin.html       — admin panel (faqat maxfiy manzilda ochiladi)
  uploads/               — yuklangan taom rasmlari
  data/                  — SQLite ma'lumotlar bazasi fayli (avtomatik yaratiladi)
  .env.example           — sozlamalar namunasi
```

## 1. O'rnatish (birinchi marta)

```bash
npm install
cp .env.example .env
```

`.env` faylini oching va quyidagilarni to'ldiring:

- `SESSION_SECRET` — uzun tasodifiy qator. Yaratish uchun:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `ADMIN_PANEL_PATH` — admin panel manzili, masalan `/mening-boshqaruvim-9x2k`.
  Bu manzil hech qayerda ko'rsatilmaydi va sayt ichida havola yo'q — faqat
  o'zingiz biladigan manzil bo'ladi. Uni murakkabroq va faqat o'zingizga
  ma'lum qilib qo'ying.
- `BASE_URL` — saytingiz manzili (production'da haqiqiy domen).

Keyin admin hisobingizni yarating (login va parolni o'zingiz tanlaysiz,
parol kamida 8 belgidan iborat bo'lishi kerak):

```bash
npm run create-admin -- kh_admin ISHONCHLI_PAROLINGIZ
```

Serverni ishga tushiring:

```bash
npm start
```

Sayt: `http://localhost:3000`
Admin panel: `http://localhost:3000` + ADMIN_PANEL_PATH qiymatingiz

## 2. Saytga kirish va admin panelga kirish

- **Ochiq sayt** — har kim `obedtime.uz` manzilida ko'radi, hech qanday
  parol talab qilinmaydi.
- **Admin panel** — faqat siz bilgan maxfiy manzilda joylashgan (masalan
  `obedtime.uz/mening-boshqaruvim-9x2k`). U yerga kirganda ham login/parol
  so'raladi. Bu manzilni hech kimga bermang, footer yoki menyuda havola
  yo'q — shuning uchun uni faqat siz bilasiz.

## 3. Email va Telegram orqali xabar olish

Admin panel → **Sozlamalar** bo'limida:

- **Email**: SMTP ma'lumotlaringizni kiriting (Gmail bo'lsa oddiy parol
  emas, "App password" kerak: Google hisobingiz → Xavfsizlik → Ilova
  parollari). Qabul qiluvchi emailni kiriting.
- **Telegram**: `@BotFather` orqali yangi bot yarating, tokenni oling.
  O'z chat ID'ingizni bilish uchun `@userinfobot` ga yozing.

Bu ma'lumotlar **faqat serverda**, ma'lumotlar bazasida saqlanadi — sayt
kodida yoki brauzerda umuman ko'rinmaydi. Bu avvalgi (faqat HTML) versiyadan
farqli — token endi hech kimga ochiq emas.

Maydonlarni bo'sh qoldirsangiz, so'rovlar shunchaki admin panelning
"So'rovlar" bo'limida saqlanaveradi — hech narsa yo'qolmaydi.

## 4. Joylashtirish (deploy)

Bu — to'liq Node.js dasturi, shuning uchun uni ishlatish uchun uni biror
serverda ishga tushirish kerak (statik hosting endi yetarli emas). Eng
oddiy variantlar:

- **Render.com** yoki **Railway.app** — bepul/arzon tarif, GitHub
  repodan avtomatik deploy, muhit o'zgaruvchilarini (`.env` qiymatlarini)
  saytning "Environment Variables" bo'limiga kiritasiz.
- **VPS** (masalan Timeweb, Beget, Hetzner) — Node.js o'rnatilgan server,
  `pm2` orqali doimiy ishlatish:
  ```bash
  npm install -g pm2
  pm2 start server.js --name obedtime
  pm2 save
  ```
  va oldiga Nginx qo'yib, HTTPS uchun Let's Encrypt sertifikat olinadi.

Production'da albatta:
- `COOKIE_SECURE=true` qiling (sayt HTTPS orqali ishlaganda).
- `.env` faylini hech qayerga (GitHub'ga ham) yubormang.

## 5. Xavfsizlik haqida — ochiq va halol

- Parol bazada **hash** holida saqlanadi (bcrypt), hech qayerda ochiq
  matn sifatida yo'q.
- Login urinishlari cheklangan: 5 marta xato — 15 daqiqaga bloklanadi.
- Sessiyalar server tomonida saqlanadi (8 soatdan keyin avtomatik tugaydi),
  cookie faqat HTTP orqali o'qiladi (JavaScript orqali o'g'irlab bo'lmaydi).
- Admin panelning manzili yashirin — lekin **"yashirin manzil" o'zi
  xavfsizlik emas**, u faqat qo'shimcha to'siq. Asosiy himoya — login,
  parol va bloklash tizimi. Manzilni baribir hech kimga aytmang.
- Email/Telegram sozlamalari faqat serverda — brauzer orqali ko'rinmaydi.
- To'liq "mukammal" xavfsizlik uchun qo'shimcha qadamlar bor edi (2FA,
  IP-whitelisting, avtomatik zaxira nusxalash va h.k.) — agar kerak bo'lsa,
  keyinroq qo'shish mumkin.

## 6. Nima o'zgardi (avvalgi versiyaga nisbatan)

- Endi bitta HTML fayl emas — to'liq server, ma'lumotlar barcha
  qurilmalar/brauzerlar uchun umumiy (avval faqat sizning brauzeringizda
  saqlanardi).
- Parol endi haqiqatan ham himoyalangan (hash + bloklash), avvalgi versiyada
  parol sahifa kodida ochiq turardi.
- Admin panel endi saytdan havola qilinmagan, maxfiy manzilda.
- Email/Telegram integratsiyasi endi haqiqatan ishlaydi (server orqali),
  token va parollar brauzerga chiqmaydi.
