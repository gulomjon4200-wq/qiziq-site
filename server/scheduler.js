// Har kuni belgilangan mahalliy vaqtda (masalan soat 06:00) ma'lumotlarni
// avtomatik ravishda (foydalanuvchi ilovani ochmasa ham) yangilab turadigan
// oddiy rejalashtiruvchi. Holat data/auto-refresh.json fayliga saqlanadi -
// shu tufayli server qayta ishga tushirilsa ham, bugun allaqachon
// yangilangan bo'lsa, qayta-qayta so'rov yubormaydi (API kvotasini tejaydi).

const fs = require("fs");
const path = require("path");

const STATUS_FILE = path.join(__dirname, "..", "data", "auto-refresh.json");

function readLastRun() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, "utf8"));
  } catch {
    return { lastRunAt: null, lastLocalDate: null, lastError: null, reason: null };
  }
}

function writeLastRun(info) {
  try {
    fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true });
    fs.writeFileSync(STATUS_FILE, JSON.stringify(info), "utf8");
  } catch (err) {
    console.error("[scheduler] holat saqlanmadi:", err.message);
  }
}

function zonedNow(timezone) {
  return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
}

function localDateKey(timezone) {
  const z = zonedNow(timezone);
  const y = z.getFullYear();
  const m = String(z.getMonth() + 1).padStart(2, "0");
  const d = String(z.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function msUntilNextRun(hour, timezone) {
  const zNow = zonedNow(timezone);
  const target = new Date(zNow);
  target.setHours(hour, 0, 0, 0);
  if (target <= zNow) target.setDate(target.getDate() + 1);
  return target.getTime() - zNow.getTime();
}

/**
 * Kunlik avtomatik yangilanishni ishga tushiradi.
 * - Server ishga tushganda: agar bugun uchun hali yangilanish bo'lmagan bo'lsa, darhol bajaradi.
 * - Shundan keyin har kuni `hour`:00 da (belgilangan timezone bo'yicha) qayta bajaradi.
 */
function start({ hour, timezone, task }) {
  async function runOnce(reason) {
    try {
      await task();
      writeLastRun({
        lastRunAt: new Date().toISOString(),
        lastLocalDate: localDateKey(timezone),
        lastError: null,
        reason,
      });
      console.log(`[scheduler] Kunlik avtomatik yangilanish bajarildi (${reason}).`);
    } catch (err) {
      writeLastRun({
        lastRunAt: new Date().toISOString(),
        lastLocalDate: localDateKey(timezone),
        lastError: err.message,
        reason,
      });
      console.error("[scheduler] Avtomatik yangilanishda xatolik:", err.message);
    }
  }

  function scheduleNext() {
    const delay = msUntilNextRun(hour, timezone);
    setTimeout(async () => {
      await runOnce("rejalashtirilgan kunlik vaqt");
      scheduleNext();
    }, delay);
  }

  const last = readLastRun();
  if (last.lastLocalDate !== localDateKey(timezone)) {
    runOnce("server ishga tushganda (bugun hali yangilanmagan)");
  } else {
    console.log("[scheduler] Bugun uchun avtomatik yangilanish allaqachon bajarilgan.");
  }

  scheduleNext();
}

function getLastRun() {
  return readLastRun();
}

module.exports = { start, getLastRun };
