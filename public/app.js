const state = {
  view: "matches",
  day: "today",
  league: null,
  season: null,
  leaguesLoaded: false,
};

const els = {
  loading: document.getElementById("loading"),
  errorBox: document.getElementById("errorBox"),
  emptyBox: document.getElementById("emptyBox"),
  matchList: document.getElementById("matchList"),
  quotaText: document.getElementById("quotaText"),
  autoRefreshText: document.getElementById("autoRefreshText"),
  refreshBtn: document.getElementById("refreshBtn"),
  tabs: document.querySelectorAll(".tab"),
  mainTabs: document.querySelectorAll(".main-tab"),
  matchesView: document.getElementById("matchesView"),
  standingsView: document.getElementById("standingsView"),
  leagueTabs: document.getElementById("leagueTabs"),
  standingsLoading: document.getElementById("standingsLoading"),
  standingsError: document.getElementById("standingsError"),
  standingsTableWrap: document.getElementById("standingsTableWrap"),
  leagueSearchForm: document.getElementById("leagueSearchForm"),
  leagueSearchInput: document.getElementById("leagueSearchInput"),
  leagueSearchResults: document.getElementById("leagueSearchResults"),
};

function showState({ loading = false, error = null, empty = false }) {
  els.loading.classList.toggle("hidden", !loading);
  els.errorBox.classList.toggle("hidden", !error);
  if (error) els.errorBox.textContent = error;
  els.emptyBox.classList.toggle("hidden", !empty);
}

