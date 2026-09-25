require("dotenv").config();

const express = require("express");
const path = require("path");
const matches = require("./routes/matches");
const standings = require("./routes/standings");
const scheduler = require("./scheduler");

const app = express();
const PORT = process.env.PORT || 3000;
const TIMEZONE = process.env.TIMEZONE || "Asia/Tashkent";
const DAILY_REFRESH_HOUR = Number(process.env.DAILY_REFRESH_HOUR || 6);
const LEAGUE_REFRESH_INTERVAL_MINUTES = Number(process.env.LEAGUE_REFRESH_INTERVAL_MINUTES || 60);

function hasApiKey() {
  return Boolean(process.env.API_FOOTBALL_KEY && process.env.API_FOOTBALL_KEY !== "BU_YERGA_APIKEYNI_YOZING");
}

app.use(express.json());

// Statik fayllar (frontend, PWA manifest, service worker)
app.use(express.static(path.join(__dirname, "..", "public")));

// API marshrutlari
app.use("/api", matches.router);
app.use("/api", standings.router);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, hasApiKey: hasApiKey() });
});

// Kunlik avtomatik yangilanishning oxirgi holati (frontendda ko'rsatish uchun)
app.get("/api/auto-refresh", (req, res) => {
  res.json(scheduler.getLastRun());
});

// "Liga nabzi"ning soatlik avtomatik yangilanishi oxirgi holati
app.get("/api/auto-refresh/leagues", (req, res) => {
  res.json(scheduler.getLastIntervalRun());
});

app.listen(PORT, () => {
  console.log(`\nFutbol Tahlil server ishga tushdi: http://localhost:${PORT}`);
  console.log(`Telefoningizdan ochish uchun kompyuteringizning lokal IP manzilidan foydalaning (README.md'ga qarang).\n`);

  if (!hasApiKey()) {
    console.warn("OGOHLANTIRISH: API_FOOTBALL_KEY sozlanmagan. .env faylini tekshiring.");
    return;
  }

  // Har kuni belgilangan soatda (server ishlab turgan bo'lsa) "bugun" va "ertaga"
  // o'yinlarini keshni chetlab o'tib majburan qayta yuklaydi - shu tufayli
  // foydalanuvchi ilovani ochmasa ham, ma'lumot avtomatik yangilanib turadi.
  scheduler.start({
    hour: DAILY_REFRESH_HOUR,
    timezone: TIMEZONE,
    task: async () => {
      await matches.getMatchesForDay("today", true);
      await matches.getMatchesForDay("tomorrow", true);
    },
  });
  console.log(`Avtomatik kunlik yangilanish yoqildi: har kuni soat ${DAILY_REFRESH_HOUR}:00 (${TIMEZONE}).`);

  // "Liga nabzi": standart 4 liga + foydalanuvchi qidirib ko'rgan barcha
  // boshqa ligalar/turnirlar har `LEAGUE_REFRESH_INTERVAL_MINUTES` daqiqada
  // (standart - 60, ya'ni har soat) qayta yuklanadi. `force` berilmaydi -
  // kesh TTL (1 soat) ning o'zi buni ta'minlaydi, shu bilan birga bir
  // vaqtning o'zida qo'lda bosilgan ⟳ bilan qo'shaloq so'rov yubormaydi.
  scheduler.startInterval({
    intervalMs: LEAGUE_REFRESH_INTERVAL_MINUTES * 60 * 1000,
    label: "Liga nabzi avtomatik yangilanishi",
    task: () => standings.refreshWatchedLeagues(false),
  });
  console.log(`"Liga nabzi" avtomatik yangilanishi yoqildi: har ${LEAGUE_REFRESH_INTERVAL_MINUTES} daqiqada.`);
});
