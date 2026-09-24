// Bashorat mantig'i (foydalanuvchiga formulasi ko'rsatilmaydi - faqat natija va
// 1-2 qisqa sabab ko'rsatiladi). Bu yerda: forma, jarohatlar, H2H va uy/mehmon
// omillarini birlashtirib, har bir jamoa uchun "nisbiy kuch" bahosi chiqariladi.

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

const WEIGHTS = {
  form: 0.4,
  h2h: 0.2,
  injury: 0.25,
  home: 0.15,
};

// "Teng kuch" deb topish uchun bo'sag'a (composite baholar farqi shundan kichik bo'lsa)
const DRAW_THRESHOLD = 0.07;

function resultLetterForTeam(fixture, teamId) {
  const status = fixture.fixture && fixture.fixture.status && fixture.fixture.status.short;
  if (!FINISHED_STATUSES.has(status)) return null;

  const homeId = fixture.teams.home.id;
  const homeWinner = fixture.teams.home.winner;
  const awayWinner = fixture.teams.away.winner;

  let outcome; // 'W' | 'D' | 'L' nisbatan ushbu teamId'ga
  if (homeWinner === null && awayWinner === null) {
    outcome = "D";
  } else if ((homeWinner === true && teamId === homeId) || (awayWinner === true && teamId !== homeId)) {
    outcome = "W";
  } else {
    outcome = "L";
  }
  return outcome;
}

/**
 * So'nggi o'yinlar ro'yxatidan (eng yangisi oldin bo'lishi shart emas -
 * shu funksiya ichida sanaga qarab tartiblanadi) forma bahosini hisoblaydi.
 */
function computeForm(fixtures, teamId) {
  const sorted = [...(fixtures || [])]
    .filter((f) => resultLetterForTeam(f, teamId) !== null)
    .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date))
    .slice(0, 5);

  if (sorted.length === 0) {
    return { score: 0.5, summary: "Ma'lumot yo'q", letters: [], wins: 0, draws: 0, losses: 0 };
  }

  const weights = [5, 4, 3, 2, 1];
  let weightedSum = 0;
  let weightTotal = 0;
  let wins = 0,
    draws = 0,
    losses = 0;
  const letters = [];

  sorted.forEach((f, i) => {
    const letter = resultLetterForTeam(f, teamId);
    letters.push(letter);
    const point = letter === "W" ? 1 : letter === "D" ? 0.5 : 0;
    const w = weights[i] || 1;
    weightedSum += point * w;
    weightTotal += w;
    if (letter === "W") wins++;
    else if (letter === "D") draws++;
    else losses++;
  });

  const score = weightTotal ? weightedSum / weightTotal : 0.5;
  const uzLetters = letters.map((l) => (l === "W" ? "G" : l === "D" ? "D" : "M"));

  return {
    score,
    summary: `So'nggi ${sorted.length} o'yin: ${uzLetters.join("-")} (${wins}G ${draws}D ${losses}M)`,
    letters: uzLetters,
    wins,
    draws,
    losses,
  };
}

function computeInjuries(injuries) {
  const list = injuries || [];
  const impact = Math.min(list.length / 5, 1); // 0..1, ko'proq jarohat = yomonroq
  const names = list
    .map((inj) => {
      const player = inj.player || {};
      const reason = player.reason || player.type || "jarohat";
      return `${player.name || "Noma'lum o'yinchi"} (${reason})`;
    })
    .slice(0, 8);
  return { impact, count: list.length, names };
}

function computeH2H(h2hFixtures, teamId) {
  const sorted = [...(h2hFixtures || [])]
    .filter((f) => resultLetterForTeam(f, teamId) !== null)
    .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date))
    .slice(0, 10);

  if (sorted.length === 0) {
    return { score: 0.5, summary: "Oldingi uchrashuvlar tarixi topilmadi", wins: 0, draws: 0, losses: 0 };
  }

  const weights = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];
  let weightedSum = 0;
  let weightTotal = 0;
  let wins = 0,
    draws = 0,
    losses = 0;

  sorted.forEach((f, i) => {
    const letter = resultLetterForTeam(f, teamId);
    const point = letter === "W" ? 1 : letter === "D" ? 0.5 : 0;
    const w = weights[i] || 0.5;
    weightedSum += point * w;
    weightTotal += w;
    if (letter === "W") wins++;
    else if (letter === "D") draws++;
    else losses++;
  });

  const score = weightTotal ? weightedSum / weightTotal : 0.5;
  return {
    score,
    summary: `Oxirgi ${sorted.length} o'zaro uchrashuv: ${wins}G ${draws}D ${losses}M`,
    wins,
    draws,
    losses,
  };
}

