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
const defaultPlayerSkillProfiles = {
  상현: { top: 82, jungle: 68, mid: 74, bot: 61, support: 59 },
  지안: { top: 55, jungle: 72, mid: 81, bot: 66, support: 70 },
  지혜: { top: 61, jungle: 58, mid: 74, bot: 83, support: 76 },
  지상: { top: 79, jungle: 64, mid: 69, bot: 62, support: 55 },
  예진: { top: 48, jungle: 63, mid: 71, bot: 78, support: 82 },
  예완: { top: 67, jungle: 84, mid: 60, bot: 57, support: 65 },
  성원: { top: 74, jungle: 76, mid: 58, bot: 69, support: 52 },
  강산: { top: 70, jungle: 59, mid: 83, bot: 64, support: 61 },
  강희: { top: 57, jungle: 69, mid: 62, bot: 75, support: 80 },
  은우: { top: 64, jungle: 55, mid: 72, bot: 85, support: 68 },
  "태영(김)": { top: 86, jungle: 61, mid: 66, bot: 58, support: 54 },
  "태영(윤)": { top: 59, jungle: 78, mid: 73, bot: 60, support: 67 },
  선진: { top: 63, jungle: 70, mid: 55, bot: 82, support: 74 },
  재윤: { top: 77, jungle: 57, mid: 80, bot: 65, support: 59 },
  동근: { top: 72, jungle: 83, mid: 61, bot: 56, support: 62 },
  승헌: { top: 66, jungle: 62, mid: 84, bot: 71, support: 57 },
  인의: { top: 54, jungle: 74, mid: 68, bot: 63, support: 86 },
  예지: { top: 58, jungle: 60, mid: 76, bot: 79, support: 81 }
};
let playerPoolNames = loadPlayerPoolNames();
let selectedPlayerNames = new Set(sortPlayerNames(playerPoolNames).slice(0, 10));
let playerSkillScores = loadPlayerSkillScores();
let databaseStorageReady = false;
let databaseStatusMessage = "";

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
let sessionRecords = [];
let lastRecordedSignature = "";
let balanceRules = loadBalanceRules();
let balanceAssignments = null;
let balanceDragState = null;
let pendingBalanceSwapSlots = new Set();
let balanceScoreSort = { key: "name", direction: "asc" };

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
const fearlessToggle = document.querySelector("#fearlessToggle");
const resetSessionButton = document.querySelector("#resetSessionButton");
const speedRange = document.querySelector("#speedRange");
const speedLabel = document.querySelector("#speedLabel");
const statusLabel = document.querySelector("#statusLabel");
const laneTabs = document.querySelector("#laneTabs");
const championPool = document.querySelector("#championPool");
const poolCount = document.querySelector("#poolCount");
const restorePoolButton = document.querySelector("#restorePoolButton");
const selectAllPoolButton = document.querySelector("#selectAllPoolButton");
const historyList = document.querySelector("#historyList");
const playSessionButton = document.querySelector("#playSessionButton");
const pageSwitch = document.querySelector("#pageSwitch");
const pageToggleButtons = document.querySelectorAll("[data-page-target]");
const pageViews = document.querySelectorAll("[data-page-view]");
const topnav = document.querySelector(".topnav");
const balanceScoreGrid = document.querySelector("#balanceScoreGrid");
const settingsNewPlayerInput = document.querySelector("#settingsNewPlayerInput");
const settingsAddPlayerButton = document.querySelector("#settingsAddPlayerButton");
const settingsPlayerList = document.querySelector("#settingsPlayerList");
const settingsStatusLabel = document.querySelector("#settingsStatusLabel");
const balanceStatusLabel = document.querySelector("#balanceStatusLabel");
const balanceParticipantPool = document.querySelector("#balanceParticipantPool");
const balanceSelectedPlayerCount = document.querySelector("#balanceSelectedPlayerCount");
const balanceTogetherSelects = [...document.querySelectorAll("[data-balance-together-player]")];
const balanceSeparateFirst = document.querySelector("#balanceSeparateFirst");
const balanceSeparateSecond = document.querySelector("#balanceSeparateSecond");
const balanceFixedPlayer = document.querySelector("#balanceFixedPlayer");
const balanceFixedLane = document.querySelector("#balanceFixedLane");
const balanceExcludedPlayer = document.querySelector("#balanceExcludedPlayer");
const balanceExcludedLane = document.querySelector("#balanceExcludedLane");
const balanceAddTogetherButton = document.querySelector("#balanceAddTogetherButton");
const balanceAddSeparateButton = document.querySelector("#balanceAddSeparateButton");
const balanceAddFixedButton = document.querySelector("#balanceAddFixedButton");
const balanceAddExcludedButton = document.querySelector("#balanceAddExcludedButton");
const balanceTogetherList = document.querySelector("#balanceTogetherList");
const balanceSeparateList = document.querySelector("#balanceSeparateList");
const balanceFixedList = document.querySelector("#balanceFixedList");
const balanceExcludedList = document.querySelector("#balanceExcludedList");
const balanceStartButton = document.querySelector("#balanceStartButton");
const balanceClearButton = document.querySelector("#balanceClearButton");
const balanceSummary = document.querySelector("#balanceSummary");
const balanceBoard = document.querySelector("#balanceBoard");

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

function sessionUsedChampionIds() {
  return new Set(
    sessionRecords.flatMap((record) =>
      record.lanes.flatMap((laneRecord) => [
        laneRecord.blue.champion.id,
        laneRecord.red.champion.id
      ])
    )
  );
}

