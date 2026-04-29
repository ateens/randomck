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

const presetPlayersBySlot = Object.fromEntries(
  teams.flatMap((team) => lanes.map((lane) => [`${team.key}:${lane.key}`, ""]))
);
const presetChampionsBySlot = Object.fromEntries(
  teams.flatMap((team) => lanes.map((lane) => [`${team.key}:${lane.key}`, ""]))
);

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
const animationToggle = document.querySelector("#animationToggle");
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

function defaultLocks() {
  return { all: false, position: false };
}

function getLane(key) {
  return lanes.find((lane) => lane.key === key);
}

function slotKey(teamKey, laneKey) {
  return `${teamKey}:${laneKey}`;
}

function isFullLocked(row) {
  return Boolean(row?.locks?.all);
}

function isPositionLocked(row) {
  return Boolean(row?.locks?.all || row?.locks?.position);
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
  syncPresetPlayersWithInputs();
  updateFilledCount();
  renderPlayerPool();
  if (!assignments) renderEmptyBoard();
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
  syncPresetPlayersWithInputs();
  updateFilledCount();
  renderPlayerPool();
  if (!assignments) renderEmptyBoard();
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

  syncPresetPlayersWithInputs();
  updateFilledCount();
  renderPlayerPool();
  if (!assignments) renderEmptyBoard();
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
  syncPresetPlayersWithInputs();
  updateFilledCount();
  renderPlayerPool();
  if (!assignments) renderEmptyBoard();
}

function clearPresetPlayers() {
  Object.keys(presetPlayersBySlot).forEach((key) => {
    presetPlayersBySlot[key] = "";
  });
  Object.keys(presetChampionsBySlot).forEach((key) => {
    presetChampionsBySlot[key] = "";
  });
}

function syncPresetPlayersWithInputs() {
  const players = new Set(getPlayers());
  Object.keys(presetPlayersBySlot).forEach((key) => {
    if (presetPlayersBySlot[key] && !players.has(presetPlayersBySlot[key])) {
      presetPlayersBySlot[key] = "";
    }
  });
}

function playerOptionButtonMarkup(selectedPlayer = "") {
  const options = [
    `<button class="preset-option ${selectedPlayer ? "" : "is-selected"}" type="button" data-player-name="" role="option" aria-selected="${selectedPlayer ? "false" : "true"}">선택 안 함</button>`
  ];
  getPlayers().forEach((player) => {
    options.push(
      `<button class="preset-option ${player === selectedPlayer ? "is-selected" : ""}" type="button" data-player-name="${escapeHtml(player)}" role="option" aria-selected="${player === selectedPlayer ? "true" : "false"}">${escapeHtml(player)}</button>`
    );
  });
  return options.join("");
}

function presetChampionForSlot(teamKey, laneKey) {
  const championId = presetChampionsBySlot[slotKey(teamKey, laneKey)];
  const champion = championById.get(championId);
  return champion ? championObject(champion) : null;
}

function championIdSetForLaneOptions(laneKey) {
  return new Set(selectedChampionsForLane(laneKey).map((champion) => champion.id));
}

function syncPresetChampionsWithPools(targetLaneKey = "") {
  teams.forEach((team) => {
    lanes.forEach((lane) => {
      if (targetLaneKey && lane.key !== targetLaneKey) return;
      const key = slotKey(team.key, lane.key);
      const championId = presetChampionsBySlot[key];
      if (championId && !championIdSetForLaneOptions(lane.key).has(championId)) {
        presetChampionsBySlot[key] = "";
      }
    });
  });
}

function championOptionButtonMarkup(laneKey, selectedChampionId = "") {
  const selectedChampion = championById.get(selectedChampionId);
  const laneChampions = selectedChampionsForLane(laneKey)
    .sort(compareChampionsByName)
    .filter((champion) => champion.id !== selectedChampionId);
  const champions = selectedChampion
    ? [championObject(selectedChampion), ...laneChampions]
    : laneChampions;
  const options = [
    `<button class="preset-option ${selectedChampionId ? "" : "is-selected"}" type="button" data-champion-id="" role="option" aria-selected="${selectedChampionId ? "false" : "true"}">선택 안 함</button>`
  ];

  champions.forEach((champion) => {
    options.push(
      `<button class="preset-option champion-preset-option ${champion.id === selectedChampionId ? "is-selected" : ""}" type="button" data-champion-id="${champion.id}" role="option" aria-selected="${champion.id === selectedChampionId ? "true" : "false"}">
        <img class="preset-option-avatar" src="${champion.image}" alt="" loading="lazy" />
        <span>${escapeHtml(champion.name)}</span>
      </button>`
    );
  });

  return options.join("");
}

