const CHAMPION_ASSET_BASE = "assets/champions";

const championData = window.CHAMPION_DATA || {
  allChampions: [],
  defaultLaneChampionIds: {},
  meta: {}
};

const lanes = [
  { key: "top", label: "탑", psLaneId: 0 },
  { key: "jungle", label: "정글", psLaneId: 1 },
  { key: "mid", label: "미드", psLaneId: 2 },
  { key: "bot", label: "원딜", psLaneId: 3 },
  { key: "support", label: "서포터", psLaneId: 4 }
];

const allChampions = championData.allChampions;
const championById = new Map(allChampions.map((champion) => [champion.id, champion]));
const koreanNameSorter = new Intl.Collator("ko-KR", { numeric: true, sensitivity: "base" });
const defaultLaneChampionIds = championData.defaultLaneChampionIds;
const defaultLaneChampionIdSets = Object.fromEntries(
  lanes.map((lane) => [lane.key, new Set(defaultLaneChampionIds[lane.key] || [])])
);
const selectedChampionIdsByLane = Object.fromEntries(
  lanes.map((lane) => [lane.key, new Set(defaultLaneChampionIds[lane.key] || [])])
);

const PLAYER_POOL_STORAGE_KEY = "sekwangRandomCKPlayerPool";
const defaultPlayerPool = [
  "상현",
  "지안",
  "지혜",
  "지상",
  "예진",
  "예완",
  "성원",
  "강산",
  "강희",
  "은우",
  "태영(김)",
  "태영(윤)",
  "선진",
  "재윤",
  "동근",
  "승헌",
  "인의",
  "예지"
];
let playerPoolNames = loadPlayerPoolNames();
let selectedPlayerNames = new Set(playerPoolNames.slice(0, 10));

const teams = [
  { key: "blue", label: "블루팀" },
  { key: "red", label: "레드팀" }
];

let assignments = null;
let activeLaneKey = lanes[0].key;
let history = [];

const playerInputs = document.querySelector("#playerInputs");
const playerPool = document.querySelector("#playerPool");
const selectedPlayerCount = document.querySelector("#selectedPlayerCount");
const newPlayerInput = document.querySelector("#newPlayerInput");
const addPlayerButton = document.querySelector("#addPlayerButton");
const filledCount = document.querySelector("#filledCount");
const teamBoard = document.querySelector("#teamBoard");
const randomizeButton = document.querySelector("#randomizeButton");
const sampleButton = document.querySelector("#sampleButton");
const clearButton = document.querySelector("#clearButton");
const uniqueChampionToggle = document.querySelector("#uniqueChampionToggle");
const speedRange = document.querySelector("#speedRange");
const speedLabel = document.querySelector("#speedLabel");
const statusLabel = document.querySelector("#statusLabel");
const laneTabs = document.querySelector("#laneTabs");
const championPool = document.querySelector("#championPool");
const poolCount = document.querySelector("#poolCount");
const restorePoolButton = document.querySelector("#restorePoolButton");
const selectAllPoolButton = document.querySelector("#selectAllPoolButton");
const historyList = document.querySelector("#historyList");

function championImage(id) {
  return `${CHAMPION_ASSET_BASE}/${id}.png`;
}

function championObject(champion) {
  return { ...champion, image: championImage(champion.id) };
}

function getLane(key) {
  return lanes.find((lane) => lane.key === key);
}

function setsEqual(first, second) {
  if (first.size !== second.size) return false;
  return [...first].every((item) => second.has(item));
}