function formatTime(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function winnerLabel(match) {
  if (!match.prediction) return null;
  const { favorite, winnerName } = match.prediction;
  if (favorite === "draw") return { text: "Teng kuch", cls: "draw" };
  return { text: `Ehtimoli yuqori g'olib: ${winnerName}`, cls: "" };
}

function renderDetails(match) {
  if (!match.details) return "";
  const { home, away, h2h } = match.details;

  const injuryText = (inj) =>
    inj.count === 0 ? "Muhim jarohat qayd etilmagan." : inj.names.join(", ");

  return `
    <div class="col">
      <h4>${escapeHtml(match.home.name)}</h4>
      <p><strong>Forma:</strong> ${escapeHtml(home.form.summary)}</p>
      <p><strong>Jarohatlar:</strong> ${escapeHtml(injuryText(home.injuries))}</p>
    </div>
    <div class="col">
      <h4>${escapeHtml(match.away.name)}</h4>
      <p><strong>Forma:</strong> ${escapeHtml(away.form.summary)}</p>
      <p><strong>Jarohatlar:</strong> ${escapeHtml(injuryText(away.injuries))}</p>
    </div>
    <div class="col h2h">
      <h4>O'zaro uchrashuvlar (H2H)</h4>
      <p>${escapeHtml(match.home.name)}: ${escapeHtml(h2h.home.summary)}</p>
      <p>${escapeHtml(match.away.name)}: ${escapeHtml(h2h.away.summary)}</p>
    </div>
  `;
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMatchCard(match) {
  const wrap = document.createElement("div");
  wrap.className = "match-card";

  const wl = winnerLabel(match);

  wrap.innerHTML = `
    <div class="match-league">
      <span>${escapeHtml(match.league.name)}</span>
      <span>${formatTime(match.date)}</span>
    </div>
    <div class="match-teams">
      <div class="team">
        <img src="${match.home.logo}" alt="${escapeHtml(match.home.name)}" loading="lazy" />
        <span class="team-name">${escapeHtml(match.home.name)}</span>
      </div>
      <div class="vs">VS</div>
      <div class="team">
        <img src="${match.away.logo}" alt="${escapeHtml(match.away.name)}" loading="lazy" />
        <span class="team-name">${escapeHtml(match.away.name)}</span>
      </div>
    </div>
    ${
      wl
        ? `<div class="prediction">
            <div class="winner ${wl.cls}">${wl.text === "Teng kuch" ? "⚖️" : "🏆"} ${escapeHtml(wl.text)}</div>
            <ul class="reasons">
              ${match.prediction.reasons.map((r) => `<li>• ${escapeHtml(r)}</li>`).join("")}
            </ul>
          </div>
          <button class="detail-toggle">Batafsil ▾</button>
          <div class="details hidden">${renderDetails(match)}</div>`
        : `<div class="no-analysis">Bu o'yin uchun tahlil ma'lumotlari olinmadi${match.error ? ": " + escapeHtml(match.error) : ""}.</div>`
    }
  `;

  const toggleBtn = wrap.querySelector(".detail-toggle");
  const detailsBox = wrap.querySelector(".details");
  if (toggleBtn && detailsBox) {
    toggleBtn.addEventListener("click", () => {
      const isHidden = detailsBox.classList.toggle("hidden");
      toggleBtn.textContent = isHidden ? "Batafsil ▾" : "Yopish ▴";
    });
  }

  return wrap;
}

function renderQuota(quota) {
  if (!quota || quota.remaining === null || quota.remaining === undefined) {
    els.quotaText.textContent = "Kvota: noma'lum";
    return;
  }
  els.quotaText.textContent = `Bugungi API so'rovlari: ${quota.remaining}${
    quota.limit ? " / " + quota.limit : ""
  } qoldi`;
}

async function loadAutoRefreshStatus() {
  try {
    const res = await fetch("/api/auto-refresh");
    const data = await res.json();

    if (!data || !data.lastRunAt) {
      els.autoRefreshText.textContent = "Avtomatik kunlik yangilanish hali ishlamagan.";
      return;
    }

    const text = new Date(data.lastRunAt).toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    els.autoRefreshText.textContent = data.lastError
      ? `Oxirgi avtomatik yangilanish: ${text} (xatolik: ${data.lastError})`
      : `Oxirgi avtomatik yangilanish: ${text}`;
  } catch {
    els.autoRefreshText.textContent = "";
  }
}

async function loadMatches(force = false) {
  showState({ loading: true });
  els.matchList.innerHTML = "";

  try {
    const res = await fetch(`/api/matches?day=${state.day}${force ? "&force=true" : ""}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Noma'lum xatolik");
    }

    renderQuota(data.quota);

    if (!data.matches || data.matches.length === 0) {
      showState({ empty: true });
      return;
    }

    showState({});
    data.matches.forEach((match) => {
      els.matchList.appendChild(renderMatchCard(match));
    });
  } catch (err) {
    showState({ error: `Xatolik: ${err.message}` });
  }
}

function setDay(day) {
  state.day = day;
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.day === day));
  loadMatches(false);
}

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => setDay(tab.dataset.day));
});

// --- "Liga nabzi" (turnir jadvali + jamoalar forma "nabzi") ---

function showStandingsState({ loading = false, error = null }) {
  els.standingsLoading.classList.toggle("hidden", !loading);
  els.standingsError.classList.toggle("hidden", !error);
  if (error) els.standingsError.textContent = error;
}

function pulseDotsHtml(pulse) {
  if (!pulse || !pulse.letters || pulse.letters.length === 0) {
    return '<span class="pulse-form"></span>';
  }
  return `<span class="pulse-form">${pulse.letters
    .map((l) => `<span class="${l}">${l}</span>`)
    .join("")}</span>`;
}

function renderStandingsTable(rows) {
  if (!rows || rows.length === 0) {
    els.standingsTableWrap.innerHTML = "";
    showStandingsState({ error: "Bu liga uchun jadval topilmadi." });
    return;
  }

  const body = rows
    .map(
      (row) => `
        <tr>
          <td>${row.rank}</td>
          <td class="team-cell">
            <img src="${row.team.logo}" alt="${escapeHtml(row.team.name)}" loading="lazy" />
            <span>${escapeHtml(row.team.name)}</span>
          </td>
          <td>${row.played}</td>
          <td>${row.win}</td>
          <td>${row.draw}</td>
          <td>${row.lose}</td>
          <td>${row.goalsDiff > 0 ? "+" : ""}${row.goalsDiff}</td>
          <td class="points">${row.points}</td>
          <td>
            <div class="pulse-cell" title="${escapeHtml(row.pulse.label)}">
              <span>${row.pulse.emoji}</span>
              ${pulseDotsHtml(row.pulse)}
            </div>
          </td>
        </tr>`
    )
    .join("");

  els.standingsTableWrap.innerHTML = `
    <table class="standings-table">
      <thead>
        <tr>
          <th>#</th>
          <th style="text-align:left">Jamoa</th>
          <th>O</th>
          <th>G</th>
          <th>D</th>
          <th>M</th>
          <th>Farq</th>
          <th>Ochko</th>
          <th>Nabz</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

async function loadStandings(force = false) {
  if (state.league === null) return;
  showStandingsState({ loading: true });
  els.standingsTableWrap.innerHTML = "";

  const params = new URLSearchParams({ league: state.league });
  if (state.season) params.set("season", state.season);
  if (force) params.set("force", "true");

  try {
    const res = await fetch(`/api/standings?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Noma'lum xatolik");
    }

    renderQuota(data.quota);
    showStandingsState({});
    renderStandingsTable(data.standings);
  } catch (err) {
    showStandingsState({ error: `Xatolik: ${err.message}` });
  }
}

// leagueId/season null bo'lsa - bu doimiy 4 ligadan biri (mavsum serverda
// avtomatik hisoblanadi). season berilgan bo'lsa - qidiruv orqali topilgan
// boshqa turnir.
function setLeague(leagueId, season = null) {
  state.league = leagueId;
  state.season = season;
  document
    .querySelectorAll("#leagueTabs .tab")
    .forEach((tab) => tab.classList.toggle("active", !season && Number(tab.dataset.league) === leagueId));
  els.leagueSearchResults.classList.add("hidden");
  els.leagueSearchResults.innerHTML = "";
  loadStandings(false);
}

// --- Qidiruv orqali boshqa turnir/liga tanlash ---

function renderLeagueSearchResults(items) {
  if (!items || items.length === 0) {
    els.leagueSearchResults.innerHTML = '<div class="state-box">Hech narsa topilmadi.</div>';
    els.leagueSearchResults.classList.remove("hidden");
    return;
  }

  els.leagueSearchResults.innerHTML = items
    .map(
      (item, i) => `
        <button type="button" class="league-result" data-index="${i}">
          <img src="${item.logo || ""}" alt="" loading="lazy" />
          <span>
            <div class="league-result-name">${escapeHtml(item.name)}</div>
            <div class="league-result-meta">${escapeHtml(item.country || "")}${
              item.season ? " · " + item.season + " mavsumi" : ""
            }</div>
          </span>
        </button>`
    )
    .join("");

  els.leagueSearchResults.querySelectorAll(".league-result").forEach((btn) => {
    const item = items[Number(btn.dataset.index)];
    btn.addEventListener("click", () => setLeague(item.id, item.season));
  });

  els.leagueSearchResults.classList.remove("hidden");
}

async function searchLeagues(query) {
  showStandingsState({ loading: true });
  try {
    const res = await fetch(`/api/leagues/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Noma'lum xatolik");
    }

    showStandingsState({});
    renderLeagueSearchResults(data);
  } catch (err) {
    showStandingsState({ error: `Qidirishda xatolik: ${err.message}` });
  }
}

els.leagueSearchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = els.leagueSearchInput.value.trim();
  if (query.length < 3) {
    showStandingsState({ error: "Qidiruv uchun kamida 3 ta harf kiriting." });
    return;
  }
  searchLeagues(query);
});

async function loadLeagues() {
  if (state.leaguesLoaded) return;
  try {
    const res = await fetch("/api/leagues");
    const leagues = await res.json();

    els.leagueTabs.innerHTML = leagues
      .map(
        (l, i) =>
          `<button class="tab${i === 0 ? " active" : ""}" data-league="${l.id}">${escapeHtml(l.name)}</button>`
      )
      .join("");

    els.leagueTabs.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => setLeague(Number(tab.dataset.league)));
    });

    state.leaguesLoaded = true;
    if (leagues.length > 0) {
      state.league = leagues[0].id;
      loadStandings(false);
    }
  } catch (err) {
    showStandingsState({ error: `Ligalar ro'yxati yuklanmadi: ${err.message}` });
  }
}

function setView(view) {
  state.view = view;
  els.mainTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  els.matchesView.classList.toggle("hidden", view !== "matches");
  els.standingsView.classList.toggle("hidden", view !== "standings");

  if (view === "standings") {
    loadLeagues();
  }
}

els.mainTabs.forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

els.refreshBtn.addEventListener("click", () => {
  els.refreshBtn.classList.add("spinning");
  const task = state.view === "standings" ? loadStandings(true) : loadMatches(true);
  task.finally(() => els.refreshBtn.classList.remove("spinning"));
});

// Ilk yuklash
loadMatches(false);
loadAutoRefreshStatus();

// PWA: service worker ro'yxatdan o'tkazish
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((err) => {
      console.warn("Service worker ro'yxatdan o'tmadi:", err);
    });
  });
}