/**
 * Bitta o'yin uchun to'liq tahlil: composite baholar, g'olib bashorati va sabablar.
 */
function evaluateFixture({ fixture, homeForm, awayForm, homeInjuries, awayInjuries, h2h }) {
  const homeId = fixture.teams.home.id;
  const awayId = fixture.teams.away.id;
  const homeName = fixture.teams.home.name;
  const awayName = fixture.teams.away.name;

  const formHome = computeForm(homeForm, homeId);
  const formAway = computeForm(awayForm, awayId);
  const injHome = computeInjuries(homeInjuries);
  const injAway = computeInjuries(awayInjuries);
  const h2hHome = computeH2H(h2h, homeId);
  const h2hAway = computeH2H(h2h, awayId);

  const homeComposite =
    WEIGHTS.form * formHome.score +
    WEIGHTS.h2h * h2hHome.score +
    WEIGHTS.injury * (1 - injHome.impact) +
    WEIGHTS.home * 1;

  const awayComposite =
    WEIGHTS.form * formAway.score +
    WEIGHTS.h2h * h2hAway.score +
    WEIGHTS.injury * (1 - injAway.impact) +
    WEIGHTS.home * 0;

  const diff = homeComposite - awayComposite;
  const isDraw = Math.abs(diff) < DRAW_THRESHOLD;
  const favorite = isDraw ? "draw" : diff > 0 ? "home" : "away";
  const winnerName = favorite === "home" ? homeName : favorite === "away" ? awayName : null;
  const loserName = favorite === "home" ? awayName : favorite === "away" ? homeName : null;

  // Sabablarni yig'amiz: har bir omil g'olib tomon foydasiga qanchalik hissa qo'shganini solishtiramiz
  const factors = [];
  if (!isDraw) {
    const formContribution = WEIGHTS.form * (formHome.score - formAway.score) * (favorite === "home" ? 1 : -1);
    const injContribution =
      WEIGHTS.injury * (injAway.impact - injHome.impact) * (favorite === "home" ? 1 : -1);
    const h2hContribution = WEIGHTS.h2h * (h2hHome.score - h2hAway.score) * (favorite === "home" ? 1 : -1);

    if (formContribution > 0.01) {
      const winForm = favorite === "home" ? formHome : formAway;
      factors.push({
        weight: formContribution,
        text: `${winnerName} so'nggi o'yinlarda yaxshi formada (${winForm.wins} g'alaba, ${winForm.losses} mag'lubiyat).`,
      });
    }
    if (injContribution > 0.01) {
      const loserInjuries = favorite === "home" ? injAway : injHome;
      if (loserInjuries.count > 0) {
        factors.push({
          weight: injContribution,
          text: `${loserName}ning ${loserInjuries.count} ta asosiy o'yinchisi jarohatlangan/o'ynamaydi.`,
        });
      }
    }
    if (h2hContribution > 0.01) {
      const winH2H = favorite === "home" ? h2hHome : h2hAway;
      if (winH2H.wins > 0 || winH2H.draws > 0) {
        factors.push({
          weight: h2hContribution,
          text: `${winnerName} o'zaro uchrashuvlar tarixida ustunlikka ega (${winH2H.summary}).`,
        });
      }
    }
    if (favorite === "home") {
      factors.push({
        weight: WEIGHTS.home * 0.5,
        text: `${homeName} bu o'yinni o'z maydonida o'tkazadi.`,
      });
    }
  }

  factors.sort((a, b) => b.weight - a.weight);
  let reasons = factors.slice(0, 2).map((f) => f.text);
  if (isDraw || reasons.length === 0) {
    reasons = [
      "Ikkala jamoaning kuchi taxminan teng - forma, jarohatlar va o'zaro statistika bo'yicha sezilarli farq yo'q.",
    ];
  }

  return {
    favorite, // 'home' | 'away' | 'draw'
    winnerName,
    reasons,
    details: {
      home: {
        form: formHome,
        injuries: injHome,
      },
      away: {
        form: formAway,
        injuries: injAway,
      },
      h2h: {
        home: h2hHome,
        away: h2hAway,
      },
    },
  };
}

module.exports = { evaluateFixture };