function championsForDraftLane(laneKey, bannedChampionIds = new Set()) {
  const lanePool = selectedChampionsForLane(laneKey);
  if (bannedChampionIds.size === 0) return lanePool;

  const filteredLanePool = lanePool.filter((champion) => !bannedChampionIds.has(champion.id));
  if (filteredLanePool.length > 0) return filteredLanePool;

  const globalFallback = allChampions
    .filter((champion) => !bannedChampionIds.has(champion.id))
    .map(championObject);

  return globalFallback.length > 0 ? globalFallback : lanePool;
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

function sortPlayerNames(names) {
  return [...names].sort(koreanNameSorter.compare);
}

function orderedPlayerPoolNames() {
  return sortPlayerNames(playerPoolNames);
}

function loadPlayerPoolNames() {
  return [...defaultPlayerPool];
}

function savePlayerPoolNames(shouldSync = true) {
  if (shouldSync) syncPlayerPoolToDatabase();
}

function clampScore(value, fallback = 50) {
  const score = Number(value);
  if (!Number.isFinite(score)) return fallback;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function defaultPlayerScores(name = "") {
  const profile = defaultPlayerSkillProfiles[name];
  return Object.fromEntries(lanes.map((lane) => [lane.key, profile?.[lane.key] ?? 50]));
}

function sanitizePlayerScores(rawScores = {}, playerName = "") {
  const fallbackScores = defaultPlayerScores(playerName);
  return Object.fromEntries(
    lanes.map((lane) => [lane.key, clampScore(rawScores[lane.key], fallbackScores[lane.key])])
  );
}

function loadPlayerSkillScores() {
  return {};
}

function pairKey(firstName, secondName) {
  return [firstName, secondName].sort(koreanNameSorter.compare).join("::");
}

function groupKey(members = []) {
  return [...members].sort(koreanNameSorter.compare).join("::");
}

function sanitizeTogetherRules(rules = []) {
  const seen = new Set();
  return (Array.isArray(rules) ? rules : [])
    .map((rule) => {
      const members = uniqueNames(
        Array.isArray(rule?.members)
          ? rule.members
          : [rule?.first || rule?.a || "", rule?.second || rule?.b || ""]
      ).slice(0, 5);
      return { members };
    })
    .filter((rule) => {
      if (rule.members.length < 2) return false;
      const key = groupKey(rule.members);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function sanitizePairRules(rules = []) {
  const seen = new Set();
  return (Array.isArray(rules) ? rules : [])
    .map((rule) => {
      const first = normalizeName(rule?.first || rule?.a || "");
      const second = normalizeName(rule?.second || rule?.b || "");
      return { first, second };
    })
    .filter((rule) => {
      if (!rule.first || !rule.second || rule.first === rule.second) return false;
      const key = pairKey(rule.first, rule.second);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function sanitizeFixedPositionRules(rules = []) {
  const seenPlayers = new Set();
  return (Array.isArray(rules) ? rules : [])
    .map((rule) => {
      const player = normalizeName(rule?.player || "");
      const lane = getLane(rule?.lane)?.key || "";
      return { player, lane };
    })
    .filter((rule) => {
      if (!rule.player || !rule.lane || seenPlayers.has(rule.player)) return false;
      seenPlayers.add(rule.player);
      return true;
    });
}

function sanitizeExcludedPositionRules(rules = []) {
  const seen = new Set();
  return (Array.isArray(rules) ? rules : [])
    .map((rule) => {
      const player = normalizeName(rule?.player || "");
      const lane = getLane(rule?.lane)?.key || "";
      return { player, lane };
    })
    .filter((rule) => {
      const key = `${rule.player}::${rule.lane}`;
      if (!rule.player || !rule.lane || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function sanitizeBalanceRules(rawRules = {}) {
  return {
    together: sanitizeTogetherRules(rawRules.together),
    separate: sanitizePairRules(rawRules.separate),
    fixed: sanitizeFixedPositionRules(rawRules.fixed),
    excluded: sanitizeExcludedPositionRules(rawRules.excluded)
  };
}

function loadBalanceRules() {
  return sanitizeBalanceRules();
}

function saveBalanceRules() {
  if (!databaseStorageReady) return;
  apiRequest("/api/balance-rules", {
    method: "PUT",
    body: JSON.stringify(balanceRules)
  }).catch(() => {
    databaseStorageReady = false;
    databaseStatusMessage = "PostgreSQL 저장 실패: 밸런스 규칙이 저장되지 않았습니다.";
  });
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const error = new Error(`API request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.status === 204 ? null : response.json();
}

async function loadDatabaseState() {
  try {
    const data = await apiRequest("/api/state", { cache: "no-store" });
    databaseStorageReady = Boolean(data.ready);
    databaseStatusMessage = databaseStorageReady
      ? "PostgreSQL 저장소에 연결되었습니다."
      : data.configured
        ? `PostgreSQL 연결 실패: 변경사항이 저장되지 않습니다. ${data.error || ""}`.trim()
        : "PostgreSQL 연결 정보가 없어 변경사항이 저장되지 않습니다.";
    const databasePlayerNames = Array.isArray(data.playerPoolNames) ? data.playerPoolNames : [];
    playerPoolNames = databaseStorageReady
      ? uniqueNames(databasePlayerNames)
      : uniqueNames([...defaultPlayerPool, ...databasePlayerNames]);
    playerSkillScores = sanitizeSkillScoreMap(data.playerSkillScores || {});
    balanceRules = sanitizeBalanceRules(data.balanceRules || {});
    sessionRecords = Array.isArray(data.sessionRecords) ? data.sessionRecords : [];
    selectedPlayerNames = new Set(sortPlayerNames(playerPoolNames).slice(0, 10));
  } catch {
    databaseStorageReady = false;
    databaseStatusMessage = "PostgreSQL API에 연결할 수 없어 변경사항이 저장되지 않습니다.";
  }
}

function sanitizeSkillScoreMap(rawScores = {}) {
  return Object.fromEntries(
    Object.entries(rawScores)
      .map(([name, scores]) => {
        const normalizedName = normalizeName(name);
        return [normalizedName, sanitizePlayerScores(scores, normalizedName)];
      })
      .filter(([name]) => Boolean(name))
  );
}

function syncPlayerPoolToDatabase() {
  if (!databaseStorageReady) return;
  apiRequest("/api/players/sync", {
    method: "POST",
    body: JSON.stringify({ names: playerPoolNames })
  }).catch(() => {
    databaseStorageReady = false;
    databaseStatusMessage = "PostgreSQL 저장 실패: 플레이어 명단이 저장되지 않았습니다.";
  });
}

function savePlayerScoreToDatabase(name, laneKey, score) {
  if (!databaseStorageReady) return;
  apiRequest("/api/player-score", {
    method: "PUT",
    body: JSON.stringify({ name, laneKey, score })
  }).catch(() => {
    databaseStorageReady = false;
    databaseStatusMessage = "PostgreSQL 저장 실패: 영향력이 저장되지 않았습니다.";
  });
}

function savePlayerScoresForNameToDatabase(name) {
  if (!databaseStorageReady) return;
  const scores = scoresForPlayer(name);
  lanes.forEach((lane) => {
    savePlayerScoreToDatabase(name, lane.key, scores[lane.key]);
  });
}

function renamePlayerInDatabase(oldName, newName) {
  if (!databaseStorageReady) return;
  apiRequest("/api/players/rename", {
    method: "POST",
    body: JSON.stringify({ oldName, newName })
  }).catch(() => {
    databaseStorageReady = false;
    databaseStatusMessage = "PostgreSQL 저장 실패: 플레이어 이름이 저장되지 않았습니다.";
  });
}

function deletePlayerFromDatabase(name) {
  if (!databaseStorageReady) return;
  apiRequest("/api/players/delete", {
    method: "POST",
    body: JSON.stringify({ name })
  }).catch(() => {
    databaseStorageReady = false;
    databaseStatusMessage = "PostgreSQL 저장 실패: 플레이어 삭제가 저장되지 않았습니다.";
  });
}

async function saveSessionRecordToDatabase(record) {
  if (!databaseStorageReady) return null;
  try {
    const data = await apiRequest("/api/session-records", {
      method: "POST",
      body: JSON.stringify({ lanes: record.lanes })
    });
    return data.record || null;
  } catch {
    databaseStorageReady = false;
    databaseStatusMessage = "PostgreSQL 저장 실패: 세션 기록이 저장되지 않았습니다.";
    return null;
  }
}

function resetSessionRecordsInDatabase() {
  if (!databaseStorageReady) return;
  apiRequest("/api/session-records", { method: "DELETE" }).catch(() => {
    databaseStorageReady = false;
    databaseStatusMessage = "PostgreSQL 저장 실패: 세션 초기화가 저장되지 않았습니다.";
  });
}

function scoresForPlayer(name) {
  if (!playerSkillScores[name]) {
    playerSkillScores[name] = defaultPlayerScores(name);
  }
  return playerSkillScores[name];
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
  const presetPlayers = orderedPlayerPoolNames().filter((name) => selectedPlayerNames.has(name)).slice(0, 10);

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
  renderBalanceParticipantPool();
  renderBalanceScores();
  renderBalanceControls();
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

  const orderedNames = orderedPlayerPoolNames();

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

function renderBalanceParticipantPool() {
  if (!balanceParticipantPool) return;

  if (balanceSelectedPlayerCount) {
    balanceSelectedPlayerCount.textContent = selectedPlayerNames.size;
  }

  balanceParticipantPool.innerHTML = orderedPlayerPoolNames()
    .map((name) => {
      const isSelected = selectedPlayerNames.has(name);
      return `
        <button class="balance-participant-card ${isSelected ? "is-selected" : ""}" type="button" data-player-name="${escapeHtml(name)}" aria-pressed="${isSelected}">
          <span>${escapeHtml(name)}</span>
        </button>
      `;
    })
    .join("");
}

function setSettingsStatus(message) {
  if (settingsStatusLabel) settingsStatusLabel.textContent = message;
}

function renderSettingsPlayers() {
  if (!settingsPlayerList) return;

  settingsPlayerList.innerHTML = orderedPlayerPoolNames()
    .map(
      (name) => `
        <article class="settings-player-row" data-player-name="${escapeHtml(name)}">
          <input
            class="settings-player-name-input"
            type="text"
            maxlength="12"
            value="${escapeHtml(name)}"
            aria-label="${escapeHtml(name)} 이름 수정"
          />
          <button class="mini-button settings-rename-button" type="button" data-action="rename">저장</button>
          <button class="mini-button settings-delete-button" type="button" data-action="delete">삭제</button>
        </article>
      `
    )
    .join("");
}

function rerenderPlayerViews() {
  syncPresetPlayersWithInputs();
  updateFilledCount();
  renderPlayerPool();
  renderBalanceParticipantPool();
  renderSettingsPlayers();
  renderBalanceScores();
  renderBalanceControls();
  if (!assignments) renderEmptyBoard();
}

function addPlayerNameToPool(rawName, shouldAddToDraft = false) {
  const name = normalizeName(rawName);
  if (!name) return false;

  const isNewPlayer = !playerPoolNames.includes(name);
  if (isNewPlayer) {
    playerPoolNames = [...playerPoolNames, name];
    scoresForPlayer(name);
    savePlayerPoolNames();
    savePlayerScoresForNameToDatabase(name);
  }

  if (shouldAddToDraft && addPlayerToInput(name)) {
    selectedPlayerNames.add(name);
  }

  rerenderPlayerViews();
  setSettingsStatus(isNewPlayer ? `${name}을 플레이어 풀에 추가했습니다.` : `${name}은 이미 플레이어 풀에 있습니다.`);
  return true;
}

function renamePlayerName(oldName, rawNewName) {
  const newName = normalizeName(rawNewName);
  if (!oldName || !newName) {
    setSettingsStatus("이름을 입력하세요.");
    return false;
  }

  if (oldName === newName) {
    setSettingsStatus("변경된 이름이 없습니다.");
    return false;
  }

  if (playerPoolNames.includes(newName)) {
    setSettingsStatus(`${newName}은 이미 존재하는 이름입니다.`);
    return false;
  }

  playerPoolNames = playerPoolNames.map((name) => (name === oldName ? newName : name));

  if (selectedPlayerNames.has(oldName)) {
    selectedPlayerNames.delete(oldName);
    selectedPlayerNames.add(newName);
  }

  playerInputs.querySelectorAll("input").forEach((input) => {
    if (normalizeName(input.value) === oldName) input.value = newName;
  });

  Object.keys(presetPlayersBySlot).forEach((key) => {
    if (presetPlayersBySlot[key] === oldName) presetPlayersBySlot[key] = newName;
  });

  if (assignments) {
    Object.values(assignments)
      .flat()
      .forEach((row) => {
        if (row.player === oldName) row.player = newName;
      });
    renderAssignments(false);
    updatePlaySessionButton();
  }

  playerSkillScores[newName] = playerSkillScores[oldName] || defaultPlayerScores(newName);
  delete playerSkillScores[oldName];
  renameBalancePlayerReferences(oldName, newName);
  savePlayerPoolNames(false);
  renamePlayerInDatabase(oldName, newName);
  rerenderPlayerViews();
  setSettingsStatus(`${oldName}을 ${newName}으로 변경했습니다.`);
  return true;
}

function deletePlayerName(name) {
  if (!playerPoolNames.includes(name)) return;

  playerPoolNames = playerPoolNames.filter((playerName) => playerName !== name);
  selectedPlayerNames.delete(name);
  removePlayerFromInputs(name);
  delete playerSkillScores[name];

  Object.keys(presetPlayersBySlot).forEach((key) => {
    if (presetPlayersBySlot[key] === name) presetPlayersBySlot[key] = "";
  });

  if (assignments && Object.values(assignments).flat().some((row) => row.player === name)) {
    assignments = null;
    lastRecordedSignature = "";
    updatePlaySessionButton();
  }

  deleteBalancePlayerReferences(name);
  savePlayerPoolNames(false);
  deletePlayerFromDatabase(name);
  rerenderPlayerViews();
  setSettingsStatus(`${name}을 플레이어 풀에서 삭제했습니다.`);
}

function averageScore(name) {
  const scores = scoresForPlayer(name);
  const total = lanes.reduce((sum, lane) => sum + clampScore(scores[lane.key], 50), 0);
  return Math.round(total / lanes.length);
}

function defaultBalanceScoreSortDirection(key) {
  return key === "name" ? "asc" : "desc";
}

function balanceScoreSortButton(key, label) {
  const isActive = balanceScoreSort.key === key;
  const nextDirection = isActive
    ? balanceScoreSort.direction === "asc"
      ? "내림차순"
      : "오름차순"
    : defaultBalanceScoreSortDirection(key) === "asc"
      ? "오름차순"
      : "내림차순";
  const indicator = isActive ? (balanceScoreSort.direction === "asc" ? "오름차순" : "내림차순") : "정렬";
  return `
    <button
      class="balance-score-sort-button ${isActive ? "is-active" : ""}"
      type="button"
      data-score-sort="${key}"
      aria-pressed="${isActive}"
      aria-label="${label} ${nextDirection} 정렬"
    >
      <span>${label}</span>
      <small>${indicator}</small>
    </button>
  `;
}

function sortedBalanceScoreNames() {
  const names = orderedPlayerPoolNames();
  const { key, direction } = balanceScoreSort;
  const directionMultiplier = direction === "asc" ? 1 : -1;

  if (key === "name") {
    return direction === "asc" ? names : [...names].reverse();
  }

  return names.sort((firstName, secondName) => {
    const firstValue = key === "average" ? averageScore(firstName) : laneScore(firstName, key);
    const secondValue = key === "average" ? averageScore(secondName) : laneScore(secondName, key);
    const valueDiff = (firstValue - secondValue) * directionMultiplier;
    return valueDiff || koreanNameSorter.compare(firstName, secondName);
  });
}

function toggleBalanceScoreSort(key) {
  if (!key) return;

  balanceScoreSort = {
    key,
    direction:
      balanceScoreSort.key === key
        ? balanceScoreSort.direction === "asc"
          ? "desc"
          : "asc"
        : defaultBalanceScoreSortDirection(key)
  };
  renderBalanceScores();
}

function renderBalanceScores() {
  if (!balanceScoreGrid) return;

  balanceScoreGrid.innerHTML = `
    <div class="balance-score-head" role="row">
      ${balanceScoreSortButton("name", "플레이어")}
      ${lanes.map((lane) => balanceScoreSortButton(lane.key, lane.label)).join("")}
      ${balanceScoreSortButton("average", "평균")}
      <span>수정</span>
    </div>
    ${sortedBalanceScoreNames()
      .map((name) => {
        const scores = scoresForPlayer(name);
        return `
          <article class="balance-player-row" data-player-name="${escapeHtml(name)}">
            <div class="balance-player-name">${escapeHtml(name)}</div>
            ${lanes
              .map(
                (lane) => `
                <label class="balance-score-field">
                  <span>${lane.label}</span>
                  <input
                    class="balance-score-input"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    max="100"
                    step="1"
                    value="${clampScore(scores[lane.key], 50)}"
                    data-player-name="${escapeHtml(name)}"
                    data-lane="${lane.key}"
                    aria-label="${escapeHtml(name)} ${lane.label} 영향력"
                    disabled
                  />
                </label>
              `
              )
              .join("")}
            <div class="balance-average" aria-label="${escapeHtml(name)} 평균 영향력">
              <span class="balance-average-value">${averageScore(name)}</span>
            </div>
            <button class="mini-button balance-score-edit-button" type="button" data-score-action="edit" data-player-name="${escapeHtml(name)}">
              수정
            </button>
          </article>
        `;
      })
      .join("")}
  `;
}

function updateBalanceAverage(name) {
  const row = [...(balanceScoreGrid?.querySelectorAll(".balance-player-row") || [])].find(
    (item) => item.dataset.playerName === name
  );
  const average = row?.querySelector(".balance-average-value");
  if (average) average.textContent = averageScore(name);
}

function rowAverageFromInputs(row) {
  if (!row) return 0;
  const inputs = [...row.querySelectorAll(".balance-score-input")];
  if (inputs.length === 0) return 0;
  const total = inputs.reduce((sum, input) => sum + clampScore(input.value, 50), 0);
  return Math.round(total / inputs.length);
}

function updateBalanceRowAverage(row) {
  const average = row?.querySelector(".balance-average-value");
  if (average) average.textContent = rowAverageFromInputs(row);
}

function setBalanceScoreRowEditing(row, isEditing) {
  if (!row) return;
  row.classList.toggle("is-editing", isEditing);
  row.querySelectorAll(".balance-score-input").forEach((input) => {
    input.disabled = !isEditing;
  });
  const button = row.querySelector(".balance-score-edit-button");
  if (button) {
    button.dataset.scoreAction = isEditing ? "save" : "edit";
    button.textContent = isEditing ? "저장" : "수정";
  }
}

function saveBalanceScoreRow(row) {
  if (!row) return;
  const name = row.dataset.playerName;
  if (!name) return;

  row.querySelectorAll(".balance-score-input").forEach((input) => {
    const laneKey = input.dataset.lane;
    if (!laneKey) return;
    const score = clampScore(input.value, scoresForPlayer(name)[laneKey]);
    input.value = String(score);
    scoresForPlayer(name)[laneKey] = score;
    savePlayerScoreToDatabase(name, laneKey, score);
  });

  updateBalanceAverage(name);
  setBalanceScoreRowEditing(row, false);
  setSettingsStatus(
    databaseStorageReady
      ? `${name}의 라인별 영향력을 저장했습니다.`
      : "PostgreSQL 연결이 없어 화면에만 반영됐고 저장되지 않았습니다."
  );
  if (balanceAssignments) {
    updateBalanceAssignmentScores(balanceAssignments);
    renderBalanceBoard(false);
  }
  renderBalanceScores();
}

function updateBalanceScore(input) {
  if (input.disabled) return;
  updateBalanceRowAverage(input.closest(".balance-player-row"));
}

function settleBalanceScore(input) {
  if (input.disabled) return;
  const name = input.dataset.playerName;
  const laneKey = input.dataset.lane;
  if (!name || !laneKey) return;

  const currentScore = scoresForPlayer(name)[laneKey];
  if (input.value === "") {
    input.value = String(clampScore(currentScore, 50));
    return;
  }

  updateBalanceScore(input);
}

function handleBalanceScoreAction(button) {
  const row = button.closest(".balance-player-row");
  if (!row) return;

  if (button.dataset.scoreAction === "save") {
    saveBalanceScoreRow(row);
    return;
  }

  balanceScoreGrid.querySelectorAll(".balance-player-row.is-editing").forEach((editingRow) => {
    if (editingRow !== row) setBalanceScoreRowEditing(editingRow, false);
  });
  setBalanceScoreRowEditing(row, true);
  row.querySelector(".balance-score-input")?.focus();
  setSettingsStatus(`${row.dataset.playerName}의 라인별 영향력을 수정합니다.`);
}

function setBalanceStatus(message) {
  if (balanceStatusLabel) balanceStatusLabel.textContent = message;
}

function activeBalancePlayers() {
  return sortPlayerNames(uniqueNames(getPlayers()));
}

function balanceOptionMarkup(players, selectedPlayer = "") {
  const orderedPlayers = sortPlayerNames(players);
  return [
    `<option value="" ${selectedPlayer ? "" : "selected"}>미지정</option>`,
    ...orderedPlayers.map(
      (player) =>
        `<option value="${escapeHtml(player)}" ${player === selectedPlayer ? "selected" : ""}>${escapeHtml(player)}</option>`
    )
  ].join("");
}

function balanceLaneOptionMarkup(selectedLane = "") {
  return [
    `<option value="" ${selectedLane ? "" : "selected"}>미지정</option>`,
    ...lanes.map(
      (lane) =>
        `<option value="${lane.key}" ${lane.key === selectedLane ? "selected" : ""}>${lane.label}</option>`
    )
  ].join("");
}

function balanceRuleSelects() {
  return [...document.querySelectorAll(".balance-rule-form select")];
}

function balanceSelectLabel(select) {
  return select.selectedOptions?.[0]?.textContent || "미지정";
}

function closeBalanceCustomSelects(exceptSelect = null) {
  document.querySelectorAll(".balance-custom-select.is-open").forEach((customSelect) => {
    if (customSelect === exceptSelect) return;
    customSelect.classList.remove("is-open");
    customSelect.querySelector(".balance-select-trigger")?.setAttribute("aria-expanded", "false");
  });
}

function renderBalanceCustomSelect(select) {
  if (!select) return;

  select.classList.add("is-native-balance-select");
  let customSelect = select.nextElementSibling;
  if (!customSelect?.classList.contains("balance-custom-select")) {
    customSelect = document.createElement("span");
    customSelect.className = "balance-custom-select";
    select.after(customSelect);
  }

  customSelect.dataset.value = select.value;
  customSelect.innerHTML = `
    <button class="balance-select-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" ${select.disabled ? "disabled" : ""}>
      <span>${escapeHtml(balanceSelectLabel(select))}</span>
      <span class="balance-select-arrow" aria-hidden="true">⌄</span>
    </button>
    <span class="balance-select-menu" role="listbox" aria-label="${escapeHtml(select.getAttribute("aria-label") || "선택")}">
      ${[...select.options]
        .map(
          (option) => `
            <button
              class="balance-select-option ${option.value === select.value ? "is-selected" : ""}"
              type="button"
              role="option"
              aria-selected="${option.value === select.value}"
              data-value="${escapeHtml(option.value)}"
            >
              ${escapeHtml(option.textContent)}
            </button>
          `
        )
        .join("")}
    </span>
  `;
}

function renderBalanceCustomSelects() {
  balanceRuleSelects().forEach(renderBalanceCustomSelect);
}

function visibleBalanceRulesForPlayers(players) {
  const playerSet = new Set(players);
  return {
    together: balanceRules.together.filter((rule) => rule.members.every((player) => playerSet.has(player))),
    separate: balanceRules.separate.filter((rule) => playerSet.has(rule.first) && playerSet.has(rule.second)),
    fixed: balanceRules.fixed.filter((rule) => playerSet.has(rule.player)),
    excluded: balanceRules.excluded.filter((rule) => playerSet.has(rule.player))
  };
}

function balanceRuleListMarkup(rules, type) {
  if (rules.length === 0) {
    const emptyText = {
      together: "함께 묶인 구성이 없습니다.",
      separate: "분리할 구성이 없습니다.",
      fixed: "고정된 포지션이 없습니다.",
      excluded: "제외된 포지션이 없습니다."
    }[type];
    return `<p class="balance-rule-empty">${emptyText}</p>`;
  }

  return rules
    .map((rule, index) => {
      const label = (() => {
        if (type === "together") return rule.members.map(escapeHtml).join(" · ");
        if (type === "fixed") return `${escapeHtml(rule.player)} · ${getLane(rule.lane).label}`;
        if (type === "excluded") return `${escapeHtml(rule.player)} · ${getLane(rule.lane).label} 제외`;
        return `${escapeHtml(rule.first)} · ${escapeHtml(rule.second)}`;
      })();
      return `
        <article class="balance-rule-chip">
          <span>${label}</span>
          <button type="button" aria-label="${label} 삭제" data-balance-rule-type="${type}" data-rule-index="${index}">삭제</button>
        </article>
      `;
    })
    .join("");
}

function clearBalanceResultIfInvalid() {
  if (!balanceAssignments) return;

  const activePlayers = new Set(activeBalancePlayers());
  const assignedPlayers = Object.values(balanceAssignments)
    .flat()
    .filter((row) => row?.player)
    .map((row) => row.player);
  const isInvalid =
    activePlayers.size !== 10 ||
    assignedPlayers.length !== 10 ||
    assignedPlayers.some((player) => !activePlayers.has(player));

  if (isInvalid) {
    balanceAssignments = null;
    renderBalanceBoard(false);
  }
}

function renderBalanceControls() {
  const players = activeBalancePlayers();
  const rules = visibleBalanceRulesForPlayers(players);
  const hasEnoughPlayers = players.length >= 2;

  [
    balanceSeparateFirst,
    balanceSeparateSecond,
    balanceFixedPlayer,
    balanceExcludedPlayer,
    ...balanceTogetherSelects
  ].forEach((select) => {
    if (!select) return;
    const previousValue = select.value;
    select.innerHTML = balanceOptionMarkup(players, previousValue);
    select.disabled = players.length === 0;
  });

  if (balanceFixedLane) balanceFixedLane.innerHTML = balanceLaneOptionMarkup(balanceFixedLane.value);
  if (balanceExcludedLane) balanceExcludedLane.innerHTML = balanceLaneOptionMarkup(balanceExcludedLane.value);

  if (balanceAddTogetherButton) balanceAddTogetherButton.disabled = !hasEnoughPlayers;
  if (balanceAddSeparateButton) balanceAddSeparateButton.disabled = !hasEnoughPlayers;
  if (balanceAddFixedButton) balanceAddFixedButton.disabled = players.length === 0;
  if (balanceAddExcludedButton) balanceAddExcludedButton.disabled = players.length === 0;

  if (balanceTogetherList) balanceTogetherList.innerHTML = balanceRuleListMarkup(rules.together, "together");
  if (balanceSeparateList) balanceSeparateList.innerHTML = balanceRuleListMarkup(rules.separate, "separate");
  if (balanceFixedList) balanceFixedList.innerHTML = balanceRuleListMarkup(rules.fixed, "fixed");
  if (balanceExcludedList) balanceExcludedList.innerHTML = balanceRuleListMarkup(rules.excluded, "excluded");
  renderBalanceCustomSelects();

  updateBalanceStartButton();
  clearBalanceResultIfInvalid();
}

function updateBalanceStartButton() {
  if (!balanceStartButton) return;
  balanceStartButton.disabled = activeBalancePlayers().length !== 10;
}

function addBalanceTogetherRule() {
  const members = uniqueNames(balanceTogetherSelects.map((select) => select.value));
  if (members.length < 2 || members.length > 5) {
    setBalanceStatus("함께 배정은 2명부터 5명까지 선택하세요.");
    return;
  }

  const key = groupKey(members);
  if (balanceRules.together.some((rule) => groupKey(rule.members) === key)) {
    setBalanceStatus("이미 추가된 함께 배정 구성입니다.");
    return;
  }

  const hasSeparateConflict = balanceRules.separate.some(
    (rule) => members.includes(rule.first) && members.includes(rule.second)
  );
  if (hasSeparateConflict) {
    setBalanceStatus("함께 묶은 플레이어 사이에 상대 팀 조건이 이미 있습니다.");
    return;
  }

  balanceRules.together = [...balanceRules.together, { members }];
  saveBalanceRules();
  renderBalanceControls();
  setBalanceStatus(`${members.join(", ")} 함께 배정 조건을 추가했습니다.`);
}

function addBalancePairRule() {
  const first = normalizeName(balanceSeparateFirst?.value || "");
  const second = normalizeName(balanceSeparateSecond?.value || "");

  if (!first || !second || first === second) {
    setBalanceStatus("서로 다른 두 플레이어를 선택하세요.");
    return;
  }

  const key = pairKey(first, second);
  if (balanceRules.separate.some((rule) => pairKey(rule.first, rule.second) === key)) {
    setBalanceStatus("이미 추가된 구성입니다.");
    return;
  }

  if (balanceRules.together.some((rule) => rule.members.includes(first) && rule.members.includes(second))) {
    setBalanceStatus("같은 두 플레이어에 반대 조건이 이미 있습니다.");
    return;
  }

  balanceRules.separate = [...balanceRules.separate, { first, second }];
  saveBalanceRules();
  renderBalanceControls();
  setBalanceStatus(`${first}, ${second} 상대 팀 배정 조건을 추가했습니다.`);
}

function addBalanceFixedPosition() {
  const player = normalizeName(balanceFixedPlayer?.value || "");
  const lane = getLane(balanceFixedLane?.value)?.key || "";

  if (!player || !lane) {
    setBalanceStatus("포지션을 고정할 플레이어와 라인을 선택하세요.");
    return;
  }

  if (balanceRules.excluded.some((rule) => rule.player === player && rule.lane === lane)) {
    setBalanceStatus(`${player}에게 ${getLane(lane).label} 제외 조건이 이미 있습니다.`);
    return;
  }

  const fixedForLane = visibleBalanceRulesForPlayers(activeBalancePlayers()).fixed.filter(
    (rule) => rule.lane === lane && rule.player !== player
  );
  if (fixedForLane.length >= 2) {
    setBalanceStatus(`${getLane(lane).label}에는 최대 2명까지만 고정할 수 있습니다.`);
    return;
  }

  balanceRules.fixed = [
    ...balanceRules.fixed.filter((rule) => rule.player !== player),
    { player, lane }
  ];
  saveBalanceRules();
  renderBalanceControls();
  setBalanceStatus(`${player}의 포지션을 ${getLane(lane).label}으로 고정했습니다.`);
}

function addBalanceExcludedPosition() {
  const player = normalizeName(balanceExcludedPlayer?.value || "");
  const lane = getLane(balanceExcludedLane?.value)?.key || "";

  if (!player || !lane) {
    setBalanceStatus("제외할 플레이어와 라인을 선택하세요.");
    return;
  }

  if (balanceRules.fixed.some((rule) => rule.player === player && rule.lane === lane)) {
    setBalanceStatus(`${player}은 ${getLane(lane).label}에 이미 고정되어 있습니다.`);
    return;
  }

  if (balanceRules.excluded.some((rule) => rule.player === player && rule.lane === lane)) {
    setBalanceStatus("이미 추가된 포지션 제외 조건입니다.");
    return;
  }

  balanceRules.excluded = [...balanceRules.excluded, { player, lane }];
  saveBalanceRules();
  renderBalanceControls();
  setBalanceStatus(`${player}에게 ${getLane(lane).label} 제외 조건을 추가했습니다.`);
}

function removeBalanceRule(type, visibleIndex) {
  const players = activeBalancePlayers();
  const visibleRules = visibleBalanceRulesForPlayers(players)[type] || [];
  const target = visibleRules[visibleIndex];
  if (!target) return;

  if (type === "together") {
    const key = groupKey(target.members);
    balanceRules.together = balanceRules.together.filter((rule) => groupKey(rule.members) !== key);
  } else if (type === "fixed") {
    balanceRules.fixed = balanceRules.fixed.filter(
      (rule) => !(rule.player === target.player && rule.lane === target.lane)
    );
  } else if (type === "excluded") {
    balanceRules.excluded = balanceRules.excluded.filter(
      (rule) => !(rule.player === target.player && rule.lane === target.lane)
    );
  } else {
    const key = pairKey(target.first, target.second);
    balanceRules[type] = balanceRules[type].filter((rule) => pairKey(rule.first, rule.second) !== key);
  }

  saveBalanceRules();
  renderBalanceControls();
  setBalanceStatus("조건을 삭제했습니다.");
}

function renameBalancePlayerReferences(oldName, newName) {
  balanceRules.together = balanceRules.together.map((rule) => ({
    members: rule.members.map((member) => (member === oldName ? newName : member))
  }));
  balanceRules.separate = balanceRules.separate.map((rule) => ({
    first: rule.first === oldName ? newName : rule.first,
    second: rule.second === oldName ? newName : rule.second
  }));
  balanceRules.fixed = balanceRules.fixed.map((rule) => ({
    ...rule,
    player: rule.player === oldName ? newName : rule.player
  }));
  balanceRules.excluded = balanceRules.excluded.map((rule) => ({
    ...rule,
    player: rule.player === oldName ? newName : rule.player
  }));
  balanceRules = sanitizeBalanceRules(balanceRules);

  if (balanceAssignments) {
    Object.values(balanceAssignments)
      .flat()
      .forEach((row) => {
        if (row.player === oldName) row.player = newName;
      });
    updateBalanceAssignmentScores(balanceAssignments);
  }

  saveBalanceRules();
}

function deleteBalancePlayerReferences(name) {
  balanceRules.together = balanceRules.together
    .map((rule) => ({ members: rule.members.filter((member) => member !== name) }))
    .filter((rule) => rule.members.length >= 2);
  balanceRules.separate = balanceRules.separate.filter(
    (rule) => rule.first !== name && rule.second !== name
  );
  balanceRules.fixed = balanceRules.fixed.filter((rule) => rule.player !== name);
  balanceRules.excluded = balanceRules.excluded.filter((rule) => rule.player !== name);
  if (balanceAssignments && Object.values(balanceAssignments).flat().some((row) => row.player === name)) {
    balanceAssignments = null;
  }
  balanceRules = sanitizeBalanceRules(balanceRules);
  saveBalanceRules();
}

function laneScore(player, laneKey) {
  return clampScore(scoresForPlayer(player)[laneKey], 50);
}

function makeDisjointSet(players) {
  const parent = new Map(players.map((player) => [player, player]));

  const find = (player) => {
    const current = parent.get(player) || player;
    if (current === player) return current;
    const root = find(current);
    parent.set(player, root);
    return root;
  };

  const union = (first, second) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) parent.set(secondRoot, firstRoot);
  };

  return { find, union };
}

function buildBalanceConstraintState(players) {
  const playerSet = new Set(players);
  const activeRules = visibleBalanceRulesForPlayers(players);
  const fixedByPlayer = new Map();
  const fixedByLane = new Map(lanes.map((lane) => [lane.key, []]));
  const excludedByPlayer = new Map(players.map((player) => [player, new Set()]));

  activeRules.fixed.forEach((rule) => {
    fixedByPlayer.set(rule.player, rule.lane);
    fixedByLane.get(rule.lane).push(rule.player);
  });

  activeRules.excluded.forEach((rule) => {
    excludedByPlayer.get(rule.player)?.add(rule.lane);
  });

  activeRules.fixed.forEach((rule) => {
    if (excludedByPlayer.get(rule.player)?.has(rule.lane)) {
      throw new Error(`${rule.player}의 ${getLane(rule.lane).label} 고정과 제외 조건이 충돌합니다.`);
    }
  });

  const fixedOverflow = lanes.find((lane) => fixedByLane.get(lane.key).length > 2);
  if (fixedOverflow) {
    throw new Error(`${fixedOverflow.label}에 고정된 플레이어가 2명을 초과했습니다.`);
  }

  const disjointSet = makeDisjointSet(players);
  activeRules.together.forEach((rule) => {
    rule.members.slice(1).forEach((member) => disjointSet.union(rule.members[0], member));
  });

  const componentByPlayer = new Map(players.map((player) => [player, disjointSet.find(player)]));
  const componentMembers = new Map();
  players.forEach((player) => {
    const component = componentByPlayer.get(player);
    componentMembers.set(component, [...(componentMembers.get(component) || []), player]);
  });

  const oversizedComponent = [...componentMembers.values()].find((members) => members.length > 5);
  if (oversizedComponent) {
    throw new Error(`${oversizedComponent.join(", ")} 구성이 한 팀 최대 인원 5명을 초과합니다.`);
  }

  activeRules.separate.forEach((rule) => {
    if (componentByPlayer.get(rule.first) === componentByPlayer.get(rule.second)) {
      throw new Error(`${rule.first}, ${rule.second}에 서로 충돌하는 팀 조건이 있습니다.`);
    }
  });

  componentMembers.forEach((members) => {
    const fixedLaneSet = new Set();
    members.forEach((player) => {
      const fixedLane = fixedByPlayer.get(player);
      if (!fixedLane) return;
      if (fixedLaneSet.has(fixedLane)) {
        throw new Error(`같은 팀 구성 안에서 ${getLane(fixedLane).label} 고정이 중복됩니다.`);
      }
      fixedLaneSet.add(fixedLane);
    });
  });

  return {
    playerSet,
    rules: activeRules,
    fixedByPlayer,
    fixedByLane,
    excludedByPlayer,
    componentByPlayer
  };
}

function buildBalanceLaneGroups(players, constraintState) {
  const laneGroups = Object.fromEntries(lanes.map((lane) => [lane.key, [...constraintState.fixedByLane.get(lane.key)]]));
  const remainingPlayers = shuffle(players.filter((player) => !constraintState.fixedByPlayer.has(player)));
  const componentLaneMap = new Map();

  lanes.forEach((lane) => {
    laneGroups[lane.key].forEach((player) => {
      const component = constraintState.componentByPlayer.get(player);
      componentLaneMap.set(component, new Set([...(componentLaneMap.get(component) || []), lane.key]));
    });
  });

  for (const player of remainingPlayers) {
    const component = constraintState.componentByPlayer.get(player);
    const componentLanes = componentLaneMap.get(component) || new Set();
    const excludedLanes = constraintState.excludedByPlayer.get(player) || new Set();
    const openLaneOptions = lanes
      .filter(
        (lane) =>
          laneGroups[lane.key].length < 2 &&
          !componentLanes.has(lane.key) &&
          !excludedLanes.has(lane.key)
      )
      .map((lane) => ({
        lane,
        weight: Math.max(4, laneScore(player, lane.key) + 8) ** 2 * (0.82 + Math.random() * 0.36)
      }));

    if (openLaneOptions.length === 0) return null;

    const totalWeight = openLaneOptions.reduce((sum, option) => sum + option.weight, 0);
    let cursor = Math.random() * totalWeight;
    const selectedOption =
      openLaneOptions.find((option) => {
        cursor -= option.weight;
        return cursor <= 0;
      }) || openLaneOptions[openLaneOptions.length - 1];

    laneGroups[selectedOption.lane.key].push(player);
    componentLaneMap.set(component, new Set([...componentLanes, selectedOption.lane.key]));
  }

  if (lanes.some((lane) => laneGroups[lane.key].length !== 2)) return null;
  return laneGroups;
}

function scoreBalanceSideAssignment(laneGroups, mask, constraintState) {
  const result = { blue: [], red: [] };
  const teamByPlayer = new Map();
  let blueTotal = 0;
  let redTotal = 0;
  let laneDiffTotal = 0;
  let totalFit = 0;

  lanes.forEach((lane, index) => {
    const lanePlayers = laneGroups[lane.key];
    const shouldSwap = Boolean(mask & (1 << index));
    const bluePlayer = shouldSwap ? lanePlayers[1] : lanePlayers[0];
    const redPlayer = shouldSwap ? lanePlayers[0] : lanePlayers[1];
    const blueScore = laneScore(bluePlayer, lane.key);
    const redScore = laneScore(redPlayer, lane.key);

    result.blue.push({ lane: lane.key, player: bluePlayer, score: blueScore });
    result.red.push({ lane: lane.key, player: redPlayer, score: redScore });
    teamByPlayer.set(bluePlayer, "blue");
    teamByPlayer.set(redPlayer, "red");
    blueTotal += blueScore;
    redTotal += redScore;
    laneDiffTotal += Math.abs(blueScore - redScore);
    totalFit += blueScore + redScore;
  });

  const hasTogetherViolation = constraintState.rules.together.some(
    (rule) => rule.members.some((member) => teamByPlayer.get(member) !== teamByPlayer.get(rule.members[0]))
  );
  if (hasTogetherViolation) return null;

  const hasSeparateViolation = constraintState.rules.separate.some(
    (rule) => teamByPlayer.get(rule.first) === teamByPlayer.get(rule.second)
  );
  if (hasSeparateViolation) return null;

  const diff = Math.abs(blueTotal - redTotal);
  const objective = diff * 22 + laneDiffTotal * 1.45 + (1000 - totalFit) * 1.05;

  result.meta = {
    blueTotal,
    redTotal,
    diff,
    laneDiff: laneDiffTotal,
    totalFit,
    objective
  };
  return result;
}

function updateBalanceAssignmentScores(source) {
  if (!source) return source;
  let blueTotal = 0;
  let redTotal = 0;
  let laneDiffTotal = 0;
  let totalFit = 0;

  lanes.forEach((lane) => {
    const blueRow = assignmentFrom(source, "blue", lane.key);
    const redRow = assignmentFrom(source, "red", lane.key);
    if (!blueRow || !redRow) return;
    blueRow.score = laneScore(blueRow.player, lane.key);
    redRow.score = laneScore(redRow.player, lane.key);
    blueTotal += blueRow.score;
    redTotal += redRow.score;
    laneDiffTotal += Math.abs(blueRow.score - redRow.score);
    totalFit += blueRow.score + redRow.score;
  });

  source.meta = {
    blueTotal,
    redTotal,
    diff: Math.abs(blueTotal - redTotal),
    laneDiff: laneDiffTotal,
    totalFit,
    objective: source.meta?.objective || 0
  };
  return source;
}

function createBalancedAssignments() {
  const players = activeBalancePlayers();
  if (players.length !== 10) {
    throw new Error("랜덤 탭의 참가자 명단을 10명으로 맞춘 뒤 시작하세요.");
  }

  const constraintState = buildBalanceConstraintState(players);
  let bestAssignment = null;
  const iterationCount = 14000;

  for (let index = 0; index < iterationCount; index += 1) {
    const laneGroups = buildBalanceLaneGroups(players, constraintState);
    if (!laneGroups) continue;

    for (let mask = 0; mask < 32; mask += 1) {
      const candidate = scoreBalanceSideAssignment(laneGroups, mask, constraintState);
      if (!candidate) continue;
      if (!bestAssignment || candidate.meta.objective < bestAssignment.meta.objective) {
        bestAssignment = candidate;
      }
    }
  }

  if (!bestAssignment) {
    throw new Error("현재 조건을 모두 만족하는 배정을 찾지 못했습니다. 조건을 줄여 다시 시도하세요.");
  }

  return updateBalanceAssignmentScores(bestAssignment);
}

function renderBalanceSummary() {
  if (!balanceSummary) return;

  if (!balanceAssignments) {
    balanceSummary.innerHTML = `
      <strong>포지션 적합도 대기</strong>
    `;
    return;
  }

  const { totalFit } = balanceAssignments.meta;
  balanceSummary.innerHTML = `
    <strong>포지션 적합도 ${totalFit}점</strong>
  `;
}

function balanceCardMarkup(team, lane, row, animated, index) {
  const scoreText = row ? `${row.score}점` : "대기";
  const playerText = row ? row.player : "배정 전";
  const delay = animated ? `style="animation-delay: ${index * 70}ms"` : "";
  const cardClasses = [
    "balance-card",
    team.key,
    row ? "is-draggable" : "",
    animated ? "is-dealing" : "",
    pendingBalanceSwapSlots.has(slotKey(team.key, lane.key)) ? "is-swapping" : ""
  ]
    .filter(Boolean)
    .join(" ");
  return `
    <article class="${cardClasses}" ${delay} data-team="${team.key}" data-lane="${lane.key}" data-player="${row ? escapeHtml(row.player) : ""}" aria-label="${team.label} ${lane.label} ${escapeHtml(playerText)} 수동 교체">
      <span class="balance-card-score">${scoreText}</span>
      <span class="balance-card-main">
        <strong>${escapeHtml(playerText)}</strong>
      </span>
      ${row ? `<small class="balance-card-hint">드래그해서 위치 변경</small>` : ""}
    </article>
  `;
}

function renderBalanceBoard(animated = false) {
  if (!balanceBoard) return;
  renderBalanceSummary();

  const renderTeam = (team) => {
    const total = balanceAssignments?.meta?.[`${team.key}Total`];
    return `
    <article class="balance-team-column ${team.key}">
      <span class="balance-team-total ${team.key}">${Number.isFinite(total) ? `${total}점` : "대기"}</span>
      <div class="team-title">
        <h3>${team.label}</h3>
      </div>
      <div class="role-list">
        ${lanes
          .map((lane, index) =>
            balanceCardMarkup(team, lane, assignmentFrom(balanceAssignments, team.key, lane.key), animated, index)
          )
          .join("")}
      </div>
    </article>
  `;
  };

  balanceBoard.innerHTML = `
    ${renderTeam(teams[0])}
    ${renderBalanceLaneCenterColumn(animated)}
    ${renderTeam(teams[1])}
  `;
}

function renderBalanceLaneCenterColumn(animated = false) {
  return `
    <div class="lane-center-list balance-lane-center-list" aria-label="라인별 영향력 차이">
      ${lanes
        .map((lane, index) => {
          const blueRow = assignmentFrom(balanceAssignments, "blue", lane.key);
          const redRow = assignmentFrom(balanceAssignments, "red", lane.key);
          const diff = blueRow && redRow ? blueRow.score - redRow.score : 0;
          const leftText = blueRow && redRow ? (diff > 0 ? `+${diff}` : diff === 0 ? "-" : "") : "-";
          const rightText = blueRow && redRow ? (diff < 0 ? `+${Math.abs(diff)}` : diff === 0 ? "-" : "") : "-";
          const leftClass = diff > 0 ? "is-leading" : diff === 0 ? "is-even" : "is-empty";
          const rightClass = diff < 0 ? "is-leading" : diff === 0 ? "is-even" : "is-empty";
          return `
          <div class="lane-center-badge balance-lane-diff ${animated ? "is-dealing" : ""}" ${animated ? `style="animation-delay: ${index * 70}ms"` : ""}>
            <span class="balance-lane-diff-score blue ${leftClass}">${leftText}</span>
            <strong>${lane.label}</strong>
            <span class="balance-lane-diff-score red ${rightClass}">${rightText}</span>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

function clearBalanceAssignments() {
  balanceAssignments = null;
  renderBalanceBoard(false);
  setBalanceStatus("밸런스 결과를 초기화했습니다.");
}

function clearBalanceDragState() {
  if (!balanceDragState) return;
  balanceDragState.sourceCard?.classList.remove("is-drag-source");
  balanceDragState.targetCard?.classList.remove("is-drag-target");
  balanceDragState.ghost?.remove();
  document.body.classList.remove("is-balance-dragging");
  balanceDragState = null;
}

function updateBalanceDragGhost(event) {
  if (!balanceDragState) return;
  const nextX = event.clientX - balanceDragState.offsetX;
  const nextY = event.clientY - balanceDragState.offsetY;
  balanceDragState.ghost.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;
}

function updateBalanceDragTarget(event) {
  if (!balanceDragState) return;
  const targetCard = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest(".balance-card.is-draggable");
  const isValidTarget = Boolean(
    targetCard &&
      targetCard !== balanceDragState.sourceCard &&
      balanceBoard.contains(targetCard) &&
      assignmentFrom(balanceAssignments, targetCard.dataset.team, targetCard.dataset.lane)
  );
  const nextTarget = isValidTarget ? targetCard : null;

  if (balanceDragState.targetCard !== nextTarget) {
    balanceDragState.targetCard?.classList.remove("is-drag-target");
    nextTarget?.classList.add("is-drag-target");
    balanceDragState.targetCard = nextTarget;
  }
}

function swapBalanceCards(sourceCard, targetCard) {
  const sourceRow = assignmentFrom(balanceAssignments, sourceCard.dataset.team, sourceCard.dataset.lane);
  const targetRow = assignmentFrom(balanceAssignments, targetCard.dataset.team, targetCard.dataset.lane);
  if (!sourceRow || !targetRow) return false;

  const sourcePlayer = sourceRow.player;
  sourceRow.player = targetRow.player;
  targetRow.player = sourcePlayer;
  updateBalanceAssignmentScores(balanceAssignments);

  pendingBalanceSwapSlots = new Set([
    slotKey(sourceCard.dataset.team, sourceCard.dataset.lane),
    slotKey(targetCard.dataset.team, targetCard.dataset.lane)
  ]);
  renderBalanceBoard(false);
  setBalanceStatus(
    `${sourceRow.player}과 ${targetRow.player}의 위치를 수동으로 맞바꿨습니다. 조건과 관계없이 반영했습니다.`
  );

  window.setTimeout(() => {
    pendingBalanceSwapSlots.clear();
    balanceBoard?.querySelectorAll(".balance-card.is-swapping").forEach((card) => {
      card.classList.remove("is-swapping");
    });
  }, 620);

  return true;
}

function finishBalanceDrag(event) {
  if (!balanceDragState) return;
  document.removeEventListener("pointermove", moveBalanceDrag);
  document.removeEventListener("pointerup", finishBalanceDrag);
  document.removeEventListener("pointercancel", cancelBalanceDrag);

  updateBalanceDragTarget(event);
  const { sourceCard, targetCard, ghost, startRect } = balanceDragState;
  const dropTarget = targetCard;

  if (dropTarget) {
    const targetRect = dropTarget.getBoundingClientRect();
    ghost.style.transition = "transform 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms ease";
    ghost.style.transform = `translate3d(${targetRect.left}px, ${targetRect.top}px, 0) scale(0.98)`;
    ghost.style.opacity = "0.9";
    window.setTimeout(() => {
      const sourceName = assignmentFrom(balanceAssignments, sourceCard.dataset.team, sourceCard.dataset.lane)?.player;
      const targetName = assignmentFrom(balanceAssignments, dropTarget.dataset.team, dropTarget.dataset.lane)?.player;
      clearBalanceDragState();
      if (sourceName && targetName) swapBalanceCards(sourceCard, dropTarget);
    }, 210);
    return;
  }

  ghost.style.transition = "transform 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease";
  ghost.style.transform = `translate3d(${startRect.left}px, ${startRect.top}px, 0)`;
  ghost.style.opacity = "0";
  window.setTimeout(clearBalanceDragState, 180);
}

function moveBalanceDrag(event) {
  if (!balanceDragState) return;
  event.preventDefault();
  updateBalanceDragGhost(event);
  updateBalanceDragTarget(event);
}

function cancelBalanceDrag() {
  if (!balanceDragState) return;
  document.removeEventListener("pointermove", moveBalanceDrag);
  document.removeEventListener("pointerup", finishBalanceDrag);
  document.removeEventListener("pointercancel", cancelBalanceDrag);
  clearBalanceDragState();
}

function startBalanceDrag(event) {
  if (event.button !== 0 || !balanceAssignments) return;
  const sourceCard = event.target.closest(".balance-card.is-draggable");
  if (!sourceCard || !balanceBoard?.contains(sourceCard)) return;

  const sourceRow = assignmentFrom(balanceAssignments, sourceCard.dataset.team, sourceCard.dataset.lane);
  if (!sourceRow) return;

  event.preventDefault();
  closeBalanceCustomSelects();
  const rect = sourceCard.getBoundingClientRect();
  const ghost = sourceCard.cloneNode(true);
  ghost.classList.remove("is-swapping", "is-drag-target", "is-drag-source");
  ghost.classList.add("balance-drag-ghost");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
  document.body.append(ghost);

  sourceCard.classList.add("is-drag-source");
  document.body.classList.add("is-balance-dragging");
  balanceDragState = {
    sourceCard,
    targetCard: null,
    ghost,
    startRect: rect,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top
  };

  document.addEventListener("pointermove", moveBalanceDrag);
  document.addEventListener("pointerup", finishBalanceDrag);
  document.addEventListener("pointercancel", cancelBalanceDrag);
}

function randomizeBalanceDraft() {
  if (!balanceStartButton) return;

  balanceStartButton.disabled = true;
  document.body.classList.add("is-randomizing");
  setBalanceStatus("라인별 영향력과 조건을 반영해 조합을 찾고 있습니다.");

  window.setTimeout(() => {
    try {
      balanceAssignments = createBalancedAssignments();
      renderBalanceBoard(true);
      const { diff } = balanceAssignments.meta;
      setBalanceStatus(`밸런스 배정 완료. 두 팀 총점 차이는 ${diff}점입니다.`);
    } catch (error) {
      balanceAssignments = null;
      renderBalanceBoard(false);
      setBalanceStatus(error.message || "밸런스 배정을 완료하지 못했습니다.");
    } finally {
      document.body.classList.remove("is-randomizing");
      updateBalanceStartButton();
    }
  }, 90);
}

function switchPage(pageKey, shouldScroll = true) {
  pageViews.forEach((view) => {
    const isActive = view.dataset.pageView === pageKey;
    view.classList.toggle("is-active", isActive);
    view.setAttribute("aria-hidden", String(!isActive));
  });

  pageToggleButtons.forEach((button) => {
    const isActive = button.dataset.pageTarget === pageKey;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  pageSwitch?.setAttribute("data-active-page", pageKey);
  document.body.dataset.activePage = pageKey;

  if (pageKey === "settings") {
    renderSettingsPlayers();
    renderBalanceScores();
    document.querySelector("#settings")?.classList.add("is-visible");
  } else if (pageKey === "balance") {
    renderBalanceParticipantPool();
    renderBalanceControls();
    renderBalanceBoard(false);
    document.querySelector("#balance")?.classList.add("is-visible");
  }

  if (shouldScroll) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function fillPlayers(names) {
  const inputs = [...playerInputs.querySelectorAll("input")];
  const orderedNames = sortPlayerNames(uniqueNames(names));
  inputs.forEach((input, index) => {
    input.value = orderedNames[index] || "";
  });
  syncSelectedPlayersFromInputs();
  syncPresetPlayersWithInputs();
  updateFilledCount();
  renderPlayerPool();
  renderBalanceParticipantPool();
  renderBalanceScores();
  renderBalanceControls();
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

function togglePlayerFromPool(name, source = "random") {
  syncSelectedPlayersFromInputs();
  let message = "";

  if (selectedPlayerNames.has(name)) {
    removePlayerFromInputs(name);
    selectedPlayerNames.delete(name);
    message = `${name}을 참가자 명단에서 제외했습니다.`;
  } else if (addPlayerToInput(name)) {
    selectedPlayerNames.add(name);
    message = `${name}을 참가자 명단에 추가했습니다.`;
  } else {
    message = "참가자 10명이 모두 채워져 있습니다. 한 칸을 비운 뒤 선택하세요.";
  }

  syncPresetPlayersWithInputs();
  updateFilledCount();
  renderPlayerPool();
  renderBalanceParticipantPool();
  renderBalanceScores();
  renderBalanceControls();
  if (source === "balance") {
    setBalanceStatus(message);
  } else {
    statusLabel.textContent = message;
  }
  if (!assignments) renderEmptyBoard();
}

function addNewPlayerName() {
  const name = normalizeName(newPlayerInput.value);
  if (!name) return;

  const addedToDraft = addPlayerNameToPool(name, true);
  newPlayerInput.value = "";
  statusLabel.textContent = addedToDraft
    ? `${name}을 플레이어 풀과 참가자 명단에 추가했습니다.`
    : `${name}을 플레이어 풀에 추가하지 못했습니다.`;
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

function assignmentSignature(source = assignments) {
  if (!source) return "";
  return JSON.stringify(
    lanes.map((lane) => ({
      lane: lane.key,
      blue: assignmentFrom(source, "blue", lane.key)
        ? {
            player: assignmentFrom(source, "blue", lane.key).player,
            champion: assignmentFrom(source, "blue", lane.key).champion.id
          }
        : null,
      red: assignmentFrom(source, "red", lane.key)
        ? {
            player: assignmentFrom(source, "red", lane.key).player,
            champion: assignmentFrom(source, "red", lane.key).champion.id
          }
        : null
    }))
  );
}

function updatePlaySessionButton() {
  if (!playSessionButton) return;

  const signature = assignmentSignature();
  const canRecord = Boolean(assignments && signature && signature !== lastRecordedSignature);
  playSessionButton.disabled = !canRecord;
  playSessionButton.textContent = canRecord ? "플레이" : assignments ? "기록 완료" : "플레이";
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
  const fearlessChampionIds = fearlessToggle?.checked ? sessionUsedChampionIds() : new Set();
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
          .filter(
            (row) =>
              isFullLocked(row) &&
              row.champion &&
              players.includes(row.player) &&
              !fearlessChampionIds.has(row.champion.id)
          )
          .map((row) => row.champion.id)
      : []
  );

  if (uniqueChampionToggle.checked) {
    Object.values(presetChampionsBySlot).forEach((championId) => {
      if (championId && !fearlessChampionIds.has(championId)) usedChampions.add(championId);
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
      const requestedPresetChampion = presetChampionForSlot(team.key, lane.key);
      const presetChampion =
        requestedPresetChampion && !fearlessChampionIds.has(requestedPresetChampion.id)
          ? requestedPresetChampion
          : null;
      const hasPresetChampion = Boolean(presetChampion);

      if (hasPresetPlayer && hasPresetChampion) {
        locks.all = true;
        locks.position = false;
      } else {
        locks.position = Boolean(locks.position || hasPresetPlayer);
        if (locks.all) locks.position = false;
      }

      const keepChampion = Boolean(
        locks.all &&
          previousRow?.champion &&
          players.includes(previousRow.player) &&
          !fearlessChampionIds.has(previousRow.champion.id)
      );
      const champion = presetChampion || (
        keepChampion
          ? previousRow.champion
          : drawChampion(lane.key, usedChampions, previousRow?.champion?.id, fearlessChampionIds)
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

function drawChampion(
  laneKey,
  usedChampions = new Set(),
  currentId = "",
  bannedChampionIds = fearlessToggle?.checked ? sessionUsedChampionIds() : new Set()
) {
  const pool = championsForDraftLane(laneKey, bannedChampionIds);
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
  const bannedChampions = fearlessToggle?.checked ? sessionUsedChampionIds() : new Set();
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
      const champion = pickRandom(championsForDraftLane(lane.key, bannedChampions));
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

  const bannedChampions = fearlessToggle?.checked ? sessionUsedChampionIds() : new Set();
  slot.classList.add("is-active");
  const previewInterval = window.setInterval(() => {
    if (shouldCancel()) {
      window.clearInterval(previewInterval);
      return;
    }

    updateDraftOverlaySlot(slot, {
      player: pickRandom(getPlayers()),
      champion: pickRandom(championsForDraftLane(laneKey, bannedChampions))
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
  const fearlessBanCount = fearlessToggle?.checked ? sessionUsedChampionIds().size : 0;
  const optionMessages = [
    activeLockCount > 0 ? `고정 슬롯 ${activeLockCount}개` : "",
    fearlessBanCount > 0 ? `피어리스 제외 ${fearlessBanCount}개` : ""
  ].filter(Boolean);
  statusLabel.textContent =
    optionMessages.length > 0
      ? `배정 중입니다. ${optionMessages.join(", ")}를 반영합니다.`
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
        updatePlaySessionButton();
        statusLabel.textContent =
          activeLockCount > 0
            ? "배정 완료. 사전 지정과 고정 옵션을 반영했습니다. 플레이 버튼을 누르면 세션 기록에 저장됩니다."
            : "배정 완료. 플레이 버튼을 누르면 이번 결과가 세션 기록에 저장됩니다.";
      } catch (error) {
        console.error(error);
        if (nextAssignments) {
          assignments = nextAssignments;
          clearPresetPlayers();
          renderAssignments(true);
          updatePlaySessionButton();
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
    updatePlaySessionButton();
    statusLabel.textContent =
      activeLockCount > 0
        ? "배정 완료. 사전 지정과 고정 옵션을 반영했습니다. 플레이 버튼을 누르면 세션 기록에 저장됩니다."
        : "배정 완료. 플레이 버튼을 누르면 이번 결과가 세션 기록에 저장됩니다.";
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
  const bannedChampions = fearlessToggle?.checked ? sessionUsedChampionIds() : new Set();
  row.champion = drawChampion(laneKey, usedChampions, row.champion.id, bannedChampions);

  const card = teamBoard.querySelector(`[data-team="${teamKey}"][data-lane="${laneKey}"]`);
  if (!card) return;

  card.classList.add("is-rerolling");
  window.setTimeout(() => {
    card.querySelector(".champion-avatar").innerHTML = `<img src="${row.champion.image}" alt="${row.champion.name}" loading="lazy" />`;
    card.querySelector(".champion-name").textContent = row.champion.name;
    updatePlaySessionButton();
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
  updatePlaySessionButton();

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

function snapshotAssignment(teamKey, laneKey) {
  const row = assignmentFrom(assignments, teamKey, laneKey);
  return {
    player: row.player,
    champion: { ...row.champion }
  };
}

function createSessionRecord() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  return {
    id: `${now.getTime()}`,
    time: formatter.format(now),
    lanes: lanes.map((lane) => ({
      key: lane.key,
      label: lane.label,
      blue: snapshotAssignment("blue", lane.key),
      red: snapshotAssignment("red", lane.key)
    }))
  };
}

async function recordCurrentSession() {
  if (!assignments) {
    statusLabel.textContent = "먼저 랜덤 배정을 완료하세요.";
    return;
  }

  const signature = assignmentSignature();
  if (!signature || signature === lastRecordedSignature) {
    statusLabel.textContent = "이미 이번 결과를 세션 기록에 저장했습니다.";
    updatePlaySessionButton();
    return;
  }

  const localRecord = createSessionRecord();
  sessionRecords = [localRecord, ...sessionRecords];
  lastRecordedSignature = signature;
  renderHistory();
  updatePlaySessionButton();

  const databaseRecord = await saveSessionRecordToDatabase(localRecord);
  if (databaseRecord) {
    sessionRecords = [databaseRecord, ...sessionRecords.slice(1)];
    renderHistory();
  }

  const usedCount = sessionUsedChampionIds().size;
  statusLabel.textContent = `플레이 기록을 저장했습니다. 피어리스 적용 시 ${usedCount}개 챔피언이 제외됩니다.`;
}

function resetSessionRecords() {
  sessionRecords = [];
  lastRecordedSignature = "";
  renderHistory();
  updatePlaySessionButton();
  resetSessionRecordsInDatabase();
  statusLabel.textContent = "세션 기록을 초기화했습니다. 피어리스 제외 챔피언도 모두 해제되었습니다.";
}

function renderHistory() {
  if (sessionRecords.length === 0) {
    historyList.innerHTML = `<p class="empty-history">아직 플레이 기록이 없습니다.</p>`;
    return;
  }

  historyList.innerHTML = sessionRecords
    .map(
      (item, index) => `
      <article class="history-item">
        <div class="history-time">
          <strong>${sessionRecords.length - index}경기</strong>
          <span>${item.time}</span>
        </div>
        <div class="history-match-grid">
          ${item.lanes
            .map(
              (laneRecord) => `
              <div class="history-lane-row">
                <span class="history-lane-name">${laneRecord.label}</span>
                <span class="history-team-result blue">
                  <strong>${laneRecord.blue.player}</strong>
                  <span>${laneRecord.blue.champion.name}</span>
                </span>
                <span class="history-team-result red">
                  <strong>${laneRecord.red.player}</strong>
                  <span>${laneRecord.red.champion.name}</span>
                </span>
              </div>
            `
            )
            .join("")}
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

async function initializeApp() {
  await loadDatabaseState();
  createPlayerInputs();
  renderPlayerPool();
  renderBalanceParticipantPool();
  renderEmptyBoard();
  renderLaneTabs();
  renderChampionPool();
  renderHistory();
  renderSettingsPlayers();
  renderBalanceScores();
  renderBalanceControls();
  renderBalanceBoard(false);
  updatePlaySessionButton();
  observeReveal();
  addButtonRipples();
  setSpeedLabel();
  if (databaseStatusMessage && window.location.protocol !== "file:") {
    statusLabel.textContent = databaseStatusMessage;
  }
}

initializeApp();

addListener(sampleButton, "click", () => {
  fillPlayers(orderedPlayerPoolNames().slice(0, 10));
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
  renderBalanceParticipantPool();
  renderBalanceControls();
  balanceAssignments = null;
  renderBalanceBoard(false);
  assignments = null;
  lastRecordedSignature = "";
  renderEmptyBoard();
  updatePlaySessionButton();
  statusLabel.textContent = "입력을 초기화했습니다. 참가자 10명을 다시 입력하세요.";
});

addListener(randomizeButton, "click", randomizeDraft);
addListener(playSessionButton, "click", recordCurrentSession);
addListener(resetSessionButton, "click", resetSessionRecords);
addListener(pageSwitch, "click", (event) => {
  const button = event.target.closest("[data-page-target]");
  if (!button) return;
  const pageKey = button.dataset.pageTarget;
  if (pageSwitch.dataset.activePage === pageKey) return;
  switchPage(pageKey);
});
addListener(topnav, "click", (event) => {
  if (!event.target.closest("a")) return;
  switchPage("random", false);
});
addListener(document.querySelector(".brand"), "click", () => {
  switchPage("random", false);
});
addListener(balanceScoreGrid, "input", (event) => {
  const input = event.target.closest(".balance-score-input");
  if (input) updateBalanceScore(input);
});
addListener(balanceScoreGrid, "focusout", (event) => {
  const input = event.target.closest(".balance-score-input");
  if (input) settleBalanceScore(input);
});
addListener(balanceScoreGrid, "click", (event) => {
  const sortButton = event.target.closest("[data-score-sort]");
  if (sortButton) {
    if (balanceScoreGrid.querySelector(".balance-player-row.is-editing")) {
      setSettingsStatus("라인별 영향력을 저장한 뒤 정렬하세요.");
      return;
    }
    toggleBalanceScoreSort(sortButton.dataset.scoreSort);
    return;
  }

  const button = event.target.closest(".balance-score-edit-button");
  if (button) handleBalanceScoreAction(button);
});
addListener(balanceAddTogetherButton, "click", addBalanceTogetherRule);
addListener(balanceAddSeparateButton, "click", addBalancePairRule);
addListener(balanceAddFixedButton, "click", addBalanceFixedPosition);
addListener(balanceAddExcludedButton, "click", addBalanceExcludedPosition);
addListener(balanceStartButton, "click", randomizeBalanceDraft);
addListener(balanceClearButton, "click", clearBalanceAssignments);
addListener(balanceBoard, "pointerdown", startBalanceDrag);
[
  balanceTogetherList,
  balanceSeparateList,
  balanceFixedList,
  balanceExcludedList
].forEach((list) => {
  addListener(list, "click", (event) => {
    const button = event.target.closest("[data-balance-rule-type]");
    if (!button) return;
    removeBalanceRule(button.dataset.balanceRuleType, Number(button.dataset.ruleIndex));
  });
});
addListener(document, "click", (event) => {
  const customSelect = event.target.closest(".balance-custom-select");
  const trigger = event.target.closest(".balance-select-trigger");
  const option = event.target.closest(".balance-select-option");

  if (trigger && customSelect) {
    const willOpen = !customSelect.classList.contains("is-open");
    closeBalanceCustomSelects(willOpen ? customSelect : null);
    customSelect.classList.toggle("is-open", willOpen);
    trigger.setAttribute("aria-expanded", String(willOpen));
    return;
  }

  if (option && customSelect) {
    const select = customSelect.previousElementSibling;
    if (select?.matches("select")) {
      select.value = option.dataset.value || "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      renderBalanceCustomSelect(select);
    }
    closeBalanceCustomSelects();
    return;
  }

  if (!customSelect) {
    closeBalanceCustomSelects();
  }
});

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

addListener(balanceParticipantPool, "click", (event) => {
  const card = event.target.closest(".balance-participant-card");
  if (!card) return;
  togglePlayerFromPool(card.dataset.playerName, "balance");
});

addListener(addPlayerButton, "click", addNewPlayerName);
addListener(newPlayerInput, "keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addNewPlayerName();
});
addListener(settingsAddPlayerButton, "click", () => {
  if (!settingsNewPlayerInput) return;
  if (addPlayerNameToPool(settingsNewPlayerInput.value, false)) {
    settingsNewPlayerInput.value = "";
  }
});
addListener(settingsNewPlayerInput, "keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  if (addPlayerNameToPool(settingsNewPlayerInput.value, false)) {
    settingsNewPlayerInput.value = "";
  }
});
addListener(settingsPlayerList, "click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const row = button.closest(".settings-player-row");
  const oldName = row?.dataset.playerName;
  if (!oldName) return;

  if (button.dataset.action === "rename") {
    renamePlayerName(oldName, row.querySelector(".settings-player-name-input")?.value || "");
  } else if (button.dataset.action === "delete") {
    deletePlayerName(oldName);
  }
});
addListener(settingsPlayerList, "keydown", (event) => {
  if (event.key !== "Enter") return;
  const input = event.target.closest(".settings-player-name-input");
  if (!input) return;
  event.preventDefault();
  const row = input.closest(".settings-player-row");
  renamePlayerName(row?.dataset.playerName || "", input.value);
});

addListener(restorePoolButton, "click", restoreActiveLanePool);
addListener(selectAllPoolButton, "click", selectAllForActiveLane);
addListener(speedRange, "input", setSpeedLabel);
addListener(fearlessToggle, "change", () => {
  const usedCount = sessionUsedChampionIds().size;
  statusLabel.textContent = fearlessToggle.checked
    ? `피어리스 룰을 적용합니다. 다음 배정부터 세션 기록의 ${usedCount}개 챔피언을 제외합니다.`
    : "피어리스 룰을 해제했습니다.";
});
addListener(document, "click", (event) => {
  if (!event.target.closest(".preset-picker")) closePresetMenus();
});
addListener(document, "keydown", (event) => {
  if (event.key === "Escape") {
    closePresetMenus();
    closeBalanceCustomSelects();
  }
});