function closePresetMenus(exceptPicker = null) {
  teamBoard.querySelectorAll(".preset-picker.is-open").forEach((picker) => {
    if (picker === exceptPicker) return;
    picker.classList.remove("is-open");
    picker.closest(".assignment-card")?.classList.remove("has-open-preset");
    picker.querySelector(".preset-trigger")?.setAttribute("aria-expanded", "false");
  });
}

function togglePresetMenu(trigger) {
  const picker = trigger.closest(".preset-picker");
  if (!picker) return;
  const willOpen = !picker.classList.contains("is-open");

  closePresetMenus(willOpen ? picker : null);
  picker.classList.toggle("is-open", willOpen);
  picker.closest(".assignment-card")?.classList.toggle("has-open-preset", willOpen);
  trigger.setAttribute("aria-expanded", String(willOpen));
}

function setPresetPlayer(teamKey, laneKey, playerName) {
  const normalizedPlayer = normalizeName(playerName);
  const key = slotKey(teamKey, laneKey);

  if (normalizedPlayer && !getPlayers().includes(normalizedPlayer)) return;

  Object.keys(presetPlayersBySlot).forEach((slot) => {
    if (slot !== key && presetPlayersBySlot[slot] === normalizedPlayer) {
      presetPlayersBySlot[slot] = "";
    }
  });

  presetPlayersBySlot[key] = normalizedPlayer;
  renderEmptyBoard();

  const lane = getLane(laneKey);
  statusLabel.textContent = normalizedPlayer
    ? `${teamLabel(teamKey)} ${lane.label}에 ${normalizedPlayer}을 먼저 배정했습니다.`
    : `${teamLabel(teamKey)} ${lane.label} 사전 배정을 해제했습니다.`;
}

function setPresetChampion(teamKey, laneKey, championId) {
  const key = slotKey(teamKey, laneKey);
  const champion = championById.get(championId);

  if (championId && !champion) return;

  if (championId && uniqueChampionToggle.checked) {
    Object.keys(presetChampionsBySlot).forEach((slot) => {
      if (slot !== key && presetChampionsBySlot[slot] === championId) {
        presetChampionsBySlot[slot] = "";
      }
    });
  }

  presetChampionsBySlot[key] = championId;
  renderEmptyBoard();

  const lane = getLane(laneKey);
  statusLabel.textContent = champion
    ? `${teamLabel(teamKey)} ${lane.label}에 ${champion.name}을 먼저 배정했습니다.`
    : `${teamLabel(teamKey)} ${lane.label} 챔피언 사전 배정을 해제했습니다.`;
}

