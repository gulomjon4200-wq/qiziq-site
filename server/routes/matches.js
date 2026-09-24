const express = require("express");
const apiFootball = require("../apiFootball");
const cache = require("../cache");
const scoring = require("../scoring");

const router = express.Router();

// Tahlil qilinadigan ligalar (faqat shu 4 tasi)
const LEAGUES = [
  { id: 39, name: "Angliya Premer-ligasi" },
  { id: 140, name: "Ispaniya La Liga" },
  { id: 135, name: "Italiya Seriya A" },
  { id: 78, name: "Germaniya Bundesligasi" },
];
const LEAGUE_IDS = new Set(LEAGUES.map((l) => l.id));
const LEAGUE_NAME_BY_ID = Object.fromEntries(LEAGUES.map((l) => [l.id, l.name]));

function getSeason() {
  if (process.env.SEASON) return Number(process.env.SEASON);
  const now = new Date();
  const month = now.getMonth() + 1;
  return month >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

function dateStringFor(day, timezone) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
  if (day === "tomorrow") now.setDate(now.getDate() + 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function analyzeFixture(fixture, force) {
  const homeId = fixture.teams.home.id;
  const awayId = fixture.teams.away.id;
  const fixtureId = fixture.fixture.id;
  const h2hKey = `h2h:${Math.min(homeId, awayId)}-${Math.max(homeId, awayId)}`;

  // Navbat bilan (sequential) bajariladi - shunda apiFootball ichidagi
  // so'rovlar orasidagi kutish (throttle) to'g'ri ishlaydi va bir xil
  // jamoa/o'yin uchun ikki marta parallel so'rov yuborilmaydi.
  const homeFormRes = await cache.remember(
    `form:${homeId}`,
    cache.TTL.FORM,
    () => apiFootball.getTeamLastFixtures(homeId, 5),
    force
  );
  const awayFormRes = await cache.remember(
    `form:${awayId}`,
    cache.TTL.FORM,
    () => apiFootball.getTeamLastFixtures(awayId, 5),
    force
  );
  const injuriesRes = await cache.remember(
    `injuries:${fixtureId}`,
    cache.TTL.INJURIES,
    () => apiFootball.getInjuriesByFixture(fixtureId).catch(() => []),
    force
  );
  const h2hRes = await cache.remember(
    h2hKey,
    cache.TTL.H2H,
    () => apiFootball.getHeadToHead(homeId, awayId, 10).catch(() => []),
    force
  );

  const allInjuries = injuriesRes && injuriesRes.value ? injuriesRes.value : [];
  const homeInjuries = allInjuries.filter((i) => i.team && i.team.id === homeId);
  const awayInjuries = allInjuries.filter((i) => i.team && i.team.id === awayId);

  const evaluation = scoring.evaluateFixture({
    fixture,
    homeForm: homeFormRes.value || [],
    awayForm: awayFormRes.value || [],
    homeInjuries,
    awayInjuries,
    h2h: h2hRes.value || [],
  });

  return evaluation;
}

function baseFixtureInfo(fixture) {
  return {
    id: fixture.fixture.id,
    date: fixture.fixture.date,
    status: fixture.fixture.status.short,
    venue: fixture.fixture.venue && fixture.fixture.venue.name,
    league: {
      id: fixture.league.id,
      name: LEAGUE_NAME_BY_ID[fixture.league.id] || fixture.league.name,
      logo: fixture.league.logo,
    },
    home: {
      id: fixture.teams.home.id,
      name: fixture.teams.home.name,
      logo: fixture.teams.home.logo,
    },
    away: {
      id: fixture.teams.away.id,
      name: fixture.teams.away.name,
      logo: fixture.teams.away.logo,
    },
  };
}

router.get("/leagues", (req, res) => {
  res.json(LEAGUES);
});

router.get("/status", (req, res) => {
  res.json(apiFootball.getStatus());
});

// Bitta kun (bugun/ertaga) uchun o'yinlar ro'yxati va tahlilini tayyorlaydi.
// Bu funksiya ham /api/matches marshruti, ham kunlik avtomatik yangilanish
// rejalashtiruvchisi (server/scheduler.js) tomonidan ishlatiladi.
async function getMatchesForDay(day, force) {
  const timezone = process.env.TIMEZONE || "Asia/Tashkent";
  const date = dateStringFor(day, timezone);
  const season = getSeason();

  const fixturesRes = await cache.remember(
    `fixtures:${date}`,
    cache.TTL.FIXTURES,
    () => apiFootball.getFixturesByDate(date, timezone),
    force
  );

  const allFixtures = fixturesRes.value || [];
  const filtered = allFixtures.filter(
    (f) => LEAGUE_IDS.has(f.league.id) && f.league.season === season
  );

  // Agar mavsum filtri hech narsa qoldirmasa (masalan SEASON noto'g'ri sozlangan),
  // faqat liga bo'yicha filtrlab, kamida biror narsa ko'rsatishga harakat qilamiz.
  const finalList = filtered.length > 0 ? filtered : allFixtures.filter((f) => LEAGUE_IDS.has(f.league.id));

  const results = [];
  for (const fixture of finalList) {
    const info = baseFixtureInfo(fixture);
    try {
      const evaluation = await analyzeFixture(fixture, force);
      results.push({
        ...info,
        prediction: {
          favorite: evaluation.favorite,
          winnerName: evaluation.winnerName,
          reasons: evaluation.reasons,
        },
        details: evaluation.details,
        error: null,
      });
    } catch (err) {
      results.push({
        ...info,
        prediction: null,
        details: null,
        error: err.message,
      });
    }
  }

  results.sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    date,
    count: results.length,
    matches: results,
    quota: apiFootball.getStatus(),
  };
}

router.get("/matches", async (req, res) => {
  const day = req.query.day === "tomorrow" ? "tomorrow" : "today";
  const force = req.query.force === "true";

  try {
    const payload = await getMatchesForDay(day, force);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, getMatchesForDay };
