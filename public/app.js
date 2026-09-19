const state = {
  day: "today",
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

els.refreshBtn.addEventListener("click", () => {
  els.refreshBtn.classList.add("spinning");
  loadMatches(true).finally(() => els.refreshBtn.classList.remove("spinning"));
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
