const express = require("express");
const apiFootball = require("../apiFootball");
const cache = require("../cache");
const scoring = require("../scoring");
const { LEAGUES, LEAGUE_IDS, getSeason } = require("../leagues");

const router = express.Router();

// Bitta liga uchun "Liga nabzi" jadvalini tayyorlaydi: turnir jadvali +
// har bir jamoaning so'nggi o'yinlardagi "nabzi" (forma ko'rsatkichi).
// Bu funksiya ham /api/standings marshruti, ham kunlik avtomatik
// yangilanish rejalashtiruvchisi (server/scheduler.js) tomonidan ishlatiladi.
// `seasonOverride` - qidiruv orqali topilgan boshqa turnirlar uchun
// (ular klub ligalari kabi avgust-iyul mavsum siklida bo'lmasligi mumkin).
async function getStandingsForLeague(leagueId, force, seasonOverride) {
  const season = seasonOverride || getSeason();

  const standingsRes = await cache.remember(
    `standings:${leagueId}:${season}`,
    cache.TTL.STANDINGS,
    () => apiFootball.getStandings(leagueId, season),
    force
  );

  const leagueData = (standingsRes.value || [])[0];
  const groups = (leagueData && leagueData.league && leagueData.league.standings) || [];
  const table = groups.flat();

  const rows = table.map((entry) => {
    const pulse = scoring.pulseFromFormString(entry.form);
    return {
      rank: entry.rank,
      team: {
        id: entry.team.id,
        name: entry.team.name,
        logo: entry.team.logo,
      },
      played: entry.all.played,
      win: entry.all.win,
      draw: entry.all.draw,
      lose: entry.all.lose,
      goalsFor: entry.all.goals.for,
      goalsAgainst: entry.all.goals.against,
      goalsDiff: entry.goalsDiff,
      points: entry.points,
      pulse,
    };
  });

  return {
    league: leagueData
      ? { id: leagueData.league.id, name: leagueData.league.name, logo: leagueData.league.logo }
      : null,
    season,
    standings: rows,
    quota: apiFootball.getStatus(),
  };
}

router.get("/standings", async (req, res) => {
  const requestedLeague = Number(req.query.league) || null;
  const requestedSeason = Number(req.query.season) || null;
  const force = req.query.force === "true";
  const isKnownLeague = LEAGUE_IDS.has(requestedLeague);

  // Bizning 4 ta doimiy liga uchun mavsum avtomatik hisoblanadi. Qidiruv
  // orqali topilgan boshqa turnir uchun esa frontend mavsumni aniq
  // ko'rsatishi shart (ular klub ligasi siklida bo'lmasligi mumkin).
  if (requestedLeague && !isKnownLeague && !requestedSeason) {
    return res.status(400).json({ error: "Bu liga uchun 'season' parametri kerak." });
  }

  const leagueId = requestedLeague || LEAGUES[0].id;

  try {
    const payload = await getStandingsForLeague(leagueId, force, requestedSeason);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Nomi bo'yicha istalgan turnir/liga qidirish (masalan "Jahon chempionati
// saralash") - "Liga nabzi"ni faqat 4 ta klub ligasi bilan cheklab qo'ymaslik
// uchun. API-Football'ning umumiy /leagues qidiruvidan foydalanadi.
router.get("/leagues/search", async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (query.length < 3) {
    return res.status(400).json({ error: "Qidiruv uchun kamida 3 ta harf kiriting." });
  }

  try {
    const results = await cache.remember(
      `league-search:${query.toLowerCase()}`,
      cache.TTL.LEAGUE_SEARCH,
      () => apiFootball.searchLeagues(query)
    );

    const items = (results.value || []).map((item) => {
      const seasons = item.seasons || [];
      const currentSeason = seasons.find((s) => s.current) || seasons[seasons.length - 1];
      return {
        id: item.league.id,
        name: item.league.name,
        logo: item.league.logo,
        country: item.country && item.country.name,
        season: currentSeason ? currentSeason.year : null,
      };
    });

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, getStandingsForLeague };