function selectedChampionsForLane(laneKey) {
  const selectedIds = selectedChampionIdsByLane[laneKey];
  const selectedChampions = allChampions.filter((champion) => selectedIds.has(champion.id));

  if (selectedChampions.length > 0) {
    return selectedChampions.map(championObject);
  }

  const defaultIds = defaultLaneChampionIdSets[laneKey] || new Set();
  const fallbackChampions = allChampions.filter((champion) => defaultIds.has(champion.id));
  return (fallbackChampions.length > 0 ? fallbackChampions : allChampions).map(championObject);
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function uniqueNames(names) {
  const seen = new Set();
  return names
    .map(normalizeName)
    .filter((name) => {
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
}

function loadPlayerPoolNames() {
  try {
    const storedNames = JSON.parse(window.localStorage.getItem(PLAYER_POOL_STORAGE_KEY) || "[]");
    return uniqueNames([...defaultPlayerPool, ...(Array.isArray(storedNames) ? storedNames : [])]);
  } catch {
    return [...defaultPlayerPool];
  }
}

function savePlayerPoolNames() {
  try {
    window.localStorage.setItem(PLAYER_POOL_STORAGE_KEY, JSON.stringify(playerPoolNames));
  } catch {
    // Local storage can be unavailable for file URLs in some browsers.
  }
}

function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[character]
  );
}

function createPlayerInputs() {
  const presetPlayers = playerPoolNames.filter((name) => selectedPlayerNames.has(name)).slice(0, 10);

  playerInputs.innerHTML = Array.from({ length: 10 }, (_, index) => {
    const number = index + 1;
    return `
      <div class="player-field">
        <label for="player-${number}">플레이어 ${number}</label>
        <input id="player-${number}" type="text" maxlength="12" placeholder="닉네임 입력" autocomplete="off" />
      </div>
    `;
  }).join("");

  playerInputs.querySelectorAll("input").forEach((input, index) => {
    input.value = presetPlayers[index] || "";
    input.addEventListener("input", handlePlayerInputChange);
  });
  updateFilledCount();
}

function handlePlayerInputChange() {
  syncSelectedPlayersFromInputs();
  updateFilledCount();
  renderPlayerPool();
}

function updateFilledCount() {
  const count = getEnteredPlayers().filter(Boolean).length;
  filledCount.textContent = count;
}

function getEnteredPlayers() {
  return [...playerInputs.querySelectorAll("input")].map((input) => normalizeName(input.value));
}

function getPlayers() {
  return getEnteredPlayers().filter(Boolean);
}

function syncSelectedPlayersFromInputs() {
  const enteredPlayers = new Set(getEnteredPlayers().filter(Boolean));
  selectedPlayerNames = new Set(playerPoolNames.filter((name) => enteredPlayers.has(name)));
}

function renderPlayerPool() {
  if (!playerPool) return;

  const orderedNames = [
    ...playerPoolNames.filter((name) => selectedPlayerNames.has(name)),
    ...playerPoolNames.filter((name) => !selectedPlayerNames.has(name))
  ];

  selectedPlayerCount.textContent = `${selectedPlayerNames.size}/10 선택`;
  playerPool.innerHTML = orderedNames
    .map((name) => {
      const isSelected = selectedPlayerNames.has(name);
      return `
        <button class="player-chip ${isSelected ? "is-selected" : ""}" type="button" data-player-name="${escapeHtml(name)}" aria-pressed="${isSelected}">
          ${escapeHtml(name)}
        </button>
      `;
    })
    .join("");
}

function fillPlayers(names) {
  const inputs = [...playerInputs.querySelectorAll("input")];
  inputs.forEach((input, index) => {
    input.value = names[index] || "";
  });
  syncSelectedPlayersFromInputs();
  updateFilledCount();
  renderPlayerPool();
}

function addPlayerToInput(name) {
  const inputs = [...playerInputs.querySelectorAll("input")];
  const existingInput = inputs.find((input) => normalizeName(input.value) === name);
  if (existingInput) return true;

  const emptyInput = inputs.find((input) => !normalizeName(input.value));
  if (!emptyInput) return false;

  emptyInput.value = name;
  return true;
}

function removePlayerFromInputs(name) {
  playerInputs.querySelectorAll("input").forEach((input) => {
    if (normalizeName(input.value) === name) {
      input.value = "";
    }
  });
}

function togglePlayerFromPool(name) {
  syncSelectedPlayersFromInputs();

  if (selectedPlayerNames.has(name)) {
    removePlayerFromInputs(name);
    selectedPlayerNames.delete(name);
    statusLabel.textContent = `${name}을 참가자 명단에서 제외했습니다.`;
  } else if (addPlayerToInput(name)) {
    selectedPlayerNames.add(name);
    statusLabel.textContent = `${name}을 참가자 명단에 추가했습니다.`;
  } else {
    statusLabel.textContent = "참가자 10명이 모두 채워져 있습니다. 한 칸을 비운 뒤 선택하세요.";
  }

  updateFilledCount();
  renderPlayerPool();
}

function addNewPlayerName() {
  const name = normalizeName(newPlayerInput.value);
  if (!name) return;

  if (!playerPoolNames.includes(name)) {
    playerPoolNames = [...playerPoolNames, name];
    savePlayerPoolNames();
  }

  if (addPlayerToInput(name)) {
    selectedPlayerNames.add(name);
    statusLabel.textContent = `${name}을 플레이어 풀과 참가자 명단에 추가했습니다.`;
  } else {
    statusLabel.textContent = `${name}을 플레이어 풀에 추가했습니다.`;
  }

  newPlayerInput.value = "";
  updateFilledCount();
  renderPlayerPool();
}

function renderEmptyBoard() {
  const renderTeamColumn = (team) => `
      <article class="team-column ${team.key}" data-team="${team.key}">
        <div class="team-title">
          <h3>${team.label}</h3>
        </div>
        <div class="role-list">
          ${lanes
            .map(
              (lane) => `
              <button class="assignment-card" type="button" data-team="${team.key}" data-lane="${lane.key}" data-lane-label="${lane.label}">
                <span class="champion-avatar">
                  <span class="placeholder-avatar">대기</span>
                </span>
                <span class="assignment-main">
                  <span class="player-name">대기 중</span>
                  <span class="champion-name">배정 전</span>
                </span>
                <span class="reroll-hint" aria-hidden="true">↻</span>
              </button>
            `
            )
            .join("")}
        </div>
      </article>
    `;

  teamBoard.innerHTML = `
    ${renderTeamColumn(teams[0])}
    ${renderLaneCenterColumn()}
    ${renderTeamColumn(teams[1])}
  `;
}

function createAssignments() {
  const shuffledPlayers = shuffle(getPlayers());
  const usedChampions = new Set();
  const nextAssignments = {
    blue: [],
    red: []
  };

  teams.forEach((team, teamIndex) => {
    const teamPlayers = shuffle(shuffledPlayers.slice(teamIndex * 5, teamIndex * 5 + 5));
    lanes.forEach((lane, laneIndex) => {
      nextAssignments[team.key].push({
        lane: lane.key,
        player: teamPlayers[laneIndex],
        champion: drawChampion(lane.key, usedChampions)
      });
    });
  });

  return nextAssignments;
}

function drawChampion(laneKey, usedChampions = new Set(), currentId = "") {
  const pool = selectedChampionsForLane(laneKey);
  const uniquePool = pool.filter((champion) => !usedChampions.has(champion.id) && champion.id !== currentId);
  const targetPool = uniqueChampionToggle.checked && uniquePool.length > 0 ? uniquePool : pool;
  const champion = pickRandom(targetPool);
  usedChampions.add(champion.id);
  return champion;
}

function renderAssignments(animated = true) {
  const renderTeamColumn = (team) => {
      const rows = assignments[team.key] || [];
      return `
        <article class="team-column ${team.key}" data-team="${team.key}">
          <div class="team-title">
            <h3>${team.label}</h3>
          </div>
          <div class="role-list">
            ${rows
              .map((row, index) => {
                const lane = getLane(row.lane);
                const delay = animated ? `style="animation-delay: ${index * 70}ms"` : "";
                return `
                  <button class="assignment-card ${animated ? "is-dealing" : ""}" ${delay} type="button" data-team="${team.key}" data-lane="${row.lane}" data-lane-label="${lane.label}" aria-label="${team.label} ${lane.label} 챔피언 다시 뽑기">
                    <span class="champion-avatar">
                      <img src="${row.champion.image}" alt="${row.champion.name}" loading="lazy" />
                    </span>
                    <span class="assignment-main">
                      <span class="player-name">${row.player}</span>
                      <span class="champion-name">${row.champion.name}</span>
                    </span>
                    <span class="reroll-hint" aria-hidden="true">↻</span>
                  </button>
                `;
              })
              .join("")}
          </div>
        </article>
      `;
    };

  teamBoard.innerHTML = `
    ${renderTeamColumn(teams[0])}
    ${renderLaneCenterColumn(animated)}
    ${renderTeamColumn(teams[1])}
  `;
}

function renderLaneCenterColumn(animated = false) {
  return `
    <div class="lane-center-list" aria-label="라인 목록">
      ${lanes
        .map(
          (lane, index) => `
          <div class="lane-center-badge ${animated ? "is-dealing" : ""}" ${animated ? `style="animation-delay: ${index * 70}ms"` : ""}>
            ${lane.label}
          </div>
        `
        )
        .join("")}
    </div>
  `;
}

function randomPreview() {
  teamBoard.querySelectorAll(".assignment-card").forEach((card, index) => {
    const lane = getLane(card.dataset.lane) || lanes[index % lanes.length];
    const champion = pickRandom(selectedChampionsForLane(lane.key));
    card.querySelector(".champion-avatar").innerHTML = `<img src="${champion.image}" alt="${champion.name}" />`;
    card.querySelector(".champion-name").textContent = champion.name;
    card.querySelector(".player-name").textContent = pickRandom(getPlayers());
  });
}

function animationDuration() {
  return [650, 1100, 1550][Number(speedRange.value)];
}

function randomizeDraft() {
  const players = getPlayers();
  if (players.length !== 10) {
    statusLabel.textContent = "참가자 10명을 채운 뒤 랜덤 배정을 시작하세요.";
    return;
  }

  randomizeButton.disabled = true;
  document.body.classList.add("is-randomizing");
  statusLabel.textContent = "배정 중입니다. 팀과 라인을 섞고 있습니다.";

  const duration = animationDuration();
  const previewInterval = window.setInterval(randomPreview, 95);

  window.setTimeout(() => {
    window.clearInterval(previewInterval);
    assignments = createAssignments();
    renderAssignments(true);
    pushHistory();
    statusLabel.textContent = "배정 완료. 결과 카드를 클릭하면 챔피언만 다시 뽑습니다.";
    document.body.classList.remove("is-randomizing");
    randomizeButton.disabled = false;
  }, duration);
}

function rerollCard(teamKey, laneKey) {
  if (!assignments) return;
  const row = assignments[teamKey].find((entry) => entry.lane === laneKey);
  if (!row) return;

  const usedChampions = new Set(
    Object.values(assignments)
      .flat()
      .map((entry) => entry.champion.id)
      .filter((id) => id !== row.champion.id)
  );
  row.champion = drawChampion(laneKey, usedChampions, row.champion.id);

  const card = teamBoard.querySelector(`[data-team="${teamKey}"][data-lane="${laneKey}"]`);
  if (!card) return;

  card.classList.add("is-rerolling");
  window.setTimeout(() => {
    card.querySelector(".champion-avatar").innerHTML = `<img src="${row.champion.image}" alt="${row.champion.name}" loading="lazy" />`;
    card.querySelector(".champion-name").textContent = row.champion.name;
    statusLabel.textContent = `${teamLabel(teamKey)} ${getLane(laneKey).label} 챔피언을 다시 뽑았습니다.`;
  }, 250);
  window.setTimeout(() => card.classList.remove("is-rerolling"), 590);
}

function teamLabel(teamKey) {
  return teams.find((team) => team.key === teamKey).label;
}

function selectedCountForLane(laneKey) {
  return selectedChampionIdsByLane[laneKey].size;
}

function compareChampionsByName(first, second) {
  return koreanNameSorter.compare(first.name, second.name) || Number(first.id) - Number(second.id);
}

function orderedChampionsForLane(laneKey) {
  const selectedIds = selectedChampionIdsByLane[laneKey];
  return [...allChampions].sort((first, second) => {
    const selectedDelta = Number(selectedIds.has(second.id)) - Number(selectedIds.has(first.id));
    return selectedDelta || compareChampionsByName(first, second);
  });
}

function renderLaneTabs() {
  laneTabs.innerHTML = lanes
    .map(
      (lane) => `
      <button class="lane-tab ${lane.key === activeLaneKey ? "is-active" : ""}" type="button" role="tab" aria-selected="${lane.key === activeLaneKey}" data-lane="${lane.key}">
        <span>${lane.label}</span>
        <span class="lane-tab-count">${selectedCountForLane(lane.key)}</span>
      </button>
    `
    )
    .join("");
}

function updatePoolControls() {
  const lane = getLane(activeLaneKey);
  const selectedIds = selectedChampionIdsByLane[activeLaneKey];
  const defaultIds = defaultLaneChampionIdSets[activeLaneKey];
  const selectedCount = selectedIds.size;
  const defaultCount = defaultIds.size;

  poolCount.textContent = `${lane.label} 선택 ${selectedCount}/${allChampions.length}`;
  restorePoolButton.disabled = setsEqual(selectedIds, defaultIds);
  selectAllPoolButton.disabled = selectedCount === allChampions.length;

  if (selectedCount === 0) {
    poolCount.textContent = `${lane.label} 선택 0/${allChampions.length} · 배정 시 기본값 사용`;
  } else if (selectedCount === defaultCount && setsEqual(selectedIds, defaultIds)) {
    poolCount.textContent = `${lane.label} 선택 ${selectedCount}/${allChampions.length} · LOL.PS 기본값`;
  }
}

function updateChampionChipState(chip) {
  const lane = getLane(activeLaneKey);
  const championId = chip.dataset.championId;
  const champion = championById.get(championId);
  const isSelected = selectedChampionIdsByLane[activeLaneKey].has(championId);
  const hasMetric = defaultLaneChampionIdSets[activeLaneKey].has(championId);

  chip.classList.toggle("is-selected", isSelected);
  chip.classList.toggle("has-metric", hasMetric);
  chip.setAttribute("aria-pressed", String(isSelected));
  chip.setAttribute(
    "aria-label",
    `${lane.label} 후보 ${champion.name} ${isSelected ? "비활성화" : "활성화"}`
  );
}

function reorderChampionPool() {
  const chipsById = new Map(
    [...championPool.querySelectorAll(".champion-chip")].map((chip) => [chip.dataset.championId, chip])
  );

  orderedChampionsForLane(activeLaneKey).forEach((champion) => {
    const chip = chipsById.get(champion.id);
    if (chip) championPool.append(chip);
  });
}

function syncChampionPool() {
  championPool.querySelectorAll(".champion-chip").forEach(updateChampionChipState);
  reorderChampionPool();
  updatePoolControls();
  renderLaneTabs();
}

function renderChampionPool() {
  const lane = getLane(activeLaneKey);
  const selectedIds = selectedChampionIdsByLane[activeLaneKey];
  const defaultIds = defaultLaneChampionIdSets[activeLaneKey];

  championPool.innerHTML = orderedChampionsForLane(activeLaneKey)
    .map((champion) => {
      const item = championObject(champion);
      const isSelected = selectedIds.has(champion.id);
      const hasMetric = defaultIds.has(champion.id);
      return `
        <button class="champion-chip ${isSelected ? "is-selected" : ""} ${hasMetric ? "has-metric" : ""}" type="button" data-champion-id="${champion.id}" aria-pressed="${isSelected}" aria-label="${lane.label} 후보 ${champion.name} ${isSelected ? "비활성화" : "활성화"}">
          <img class="champion-portrait" src="${item.image}" alt="${item.name}" loading="lazy" />
          <span class="champion-chip-name">${item.name}</span>
        </button>
      `;
    })
    .join("");

  updatePoolControls();
}

function toggleChampionForActiveLane(championId) {
  const selectedIds = selectedChampionIdsByLane[activeLaneKey];
  const champion = championById.get(championId);

  if (selectedIds.has(championId)) {
    selectedIds.delete(championId);
  } else {
    selectedIds.add(championId);
  }

  const isSelected = selectedIds.has(championId);
  syncChampionPool();
  statusLabel.textContent = `${getLane(activeLaneKey).label} 후보에서 ${champion.name}을 ${isSelected ? "활성화" : "비활성화"}했습니다.`;
}

function restoreActiveLanePool() {
  const lane = getLane(activeLaneKey);
  selectedChampionIdsByLane[activeLaneKey] = new Set(defaultLaneChampionIds[activeLaneKey] || []);
  syncChampionPool();
  statusLabel.textContent = `${lane.label} 후보를 LOL.PS 기본값으로 되돌렸습니다.`;
}

function selectAllForActiveLane() {
  const lane = getLane(activeLaneKey);
  selectedChampionIdsByLane[activeLaneKey] = new Set(allChampions.map((champion) => champion.id));
  syncChampionPool();
  statusLabel.textContent = `${lane.label} 후보에 전체 챔피언을 선택했습니다.`;
}

function pushHistory() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  });
  const blueTop = assignments.blue.find((entry) => entry.lane === "top");
  const redTop = assignments.red.find((entry) => entry.lane === "top");
  history = [
    {
      time: formatter.format(now),
      summary: [
        `블루 탑 ${blueTop.player}`,
        `레드 탑 ${redTop.player}`,
        `블루 첫 챔피언 ${assignments.blue[0].champion.name}`,
        `레드 첫 챔피언 ${assignments.red[0].champion.name}`
      ]
    },
    ...history
  ].slice(0, 5);
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = `<p class="empty-history">아직 생성된 결과가 없습니다.</p>`;
    return;
  }

  historyList.innerHTML = history
    .map(
      (item) => `
      <article class="history-item">
        <div class="history-time">${item.time}</div>
        <div class="history-summary">
          ${item.summary.map((summary) => `<span class="history-pill">${summary}</span>`).join("")}
        </div>
      </article>
    `
    )
    .join("");
}

