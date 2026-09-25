// Foydalanuvchi "Liga nabzi"da qidirib ko'rgan (standart 4 tadan tashqari)
// ligalar/turnirlar ro'yxatini eslab qoladi - shu tufayli soatlik avtomatik
// yangilanish nafaqat standart ligalarni, balki foydalanuvchi ko'rgan boshqa
// istalgan chempionatni ham yangilab turadi (API kvotasini tejash uchun
// dunyodagi 1000+ turnirning HAMMASI emas, faqat haqiqatda ko'rilganlari).

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "watched-leagues.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

function save(list) {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(list), "utf8");
  } catch (err) {
    console.error("[watchedLeagues] saqlashda xatolik:", err.message);
  }
}

function remember(leagueId, season) {
  const list = load();
  if (!list.some((w) => w.leagueId === leagueId && w.season === season)) {
    list.push({ leagueId, season });
    save(list);
  }
}

function getAll() {
  return load();
}

module.exports = { remember, getAll };
