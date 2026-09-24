// Oddiy fayl-asosli kesh (cache).
// Maqsad: API-Football bepul tarifidagi kunlik ~100 so'rov limitini tejash.
// Har bir kesh yozuvi TTL (necha millisekund amal qilishi) bilan saqlanadi.

const fs = require("fs");
const path = require("path");

const CACHE_FILE = path.join(__dirname, "..", "data", "cache.json");

function loadStore() {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function saveStore(store) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store), "utf8");
  } catch (err) {
    console.error("[cache] saqlashda xatolik:", err.message);
  }
}

let store = loadStore();

/**
 * Keshdan qiymat olish. Agar topilmasa yoki muddati o'tgan bo'lsa, null qaytaradi.
 */
function get(key) {
  const entry = store[key];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete store[key];
    return null;
  }
  return entry.value;
}

/**
 * Keshga qiymat yozish, ttlMs millisekund amal qiladi.
 */
function set(key, value, ttlMs) {
  store[key] = {
    value,
    expiresAt: Date.now() + ttlMs,
    savedAt: Date.now(),
  };
  saveStore(store);
}

/**
 * Kesh orqali funksiyani "wrap" qilish: agar keshda bor bo'lsa - undan,
 * bo'lmasa - fetcher() chaqirib, natijani keshlaydi.
 * force=true bo'lsa, keshni chetlab o'tib qayta yuklaydi.
 */
async function remember(key, ttlMs, fetcher, force = false) {
  if (!force) {
    const cached = get(key);
    if (cached !== null) return { value: cached, fromCache: true };
  }
  const value = await fetcher();
  set(key, value, ttlMs);
  return { value, fromCache: false };
}

const TTL = {
  FIXTURES: 6 * 60 * 60 * 1000, // 6 soat
  FORM: 24 * 60 * 60 * 1000, // 24 soat
  INJURIES: 12 * 60 * 60 * 1000, // 12 soat
  H2H: 7 * 24 * 60 * 60 * 1000, // 7 kun
  STANDINGS: 6 * 60 * 60 * 1000, // 6 soat
};

module.exports = { get, set, remember, TTL };
