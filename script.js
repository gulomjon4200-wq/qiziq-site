const SAVE_KEY = "pul-fabrikasi-save-v1";

const GENERATOR_DEFS = [
  { id: "lemonade", name: "Limonad do'koni", icon: "🍋", baseCost: 15, income: 0.1 },
  { id: "newspaper", name: "Gazeta sotuvchisi", icon: "📰", baseCost: 100, income: 1 },
  { id: "taxi", name: "Taksi", icon: "🚕", baseCost: 500, income: 4 },
  { id: "cafe", name: "Kafe", icon: "☕", baseCost: 2500, income: 15 },
  { id: "shop", name: "Do'kon", icon: "🏪", baseCost: 12000, income: 60 },
  { id: "factory", name: "Zavod", icon: "🏭", baseCost: 60000, income: 260 },
  { id: "bank", name: "Bank", icon: "🏦", baseCost: 300000, income: 1200 },
  { id: "rocket", name: "Kosmik kompaniya", icon: "🚀", baseCost: 1500000, income: 6000 },
];

const COST_GROWTH = 1.15;
const CLICK_UPGRADE_GROWTH = 1.6;

let state = {
  balance: 0,
  clickValue: 1,
  clickUpgradeLevel: 0,
  generators: {},
};

function loadState() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state = {
      balance: parsed.balance || 0,
      clickValue: parsed.clickValue || 1,
      clickUpgradeLevel: parsed.clickUpgradeLevel || 0,
      generators: parsed.generators || {},
    };
  } catch (e) {
    console.warn("Saqlangan ma'lumotni o'qib bo'lmadi", e);
  }
}

function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function formatNumber(num) {
  if (num < 1000) return num.toFixed(num < 10 ? 2 : 1).replace(/\.0+$/, "");
  const units = ["", "K", "M", "B", "T", "Q"];
  let unitIndex = 0;
  let value = num;
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex++;
  }
  return value.toFixed(2) + units[unitIndex];
}

function getGeneratorCount(id) {
  return state.generators[id] || 0;
}

function getGeneratorCost(def) {
  const count = getGeneratorCount(def.id);
  return Math.ceil(def.baseCost * Math.pow(COST_GROWTH, count));
}

function getClickUpgradeCost() {
  return Math.ceil(50 * Math.pow(CLICK_UPGRADE_GROWTH, state.clickUpgradeLevel));
}

function getTotalIncomePerSec() {
  return GENERATOR_DEFS.reduce((sum, def) => {
    return sum + getGeneratorCount(def.id) * def.income;
  }, 0);
}

function updateUI() {
  document.getElementById("balance").textContent = formatNumber(state.balance);
  document.getElementById("income-per-sec").textContent = formatNumber(getTotalIncomePerSec());
  document.getElementById("click-value").textContent = formatNumber(state.clickValue);

  const clickUpgradeCost = getClickUpgradeCost();
  const clickUpgradeBtn = document.getElementById("upgrade-click-btn");
  document.getElementById("click-upgrade-cost").textContent = formatNumber(clickUpgradeCost);
  clickUpgradeBtn.disabled = state.balance < clickUpgradeCost;

  renderShop();
}

function renderShop() {
  const shopList = document.getElementById("shop-list");
  shopList.innerHTML = "";

  GENERATOR_DEFS.forEach((def) => {
    const count = getGeneratorCount(def.id);
    const cost = getGeneratorCost(def);
    const affordable = state.balance >= cost;

    const item = document.createElement("div");
    item.className = "shop-item";
    item.innerHTML = `
      <div class="shop-item-icon">${def.icon}</div>
      <div class="shop-item-info">
        <div class="shop-item-name">${def.name} (${count})</div>
        <div class="shop-item-detail">Soniyasiga +${formatNumber(def.income)} so'm</div>
      </div>
      <button class="shop-item-buy" ${affordable ? "" : "disabled"}>
        ${formatNumber(cost)} so'm
      </button>
    `;

    const buyBtn = item.querySelector(".shop-item-buy");
    buyBtn.addEventListener("click", () => buyGenerator(def.id));

    shopList.appendChild(item);
  });
}

function buyGenerator(id) {
  const def = GENERATOR_DEFS.find((g) => g.id === id);
  if (!def) return;
  const cost = getGeneratorCost(def);
  if (state.balance < cost) return;

  state.balance -= cost;
  state.generators[id] = getGeneratorCount(id) + 1;
  saveState();
  updateUI();
}

function buyClickUpgrade() {
  const cost = getClickUpgradeCost();
  if (state.balance < cost) return;

  state.balance -= cost;
  state.clickUpgradeLevel += 1;
  state.clickValue = 1 + state.clickUpgradeLevel;
  saveState();
  updateUI();
}

function spawnFloatingPlus(x, y, amount) {
  const el = document.createElement("div");
  el.className = "floating-plus";
  el.textContent = `+${formatNumber(amount)}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function handleCoinClick(event) {
  state.balance += state.clickValue;
  const x = (event.touches ? event.touches[0].clientX : event.clientX) || window.innerWidth / 2;
  const y = (event.touches ? event.touches[0].clientY : event.clientY) || window.innerHeight / 2;
  spawnFloatingPlus(x, y, state.clickValue);
  saveState();
  updateUI();
}

function tickPassiveIncome() {
  const perSec = getTotalIncomePerSec();
  if (perSec > 0) {
    state.balance += perSec / 10;
    saveState();
    updateUI();
  }
}

function resetGame() {
  const confirmed = window.confirm("Haqiqatan ham o'yinni qayta boshlamoqchimisiz? Barcha progress o'chiriladi.");
  if (!confirmed) return;
  localStorage.removeItem(SAVE_KEY);
  state = { balance: 0, clickValue: 1, clickUpgradeLevel: 0, generators: {} };
  updateUI();
}

function init() {
  loadState();
  updateUI();

  document.getElementById("coin-btn").addEventListener("click", handleCoinClick);
  document.getElementById("upgrade-click-btn").addEventListener("click", buyClickUpgrade);
  document.getElementById("reset-btn").addEventListener("click", resetGame);

  setInterval(tickPassiveIncome, 100);
}

init();