function renderEmptyBoard() {
  syncPresetChampionsWithPools();
  teamBoard.classList.add("is-preset-mode");

  const renderTeamColumn = (team) => `
      <article class="team-column ${team.key}" data-team="${team.key}">
        <div class="team-title">
          <h3>${team.label}</h3>
        </div>
        <div class="role-list">
          ${lanes
            .map((lane) => {
              const key = slotKey(team.key, lane.key);
              const selectedPlayer = presetPlayersBySlot[key] || "";
              const selectedChampion = presetChampionForSlot(team.key, lane.key);
              const lockClasses = [
                selectedPlayer || selectedChampion ? "has-lock" : "",
                selectedPlayer ? "is-locked-position" : "",
                selectedChampion ? "is-locked-champion" : "",
                selectedPlayer && selectedChampion ? "is-locked-all" : ""
              ]
                .filter(Boolean)
                .join(" ");
              return `
              <article class="assignment-card is-empty ${lockClasses}" data-team="${team.key}" data-lane="${lane.key}" data-lane-label="${lane.label}">
                <span class="champion-avatar">
                  ${
                    selectedChampion
                      ? `<img src="${selectedChampion.image}" alt="${selectedChampion.name}" loading="lazy" />`
                      : `<span class="placeholder-avatar">대기</span>`
                  }
                </span>
                <span class="assignment-main">
                  <span class="player-name">${selectedPlayer || "대기 중"}</span>
                  <span class="champion-name">${selectedChampion ? selectedChampion.name : "배정 전"}</span>
                  <span class="preset-stack">
                  <span class="preset-picker" data-preset-type="player" data-team="${team.key}" data-lane="${lane.key}">
                    <button class="preset-trigger ${selectedPlayer ? "has-selection" : ""}" type="button" aria-expanded="false" aria-haspopup="listbox">
                      <span>${selectedPlayer ? `${escapeHtml(selectedPlayer)} 고정` : "플레이어 선택"}</span>
                      <span class="preset-chevron" aria-hidden="true">⌄</span>
                    </button>
                    <span class="preset-menu" role="listbox" aria-label="${team.label} ${lane.label} 사전 배정">
                      ${playerOptionButtonMarkup(selectedPlayer)}
                    </span>
                  </span>
                  <span class="preset-picker champion-preset-picker" data-preset-type="champion" data-team="${team.key}" data-lane="${lane.key}">
                    <button class="preset-trigger ${selectedChampion ? "has-selection" : ""}" type="button" aria-expanded="false" aria-haspopup="listbox">
                      <span>${selectedChampion ? `${escapeHtml(selectedChampion.name)} 고정` : "챔피언 선택"}</span>
                      <span class="preset-chevron" aria-hidden="true">⌄</span>
                    </button>
                    <span class="preset-menu" role="listbox" aria-label="${team.label} ${lane.label} 챔피언 사전 배정">
                      ${championOptionButtonMarkup(lane.key, selectedChampion?.id || "")}
                    </span>
                  </span>
                  </span>
                </span>
              </article>
            `;
            })
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

function getAssignment(teamKey, laneKey) {
  return assignments?.[teamKey]?.find((entry) => entry.lane === laneKey);
}

function lockedCount() {
  const lockedSlots = new Set(
    Object.entries(presetPlayersBySlot)
      .filter(([, player]) => Boolean(player))
      .map(([key]) => key)
  );

  Object.entries(presetChampionsBySlot)
    .filter(([, championId]) => Boolean(championId))
    .forEach(([key]) => lockedSlots.add(key));

  if (assignments) {
    Object.entries(assignments).forEach(([teamKey, rows]) => {
      rows.forEach((row) => {
        if (isFullLocked(row) || row.locks?.position) {
          lockedSlots.add(slotKey(teamKey, row.lane));
        }
      });
    });
  }

  return lockedSlots.size;
}

function createAssignments() {
  const players = getPlayers();
  const fixedPlayersBySlot = new Map();
  const usedFixedPlayers = new Set();

  teams.forEach((team) => {
    lanes.forEach((lane) => {
      const key = slotKey(team.key, lane.key);
      const previousRow = getAssignment(team.key, lane.key);
      const presetPlayer = presetPlayersBySlot[key];
      const fixedPlayer =
        presetPlayer && players.includes(presetPlayer)
          ? presetPlayer
          : isPositionLocked(previousRow) && players.includes(previousRow.player)
            ? previousRow.player
            : "";

      if (fixedPlayer && !usedFixedPlayers.has(fixedPlayer)) {
        fixedPlayersBySlot.set(key, fixedPlayer);
        usedFixedPlayers.add(fixedPlayer);
      }
    });
  });

  const availablePlayers = shuffle(players.filter((player) => !usedFixedPlayers.has(player)));
  const usedChampions = new Set(
    assignments
      ? Object.values(assignments)
          .flat()
          .filter((row) => isFullLocked(row) && row.champion && players.includes(row.player))
          .map((row) => row.champion.id)
      : []
  );

  if (uniqueChampionToggle.checked) {
    Object.values(presetChampionsBySlot).forEach((championId) => {
      if (championId) usedChampions.add(championId);
    });
  }

  const nextAssignments = {
    blue: [],
    red: []
  };

  teams.forEach((team) => {
    lanes.forEach((lane) => {
      const key = slotKey(team.key, lane.key);
      const previousRow = getAssignment(team.key, lane.key);
      const locks = { ...defaultLocks(), ...(previousRow?.locks || {}) };
      const hasPresetPlayer = Boolean(presetPlayersBySlot[key] && players.includes(presetPlayersBySlot[key]));
      const presetChampion = presetChampionForSlot(team.key, lane.key);
      const hasPresetChampion = Boolean(presetChampion);

      if (hasPresetPlayer && hasPresetChampion) {
        locks.all = true;
        locks.position = false;
      } else {
        locks.position = Boolean(locks.position || hasPresetPlayer);
        if (locks.all) locks.position = false;
      }

      const keepChampion = Boolean(locks.all && previousRow?.champion && players.includes(previousRow.player));
      const champion = presetChampion || (
        keepChampion
          ? previousRow.champion
          : drawChampion(lane.key, usedChampions, previousRow?.champion?.id)
      );

      if (presetChampion) usedChampions.add(presetChampion.id);

      nextAssignments[team.key].push({
        lane: lane.key,
        player: fixedPlayersBySlot.get(key) || availablePlayers.shift(),
        champion,
        locks
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
  teamBoard.classList.remove("is-preset-mode");

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
                const locks = { ...defaultLocks(), ...(row.locks || {}) };
                const delay = animated ? `style="animation-delay: ${index * 70}ms"` : "";
                return `
                  <article class="assignment-card ${animated ? "is-dealing" : ""} ${locks.position || locks.all ? "has-lock" : ""} ${locks.position ? "is-locked-position" : ""} ${locks.all ? "is-locked-all" : ""}" ${delay} role="button" tabindex="0" data-team="${team.key}" data-lane="${row.lane}" data-lane-label="${lane.label}" aria-label="${team.label} ${lane.label} 챔피언 다시 뽑기">
                    <span class="champion-avatar">
                      <img src="${row.champion.image}" alt="${row.champion.name}" loading="lazy" />
                    </span>
                    <span class="assignment-main">
                      <span class="player-name">${row.player}</span>
                      <span class="champion-name">${row.champion.name}</span>
                    </span>
                    <span class="lock-controls" aria-label="고정 옵션">
                      <button class="lock-button ${locks.all ? "is-active" : ""}" type="button" data-lock-type="all" aria-pressed="${locks.all}" aria-label="${team.label} ${lane.label} 전체 ${locks.all ? "고정 해제" : "고정"}">전체 고정</button>
                      <button class="lock-button ${locks.position ? "is-active" : ""}" type="button" data-lock-type="position" aria-pressed="${locks.position}" aria-label="${team.label} ${lane.label} 포지션 ${locks.position ? "고정 해제" : "고정"}">포지션 고정</button>
                    </span>
                    <span class="reroll-hint" aria-hidden="true">↻</span>
                  </article>
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
    const row = getAssignment(card.dataset.team, card.dataset.lane);
    const lane = getLane(card.dataset.lane) || lanes[index % lanes.length];
    const presetPlayer = presetPlayersBySlot[slotKey(card.dataset.team, card.dataset.lane)];
    const hasPresetPlayer = Boolean(presetPlayer && getPlayers().includes(presetPlayer));
    const presetChampion = presetChampionForSlot(card.dataset.team, card.dataset.lane);
    const fullLocked = isFullLocked(row);
    const positionLocked = isPositionLocked(row) || hasPresetPlayer;
    const avatar = card.querySelector(".champion-avatar");
    const championName = card.querySelector(".champion-name");
    const playerName = card.querySelector(".player-name");

    if (presetChampion && avatar && championName) {
      avatar.innerHTML = `<img src="${presetChampion.image}" alt="${presetChampion.name}" />`;
      championName.textContent = presetChampion.name;
    } else if (!fullLocked && avatar && championName) {
      const champion = pickRandom(selectedChampionsForLane(lane.key));
      avatar.innerHTML = `<img src="${champion.image}" alt="${champion.name}" />`;
      championName.textContent = champion.name;
    }

    if (!positionLocked && playerName) {
      playerName.textContent = pickRandom(getPlayers());
    }
  });
}

