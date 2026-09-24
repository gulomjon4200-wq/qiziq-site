// Tahlil qilinadigan ligalar ro'yxati va ular bilan bog'liq umumiy yordamchilar.
// Ham /api/matches (server/routes/matches.js), ham /api/standings
// (server/routes/standings.js) shu ro'yxatdan foydalanadi.

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

module.exports = { LEAGUES, LEAGUE_IDS, LEAGUE_NAME_BY_ID, getSeason };
