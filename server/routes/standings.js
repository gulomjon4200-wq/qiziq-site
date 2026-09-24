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
async function getStandingsForLeague(leagueId, force) {
  const season = getSeason();

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
  const requested = Number(req.query.league);
  const leagueId = LEAGUE_IDS.has(requested) ? requested : LEAGUES[0].id;
  const force = req.query.force === "true";

  try {
    const payload = await getStandingsForLeague(leagueId, force);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, getStandingsForLeague };
