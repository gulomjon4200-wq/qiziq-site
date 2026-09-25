// API-Football (v3.football.api-sports.io) bilan ishlash uchun qatlam.
// Barcha tashqi so'rovlar shu yerdan o'tadi - shu tufayli so'rovlarni
// sekinlashtirish (throttling) va kvota (quota) kuzatuvini markazlashtiramiz.

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const BASE_URL = "https://v3.football.api-sports.io";
const STATUS_FILE = path.join(__dirname, "..", "data", "status.json");

const REQUEST_DELAY_MS = Number(process.env.API_REQUEST_DELAY_MS || 350);

let lastRequestTime = 0;
let quota = loadStatus();

function loadStatus() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, "utf8"));
  } catch {
    return { remaining: null, limit: null, lastUpdated: null, lastError: null };
  }
}

function saveStatus() {
  try {
    fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true });
    fs.writeFileSync(STATUS_FILE, JSON.stringify(quota), "utf8");
  } catch (err) {
    console.error("[apiFootball] status saqlanmadi:", err.message);
  }
}

function getStatus() {
  return quota;
}

async function throttle() {
  const elapsed = Date.now() - lastRequestTime;
  if (elapsed < REQUEST_DELAY_MS) {
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * API-Football'ga xom (raw) so'rov yuboradi.
 * endpoint masalan: "/fixtures", params - query parametrlar.
 */
async function request(endpoint, params = {}) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey || apiKey === "BU_YERGA_APIKEYNI_YOZING") {
    throw new Error(
      "API_FOOTBALL_KEY sozlanmagan. .env faylida API kalitingizni kiriting (README.md'ga qarang)."
    );
  }

  await throttle();

  try {
    const res = await axios.get(`${BASE_URL}${endpoint}`, {
      params,
      headers: { "x-apisports-key": apiKey },
      timeout: 15000,
    });

    // Kvota ma'lumotini header'lardan o'qib olamiz (mavjud bo'lsa)
    const remaining = res.headers["x-ratelimit-requests-remaining"];
    const limit = res.headers["x-ratelimit-requests-limit"];
    if (remaining !== undefined) {
      quota = {
        remaining: Number(remaining),
        limit: limit !== undefined ? Number(limit) : quota.limit,
        lastUpdated: new Date().toISOString(),
        lastError: null,
      };
      saveStatus();
    }

    if (res.data && Array.isArray(res.data.errors) && res.data.errors.length) {
      throw new Error(
        typeof res.data.errors === "object"
          ? JSON.stringify(res.data.errors)
          : String(res.data.errors)
      );
    }
    if (res.data && res.data.errors && typeof res.data.errors === "object" && !Array.isArray(res.data.errors)) {
      const keys = Object.keys(res.data.errors);
      if (keys.length) {
        throw new Error(JSON.stringify(res.data.errors));
      }
    }

    return res.data.response || [];
  } catch (err) {
    if (err.response) {
      quota.lastError = `${err.response.status}: ${JSON.stringify(err.response.data)}`;
      saveStatus();
      throw new Error(
        `API-Football xatosi (${err.response.status}): ${JSON.stringify(err.response.data).slice(0, 300)}`
      );
    }
    quota.lastError = err.message;
    saveStatus();
    throw err;
  }
}

// --- Yuqori darajadagi (high-level) chaqiruvlar ---

function getFixturesByDate(date, timezone) {
  return request("/fixtures", { date, timezone });
}

function getTeamLastFixtures(teamId, count = 5) {
  return request("/fixtures", { team: teamId, last: count });
}

function getInjuriesByFixture(fixtureId) {
  return request("/injuries", { fixture: fixtureId });
}

function getHeadToHead(teamAId, teamBId, count = 10) {
  return request("/fixtures/headtohead", { h2h: `${teamAId}-${teamBId}`, last: count });
}

function getStandings(league, season) {
  return request("/standings", { league, season });
}

function searchLeagues(query) {
  return request("/leagues", { search: query });
}

module.exports = {
  getFixturesByDate,
  getTeamLastFixtures,
  getInjuriesByFixture,
  getHeadToHead,
  getStandings,
  searchLeagues,
  getStatus,
};