function animationDuration() {
  return [650, 1100, 1550][Number(speedRange.value)];
}

function revealStepDuration() {
  return [420, 660, 880][Number(speedRange.value)];
}

function revealPauseDuration() {
  return [120, 180, 240][Number(speedRange.value)];
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function sleepWithCancel(ms, shouldCancel) {
  return new Promise((resolve) => {
    const start = window.performance.now();

    const tick = () => {
      if (shouldCancel()) {
        resolve(false);
        return;
      }

      const elapsed = window.performance.now() - start;
      if (elapsed >= ms) {
        resolve(true);
        return;
      }

      window.setTimeout(tick, Math.min(48, ms - elapsed));
    };

    tick();
  });
}

function assignmentFrom(source, teamKey, laneKey) {
  return source?.[teamKey]?.find((entry) => entry.lane === laneKey);
}

function createDraftOverlay() {
  let overlay = document.querySelector("#draftAnimationOverlay");
  if (overlay) return overlay;

  overlay = document.createElement("section");
  overlay.id = "draftAnimationOverlay";
  overlay.className = "draft-animation-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.setAttribute("aria-live", "polite");
  document.body.append(overlay);
  return overlay;
}

function renderDraftOverlay(assignmentsSource) {
  const overlay = createDraftOverlay();
  overlay.innerHTML = `
    <div class="draft-animation-panel">
      <div class="draft-animation-heading">
        <p class="eyebrow">랜덤 배정</p>
        <h2>라인별 결과 확정</h2>
      </div>
      <div class="draft-animation-list">
        ${lanes
          .map((lane) => {
            const blueRow = assignmentFrom(assignmentsSource, "blue", lane.key);
            const redRow = assignmentFrom(assignmentsSource, "red", lane.key);
            return `
              <div class="draft-animation-row" data-lane="${lane.key}">
                ${draftOverlaySlotMarkup("blue", lane, blueRow)}
                <div class="draft-animation-lane">${lane.label}</div>
                ${draftOverlaySlotMarkup("red", lane, redRow)}
                <div class="draft-animation-action">
                  <button class="draft-animation-run-button" type="button" data-lane="${lane.key}">배정</button>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
      <div class="draft-animation-footer">
        <button class="draft-animation-cancel-button" type="button">중지</button>
        <button class="draft-animation-done-button" type="button" disabled aria-disabled="true" aria-hidden="true">
          완료
        </button>
      </div>
    </div>
  `;
  return overlay;
}

function draftOverlaySlotMarkup(teamKey, lane, row) {
  const team = teams.find((item) => item.key === teamKey);
  return `
    <article class="draft-animation-slot ${teamKey}" data-team="${teamKey}" data-lane="${lane.key}">
      <span class="draft-animation-avatar">
        <span class="placeholder-avatar">대기</span>
      </span>
      <span class="draft-animation-copy">
        <span class="draft-animation-team">${team.label}</span>
        <strong class="draft-animation-player">대기 중</strong>
        <span class="draft-animation-champion">${row ? "결정 대기" : "배정 전"}</span>
      </span>
    </article>
  `;
}

function updateDraftOverlaySlot(slot, row) {
  const avatar = slot.querySelector(".draft-animation-avatar");
  const player = slot.querySelector(".draft-animation-player");
  const champion = slot.querySelector(".draft-animation-champion");
  avatar.innerHTML = `<img src="${row.champion.image}" alt="${escapeHtml(row.champion.name)}" />`;
  player.textContent = row.player;
  champion.textContent = row.champion.name;
}

async function playDraftOverlaySlot(slot, finalRow, laneKey, shouldCancel) {
  if (!slot || !finalRow || shouldCancel()) return false;

  slot.classList.add("is-active");
  const previewInterval = window.setInterval(() => {
    if (shouldCancel()) {
      window.clearInterval(previewInterval);
      return;
    }

    updateDraftOverlaySlot(slot, {
      player: pickRandom(getPlayers()),
      champion: pickRandom(selectedChampionsForLane(laneKey))
    });
  }, 82);

  try {
    const completedShuffle = await sleepWithCancel(revealStepDuration(), shouldCancel);
    if (!completedShuffle || shouldCancel()) return false;

    updateDraftOverlaySlot(slot, finalRow);
    slot.classList.add("is-final");

    return sleepWithCancel(revealPauseDuration(), shouldCancel);
  } finally {
    window.clearInterval(previewInterval);
    slot.classList.remove("is-active");
  }
}

async function playDraftRevealAnimation(assignmentsSource) {
  const overlay = renderDraftOverlay(assignmentsSource);
  document.documentElement.classList.add("has-draft-overlay-root");
  document.body.classList.add("has-draft-overlay");
  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-visible");
  await sleep(160);
  statusLabel.textContent = "라인별 배정 버튼을 눌러 결과를 확정하세요.";

  return new Promise((resolve, reject) => {
    const completedLaneKeys = new Set();
    let isLaneRunning = false;
    let isCancelled = false;
    let isSettled = false;
    const doneButton = overlay.querySelector(".draft-animation-done-button");
    const cancelButton = overlay.querySelector(".draft-animation-cancel-button");

    const shouldCancel = () => isCancelled;

    const settle = (isCompleted) => {
      if (isSettled) return;
      isSettled = true;
      resolve(isCompleted);
    };

    const setDoneButtonEnabled = (enabled) => {
      doneButton.disabled = !enabled;
      doneButton.setAttribute("aria-disabled", String(!enabled));
      doneButton.setAttribute("aria-hidden", String(!enabled));
      doneButton.classList.toggle("is-visible", enabled);
    };

    const setLaneButtonsDisabled = (disabled) => {
      overlay.querySelectorAll(".draft-animation-run-button").forEach((button) => {
        if (completedLaneKeys.has(button.dataset.lane)) return;
        button.disabled = disabled;
      });
    };

    const cancelDraft = () => {
      if (isSettled || isCancelled) return;
      isCancelled = true;
      setLaneButtonsDisabled(true);
      setDoneButtonEnabled(false);
      cancelButton.disabled = true;
      overlay.classList.remove("is-complete");
      statusLabel.textContent = "배정을 중지했습니다.";
      hideDraftOverlay();
      window.setTimeout(() => settle(false), 240);
    };

    const revealLane = async (button) => {
      if (isCancelled || isLaneRunning || completedLaneKeys.has(button.dataset.lane)) return;

      const lane = getLane(button.dataset.lane);
      const row = overlay.querySelector(`.draft-animation-row[data-lane="${lane.key}"]`);
      const blueSlot = row.querySelector('.draft-animation-slot[data-team="blue"]');
      const redSlot = row.querySelector('.draft-animation-slot[data-team="red"]');

      isLaneRunning = true;
      button.disabled = true;
      button.textContent = "배정 중";
      setLaneButtonsDisabled(true);

      try {
        row.classList.add("is-active-lane");
        statusLabel.textContent = `블루팀 ${lane.label} 결과를 확정하고 있습니다.`;
        const blueCompleted = await playDraftOverlaySlot(
          blueSlot,
          assignmentFrom(assignmentsSource, "blue", lane.key),
          lane.key,
          shouldCancel
        );
        if (!blueCompleted || isCancelled) return;

        statusLabel.textContent = `레드팀 ${lane.label} 결과를 확정하고 있습니다.`;
        const redCompleted = await playDraftOverlaySlot(
          redSlot,
          assignmentFrom(assignmentsSource, "red", lane.key),
          lane.key,
          shouldCancel
        );
        if (!redCompleted || isCancelled) return;

        row.classList.add("is-emphasized");
        statusLabel.textContent = `${lane.label} 배정이 확정되었습니다.`;
        const emphasizedCompleted = await sleepWithCancel(revealPauseDuration() + 520, shouldCancel);
        if (!emphasizedCompleted || isCancelled) return;

        row.classList.remove("is-active-lane", "is-emphasized");
        row.classList.add("is-complete");
        completedLaneKeys.add(lane.key);
        button.textContent = "완료";
        button.classList.add("is-complete");

        if (completedLaneKeys.size === lanes.length) {
          overlay.classList.add("is-complete");
          setDoneButtonEnabled(true);
          statusLabel.textContent = "모든 라인 배정이 완료되었습니다. 완료 버튼을 눌러 결과를 확인하세요.";
        } else {
          setLaneButtonsDisabled(false);
        }
      } catch (error) {
        reject(error);
      } finally {
        isLaneRunning = false;
        if (!isCancelled && completedLaneKeys.size !== lanes.length) {
          setLaneButtonsDisabled(false);
        }
      }
    };

    overlay.onclick = (event) => {
      const cancelTarget = event.target.closest(".draft-animation-cancel-button");
      if (cancelTarget) {
        cancelDraft();
        return;
      }

      const laneButton = event.target.closest(".draft-animation-run-button");
      if (laneButton) {
        revealLane(laneButton);
        return;
      }

      const finishButton = event.target.closest(".draft-animation-done-button");
      if (
        !finishButton ||
        finishButton.disabled ||
        completedLaneKeys.size !== lanes.length ||
        isLaneRunning ||
        isCancelled
      ) {
        return;
      }

      finishButton.disabled = true;
      finishButton.setAttribute("aria-disabled", "true");
      cancelButton.disabled = true;
      statusLabel.textContent = "최종 결과를 팀 배정 보드에 반영합니다.";
      hideDraftOverlay();
      window.setTimeout(() => settle(true), 240);
    };
  });
}

function hideDraftOverlay() {
  const overlay = document.querySelector("#draftAnimationOverlay");
  if (!overlay) return;
  overlay.classList.remove("is-visible", "is-complete");
  overlay.setAttribute("aria-hidden", "true");
  document.documentElement.classList.remove("has-draft-overlay-root");
  document.body.classList.remove("has-draft-overlay");
}

function randomizeDraft() {
  const players = getPlayers();
  if (players.length !== 10) {
    statusLabel.textContent = "참가자 10명을 채운 뒤 랜덤 배정을 시작하세요.";
    return;
  }

  randomizeButton.disabled = true;
  document.body.classList.add("is-randomizing");
  const activeLockCount = lockedCount();
  statusLabel.textContent =
    activeLockCount > 0
      ? `배정 중입니다. 사전 지정과 고정 슬롯 ${activeLockCount}개를 반영합니다.`
      : "배정 중입니다. 팀과 라인을 섞고 있습니다.";

  if (animationToggle?.checked) {
    closePresetMenus();

    (async () => {
      let nextAssignments = null;
      try {
        nextAssignments = createAssignments();
        const completed = await playDraftRevealAnimation(nextAssignments);
        if (!completed) {
          statusLabel.textContent = "배정을 중지했습니다. 기존 화면으로 돌아왔습니다.";
          return;
        }

        assignments = nextAssignments;
        clearPresetPlayers();
        renderAssignments(true);
        pushHistory();
        statusLabel.textContent =
          activeLockCount > 0
            ? "배정 완료. 사전 지정과 고정 옵션을 반영했습니다."
            : "배정 완료. 결과 카드를 클릭하면 챔피언만 다시 뽑습니다.";
      } catch (error) {
        console.error(error);
        if (nextAssignments) {
          assignments = nextAssignments;
          clearPresetPlayers();
          renderAssignments(true);
          pushHistory();
        }
        statusLabel.textContent = "배정은 완료했지만 연출 표시 중 문제가 발생했습니다.";
      } finally {
        hideDraftOverlay();
        document.body.classList.remove("is-randomizing");
        randomizeButton.disabled = false;
      }
    })();
    return;
  }

  const duration = animationDuration();
  const previewInterval = window.setInterval(randomPreview, 95);

  window.setTimeout(() => {
    window.clearInterval(previewInterval);
    assignments = createAssignments();
    clearPresetPlayers();
    renderAssignments(true);
    pushHistory();
    statusLabel.textContent =
      activeLockCount > 0
        ? "배정 완료. 사전 지정과 고정 옵션을 반영했습니다."
        : "배정 완료. 결과 카드를 클릭하면 챔피언만 다시 뽑습니다.";
    document.body.classList.remove("is-randomizing");
    randomizeButton.disabled = false;
  }, duration);
}

function rerollCard(teamKey, laneKey) {
  if (!assignments) return;
  const row = assignments[teamKey].find((entry) => entry.lane === laneKey);
  if (!row) return;
  if (isFullLocked(row)) {
    statusLabel.textContent = `${teamLabel(teamKey)} ${getLane(laneKey).label} 전체 고정을 해제한 뒤 다시 뽑을 수 있습니다.`;
    return;
  }

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

function toggleAssignmentLock(teamKey, laneKey, lockType) {
  const row = getAssignment(teamKey, laneKey);
  if (!row) return;

  row.locks = { ...defaultLocks(), ...(row.locks || {}) };
  if (lockType === "all") {
    row.locks.all = !row.locks.all;
    if (row.locks.all) row.locks.position = false;
  } else {
    const nextPositionLock = row.locks.all || !row.locks.position;
    row.locks.all = false;
    row.locks.position = nextPositionLock;
  }
  renderAssignments(false);

  const lockLabel = lockType === "all" ? "전체" : "포지션";
  const objectParticle = lockType === "all" ? "를" : "을";
  const stateLabel = row.locks[lockType] ? "고정했습니다" : "고정을 해제했습니다";
  statusLabel.textContent = `${teamLabel(teamKey)} ${getLane(laneKey).label} ${lockLabel}${objectParticle} ${stateLabel}.`;
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
  syncPresetChampionsWithPools(activeLaneKey);
  if (!assignments) renderEmptyBoard();
  statusLabel.textContent = `${getLane(activeLaneKey).label} 후보에서 ${champion.name}을 ${isSelected ? "활성화" : "비활성화"}했습니다.`;
}

function restoreActiveLanePool() {
  const lane = getLane(activeLaneKey);
  selectedChampionIdsByLane[activeLaneKey] = new Set(defaultLaneChampionIds[activeLaneKey] || []);
  syncChampionPool();
  syncPresetChampionsWithPools(activeLaneKey);
  if (!assignments) renderEmptyBoard();
  statusLabel.textContent = `${lane.label} 후보를 LOL.PS 기본값으로 되돌렸습니다.`;
}

function selectAllForActiveLane() {
  const lane = getLane(activeLaneKey);
  selectedChampionIdsByLane[activeLaneKey] = new Set(allChampions.map((champion) => champion.id));
  syncChampionPool();
  syncPresetChampionsWithPools(activeLaneKey);
  if (!assignments) renderEmptyBoard();
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
  clearPresetPlayers();
  updateFilledCount();
  renderPlayerPool();
  assignments = null;
  renderEmptyBoard();
  statusLabel.textContent = "입력을 초기화했습니다. 참가자 10명을 다시 입력하세요.";
});

addListener(randomizeButton, "click", randomizeDraft);

addListener(teamBoard, "click", (event) => {
  const presetTrigger = event.target.closest(".preset-trigger");
  if (presetTrigger) {
    togglePresetMenu(presetTrigger);
    return;
  }

  const presetOption = event.target.closest(".preset-option");
  if (presetOption) {
    const picker = presetOption.closest(".preset-picker");
    if (picker.dataset.presetType === "champion") {
      setPresetChampion(picker.dataset.team, picker.dataset.lane, presetOption.dataset.championId || "");
    } else {
      setPresetPlayer(picker.dataset.team, picker.dataset.lane, presetOption.dataset.playerName || "");
    }
    return;
  }

  const lockButton = event.target.closest(".lock-button");
  if (lockButton) {
    const card = lockButton.closest(".assignment-card");
    toggleAssignmentLock(card.dataset.team, card.dataset.lane, lockButton.dataset.lockType);
    return;
  }

  const card = event.target.closest(".assignment-card");
  if (!card || card.classList.contains("is-empty")) return;
  rerollCard(card.dataset.team, card.dataset.lane);
});

addListener(teamBoard, "keydown", (event) => {
  const presetTrigger = event.target.closest(".preset-trigger");
  if (presetTrigger && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    togglePresetMenu(presetTrigger);
    return;
  }

  if (event.target.closest(".preset-option") && event.key === "Escape") {
    closePresetMenus();
    return;
  }

  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".assignment-card");
  if (!card || card.classList.contains("is-empty") || event.target.closest(".lock-button")) return;
  event.preventDefault();
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
addListener(document, "click", (event) => {
  if (!event.target.closest(".preset-picker")) closePresetMenus();
});
addListener(document, "keydown", (event) => {
  if (event.key === "Escape") closePresetMenus();
});
