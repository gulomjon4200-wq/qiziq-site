require("dotenv").config();

const express = require("express");
const path = require("path");
const matches = require("./routes/matches");
const standings = require("./routes/standings");
const scheduler = require("./scheduler");
const { LEAGUES } = require("./leagues");

const app = express();
const PORT = process.env.PORT || 3000;
const TIMEZONE = process.env.TIMEZONE || "Asia/Tashkent";
const DAILY_REFRESH_HOUR = Number(process.env.DAILY_REFRESH_HOUR || 6);

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
      for (const league of LEAGUES) {
        await standings.getStandingsForLeague(league.id, true);
      }
    },
  });
  console.log(`Avtomatik kunlik yangilanish yoqildi: har kuni soat ${DAILY_REFRESH_HOUR}:00 (${TIMEZONE}).`);
});