function addButtonRipples() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    if (button.classList.contains("champion-chip")) return;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    button.append(ripple);
    window.setTimeout(() => ripple.remove(), 650);
  });
}

function observeReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.01 }
  );
  document.querySelectorAll(".reveal-on-scroll").forEach((element) => observer.observe(element));
}

function setSpeedLabel() {
  speedLabel.textContent = ["빠름", "보통", "느림"][Number(speedRange.value)];
}

function addListener(element, eventName, handler) {
  if (element) element.addEventListener(eventName, handler);
}

createPlayerInputs();
renderPlayerPool();
renderEmptyBoard();
renderLaneTabs();
renderChampionPool();
renderHistory();
observeReveal();
addButtonRipples();
setSpeedLabel();

addListener(sampleButton, "click", () => {
  fillPlayers(playerPoolNames.slice(0, 10));
  statusLabel.textContent = "기본 명단 10명을 채웠습니다. 바로 랜덤 배정을 시작할 수 있습니다.";
});

addListener(clearButton, "click", () => {
  playerInputs.querySelectorAll("input").forEach((input) => {
    input.value = "";
  });
  selectedPlayerNames.clear();
  updateFilledCount();
  renderPlayerPool();
  assignments = null;
  renderEmptyBoard();
  statusLabel.textContent = "입력을 초기화했습니다. 참가자 10명을 다시 입력하세요.";
});

addListener(randomizeButton, "click", randomizeDraft);

addListener(teamBoard, "click", (event) => {
  const card = event.target.closest(".assignment-card");
  if (!card) return;
  rerollCard(card.dataset.team, card.dataset.lane);
});

addListener(laneTabs, "click", (event) => {
  const tab = event.target.closest(".lane-tab");
  if (!tab) return;
  activeLaneKey = tab.dataset.lane;
  renderLaneTabs();
  renderChampionPool();
});

addListener(championPool, "click", (event) => {
  const chip = event.target.closest(".champion-chip");
  if (!chip) return;
  toggleChampionForActiveLane(chip.dataset.championId);
});

addListener(playerPool, "click", (event) => {
  const chip = event.target.closest(".player-chip");
  if (!chip) return;
  togglePlayerFromPool(chip.dataset.playerName);
});

addListener(addPlayerButton, "click", addNewPlayerName);
addListener(newPlayerInput, "keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addNewPlayerName();
});

addListener(restorePoolButton, "click", restoreActiveLanePool);
addListener(selectAllPoolButton, "click", selectAllForActiveLane);
addListener(speedRange, "input", setSpeedLabel);
