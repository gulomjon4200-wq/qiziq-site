# Futbol Tahlil — lokal PWA

Bugungi/ertangi futbol o'yinlarini (Premier League, La Liga, Seriya A, Bundesliga)
tahlil qilib, forma, jarohatlar, o'zaro uchrashuvlar (H2H) va uy/mehmon omili asosida
g'alaba ehtimoli yuqori jamoani ko'rsatadigan ilova. Faqat sizning kompyuteringiz/telefoningizda,
lokal tarmoqda ishlaydi — internetga chiqarish shart emas.

Server har kuni belgilangan vaqtda (standart: soat 06:00) ma'lumotlarni **o'zi avtomatik
yangilab turadi** — buning uchun ilovani qayta ochish yoki ⟳ tugmasini bosish shart emas
(faqat server/kompyuter shu vaqtda ishlab turgan bo'lishi kerak). Batafsili: pastdagi
"5.1 Avtomatik kunlik yangilanish" bo'limi.

Ilovada "⚽ O'yinlar" bo'limidan tashqari **"📊 Liga nabzi"** bo'limi ham bor: tanlangan
liganing to'liq turnir jadvali (o'rin, o'ynagan/g'alaba/durang/mag'lubiyat, gollar farqi,
ochkolar) va har bir jamoaning so'nggi 5 o'yiniga qarab hisoblangan "nabzi" — 🔥 Yuqori
nabz / 📈 Barqaror / 📉 Pasaymoqda / ❄️ Past nabz ko'rinishida.

"Liga nabzi" standart 4 ta klub ligasi (Premer-liga, La Liga, Seriya A, Bundesliga)
bilan cheklanmaydi — dunyodagi **barcha** chempionatlar/turnirlar (klub ligalari,
kubok musobaqalari, milliy terma jamoalar musobaqalari, jumladan "Jahon
chempionati saralash" kabilar) ro'yxati bir marta yuklab olinadi va qidiruv
maydonchasida nomi yoki davlati bo'yicha (masalan "Braziliya", "Jahon
chempionati") lahzada filtrlanadi.

Bundan tashqari, "Liga nabzi" ma'lumotlari standart holatda **har soatda**
avtomatik yangilanadi (standart 4 liga + siz oldin ko'rgan boshqa istalgan
turnir) — batafsili pastdagi "5.1" bo'limida.

> **Eslatma:** Bashoratlar oddiy statistik taxmin, hech qanday natija kafolati emas.
> Garov (bet) qarorlari uchun asos sifatida ishlatmang.

---

## 1. API-Football kalitini olish

1. https://dashboard.api-football.com/register sahifasiga kirib, bepul ro'yxatdan o'ting
   (email tasdiqlash talab qilinadi).
2. Tasdiqlagandan so'ng https://dashboard.api-football.com manzilida shaxsiy kabinetga kiring.
3. Bosh sahifada **"API-KEY"** deb yozilgan qatorda kalitingiz ko'rinadi (nusxa oling).
4. Bepul (Free) tarif kuniga taxminan **100 so'rov** beradi — shuning uchun ilova ma'lumotlarni
   agressiv keshlaydi (pastdagi "Kvota" bo'limiga qarang).

> Eslatma: API-Football ba'zan RapidAPI orqali ham taqdim etiladi, lekin bu ilova
> to'g'ridan-to'g'ri **api-sports.io** (dashboard.api-football.com) kalitiga mo'ljallangan.

---

## 2. O'rnatish

Talab: [Node.js](https://nodejs.org) 18+ versiyasi kompyuteringizda o'rnatilgan bo'lishi kerak.

```bash
cd football-analyzer
npm install
cp .env.example .env
```

`.env` faylini oching va `API_FOOTBALL_KEY` qatoriga o'z kalitingizni yozing:

```
API_FOOTBALL_KEY=sizning_haqiqiy_kalitingiz
```

Kerak bo'lsa `TIMEZONE`, `SEASON` va `DAILY_REFRESH_HOUR` qiymatlarini ham
moslashtiring (odatda standart qiymatlar yetarli).

---

## 3. Ishga tushirish

```bash
npm start
```

Konsolda shunday xabar chiqadi:

```
Futbol Tahlil server ishga tushdi: http://localhost:3000
```

Kompyuteringizda brauzer orqali `http://localhost:3000` manzilini oching.

### Telefoningizdan ochish (bir xil Wi-Fi tarmog'ida)

1. Kompyuteringizning lokal IP manzilini toping:
   - **Mac:** Terminal → `ipconfig getifaddr en0` (yoki Tizim sozlamalari → Tarmoq)
   - **Windows:** Buyruqlar satri → `ipconfig` → "IPv4 Address"
   - **Linux:** Terminal → `hostname -I`
2. Telefon va kompyuter **bir xil Wi-Fi tarmog'ida** bo'lishi shart.
3. Telefon brauzerida `http://<KOMPYUTER_IP>:3000` manzilini oching (masalan `http://192.168.1.24:3000`).
4. **iPhone (Safari):** pastdagi ulashish (share) tugmasi → **"Bosh ekranga qo'shish"**
   ("Add to Home Screen"). Endi ilova alohida ikonka sifatida ochiladi.
5. **Android (Chrome):** menyu (⋮) → **"Bosh ekranga qo'shish" / "Ilovani o'rnatish"**.

> Izoh: telefon lokal IP orqali (HTTP, HTTPS emas) ulanganda, iOS Safari xavfsizlik
> siyosati tufayli offline-kesh (service worker) to'liq ishlamasligi mumkin — bu muammo
> emas, chunki ilova baribir jonli ma'lumot uchun serveringizga (va u orqali internetga)
> ulanishi kerak. Ilova ikonkasi, standalone (to'liq ekran) rejim va asosiy funksiya
> baribir ishlaydi.

Kompyuteringiz o'chirilsa yoki `npm start` to'xtatilsa, ilova ishlamay qoladi — bu
lokal ilova bo'lgani uchun normal holat. Keyingi safar ishlatishdan oldin qayta
`npm start` qiling.

---

## 4. Ishlash mantig'i (qisqacha)

Har bir o'yin uchun orqa fonda (foydalanuvchiga ko'rsatilmaydi):

- Har ikkala jamoaning so'nggi 5 o'yin natijalari (forma)
- Jarohatlangan/o'ynamaydigan asosiy o'yinchilar soni
- O'zaro uchrashuvlar tarixi (H2H)
- Uy/mehmon omili

Shu omillar vaznlangan holda birlashtirilib, har bir jamoa uchun nisbiy kuch bahosi
chiqariladi. Farq kichik bo'lsa — "Teng kuch" ko'rsatiladi. Foydalanuvchiga faqat
yakuniy natija, 1-2 qisqa sabab va (xohlasa) "Batafsil" tugmasi orqali forma/jarohat/H2H
tafsilotlari ko'rsatiladi.

---

## 5. API kvotasini tejash (kesh)

Bepul tarifning kunlik ~100 so'rov limitiga urilib qolmaslik uchun ilova natijalarni
diskka (`data/cache.json`) keshlaydi:

| Ma'lumot turi | Kesh muddati |
|---|---|
| Kunlik o'yinlar ro'yxati | 6 soat |
| Jamoa formasi (so'nggi 5 o'yin) | 24 soat |
| Jarohatlar | 12 soat |
| O'zaro uchrashuvlar (H2H) | 7 kun |
| Liga nabzi (turnir jadvali) | 1 soat |
| Chempionatlar katalogi / qidiruv | 24 soat |

Ekranning tepasidagi ⟳ tugmasi bosilsa, keshni chetlab o'tib ma'lumotlar qayta
yuklanadi (buni faqat kerak bo'lganda bosing — har safar bosish kvotangizni tezroq
sarflaydi). Ekran pastida qolgan kunlik so'rovlar soni ko'rsatiladi ("Kvota").

---

## 5.1 Avtomatik kunlik yangilanish

Qo'lda ⟳ tugmasini bosishga hojat qoldirmaslik uchun server o'zi **har kuni bir marta**,
`.env` faylidagi `DAILY_REFRESH_HOUR` da ko'rsatilgan mahalliy vaqtda (standart — `6`,
ya'ni soat 06:00, `TIMEZONE` bo'yicha), "Bugun" va "Ertaga" o'yinlarini keshni chetlab
o'tib qayta yuklaydi va qayta tahlil qiladi.

Muhim jihatlar:

- Bu ishlashi uchun `npm start` bilan ishga tushirilgan server **doim ishlab turishi**
  kerak (kompyuterni o'chirsangiz yoki serverni to'xtatsangiz, avtomatik yangilanish
  ham to'xtaydi — keyin qayta `npm start` qilganingizda, agar bugun uchun hali
  yangilanish bo'lmagan bo'lsa, server darhol bir marta yangilaydi).
- Har bir server qayta ishga tushishida bugun uchun allaqachon yangilangan bo'lsa,
  qayta so'rov yubormaydi — bu API kvotasini ortiqcha sarflamaslik uchun.
- Sahifa pastidagi **"Oxirgi avtomatik yangilanish"** yozuvidan oxirgi muvaffaqiyatli
  (yoki xatolik bilan tugagan) avtomatik yangilanish vaqtini ko'rishingiz mumkin.
- Kompyuteringizni doim yoqib qo'yishni istamasangiz, buni kichik bir Raspberry Pi,
  eski noutbuk yoki uy serverida `npm start` (yoki `pm2 start server/index.js`) bilan
  doimiy ishlatib qo'yish mumkin.

### "Liga nabzi"ning soatlik yangilanishi

Standart 4 liga va siz "Liga nabzi" qidiruvi orqali oldin ko'rgan istalgan
boshqa chempionat/terma jamoalar turniri `.env` faylidagi
`LEAGUE_REFRESH_INTERVAL_MINUTES` (standart — `60`, ya'ni har soat) da
avtomatik qayta yuklanadi. Sahifadagi "📊 Liga nabzi" bo'limi pastida oxirgi
avtomatik yangilanish vaqti ko'rsatiladi.

> **Muhim (API kvotasi haqida):** Dunyoda 1000 dan ortiq chempionat/turnir
> mavjud — ularning **hammasini** har soat so'rash bepul tarifning kunlik
> ~100 so'rov limitini zumda tugatib qo'yadi. Shuning uchun avtomatik
> yangilanish faqat standart 4 liga + siz shaxsan qidirib ko'rgan turnirlar
> uchun ishlaydi (boshqa hamma narsa — qidiruv orqali "Liga nabzi"da bir marta
> ochilgach, shundan keyin avtomatik yangilanadigan ro'yxatga qo'shiladi).
> Hattoki shu holatda ham, standart 4 liganing o'zi har soat yangilansa,
> kuniga ~96 so'rov sarflanadi — bu deyarli butun bepul kvotani egallaydi.
> Agar "429" xatolari ko'p chiqsa, `LEAGUE_REFRESH_INTERVAL_MINUTES` qiymatini
> oshiring (masalan `180` — har 3 soatda, yoki `360` — har 6 soatda), yoki
> API-Football'ning pullik tarifiga o'ting.

---

## 6. Muammolarni bartaraf etish

- **"API_FOOTBALL_KEY sozlanmagan" xatosi:** `.env` faylida kalit to'g'ri yozilganini
  tekshiring, so'ng serverni qayta ishga tushiring (`npm start`).
- **O'yinlar ro'yxati bo'sh:** Tanlangan kunda tanlangan 4 liganing hech birida o'yin
  bo'lmasligi mumkin (masalan, hafta o'rtasida yoki mavsum oralig'ida tanaffus bo'lishi
  mumkin). "Ertaga" bo'limini ham tekshiring.
  Agar `SEASON` noto'g'ri sozlangan bo'lsa, `.env` faylida uni bo'sh qoldiring —
  server joriy sanaga qarab avtomatik hisoblaydi.
- **"429" yoki kvota xatosi:** Kunlik limit tugagan. Ertasi kuni (UTC bo'yicha
  yangilanadi) qayta urinib ko'ring, yoki keshdagi eski ma'lumot bilan davom eting.
- **Telefondan ochilmayapti:** Kompyuter va telefon bir xil Wi-Fi tarmog'ida ekanligini,
  hamda kompyuteringiz xavfsizlik devori (firewall) 3000-portni bloklamayotganini
  tekshiring.
- **Jarohatlar bo'limi bo'sh chiqmoqda:** Ba'zi kichikroq ligalar/mavsumlar uchun
  bepul tarifda jarohat ma'lumotlari to'liq bo'lmasligi mumkin — bu API tomonidagi
  cheklov, ilova xatosi emas.
- **"Avtomatik kunlik yangilanish hali ishlamagan" yozuvi ko'rinmoqda:** Server
  hali kuniga bir marta ham to'liq ishga tushmagan bo'lishi mumkin (masalan
  `API_FOOTBALL_KEY` sozlanmagan). Konsoldagi `[scheduler]` bilan boshlangan
  qatorlarni tekshiring.

---

## 7. Loyiha tuzilishi

```
football-analyzer/
├── server/
│   ├── index.js          # Express server + avtomatik yangilanishni ishga tushirish
│   ├── apiFootball.js     # API-Football bilan aloqa (throttle + kvota kuzatuvi)
│   ├── cache.js           # Fayl-asosli kesh
│   ├── scoring.js         # Bashorat mantig'i (forma/jarohat/H2H/uy-mehmon)
│   ├── scheduler.js       # Har kuni bir marta avtomatik yangilash rejalashtiruvchisi
│   └── routes/matches.js  # /api/matches, /api/status, getMatchesForDay()
├── public/
│   ├── index.html, style.css, app.js
│   ├── manifest.json, service-worker.js   # PWA
│   └── icons/
├── data/                  # kesh va holat fayllari (avtomatik yaratiladi)
├── .env.example
└── package.json
```
