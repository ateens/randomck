import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT || 8080);

const lanes = [
  { key: "top", label: "탑" },
  { key: "jungle", label: "정글" },
  { key: "mid", label: "미드" },
  { key: "bot", label: "원딜" },
  { key: "support", label: "서포터" }
];

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

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.DATABASE_PRIVATE_URL ||
  process.env.DATABASE_PUBLIC_URL ||
  process.env.POSTGRES_URL ||
  "";

function databaseConnectionOptions() {
  if (databaseUrl) {
    const requiresSsl = process.env.PGSSL === "true" || databaseUrl.includes("sslmode=require");
    return {
      connectionString: databaseUrl,
      ssl: requiresSsl ? { rejectUnauthorized: false } : undefined
    };
  }

  if (process.env.PGHOST && process.env.PGDATABASE) {
    return {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined
    };
  }

  return null;
}

const connectionOptions = databaseConnectionOptions();
const hasDatabaseConfig = Boolean(connectionOptions);
const pool = hasDatabaseConfig ? new Pool(connectionOptions) : null;

let databaseReady = false;
let databaseInitPromise = null;
let lastDatabaseError = hasDatabaseConfig
  ? ""
  : "No database variables found. Set DATABASE_URL or PGHOST/PGDATABASE on the app service.";

const app = express();
app.use(express.json({ limit: "1mb" }));

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
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

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 50;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function isLaneKey(value) {
  return lanes.some((lane) => lane.key === value);
}

function pairKey(firstName, secondName) {
  return [firstName, secondName].sort((first, second) => first.localeCompare(second, "ko-KR")).join("::");
}

function groupKey(members = []) {
  return [...members].sort((first, second) => first.localeCompare(second, "ko-KR")).join("::");
}

function sanitizeTogetherRules(rules = []) {
  const seen = new Set();
  return (Array.isArray(rules) ? rules : [])
    .map((rule) => {
      const members = uniqueNames(Array.isArray(rule?.members) ? rule.members : []).slice(0, 5);
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
      const first = normalizeName(rule?.first || "");
      const second = normalizeName(rule?.second || "");
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
      const lane = isLaneKey(rule?.lane) ? rule.lane : "";
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
      const lane = isLaneKey(rule?.lane) ? rule.lane : "";
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

async function initializeDatabase() {
  if (!pool) return false;
  if (databaseReady) return true;
  if (databaseInitPromise) return databaseInitPromise;

  databaseInitPromise = (async () => {
    await pool.query("SELECT 1");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_lane_scores (
        player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        lane_key TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (player_id, lane_key)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS session_records (
        id BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS session_lane_records (
        session_id BIGINT NOT NULL REFERENCES session_records(id) ON DELETE CASCADE,
        lane_key TEXT NOT NULL,
        lane_label TEXT NOT NULL,
        blue_player TEXT NOT NULL,
        blue_champion_id TEXT NOT NULL,
        blue_champion_name TEXT NOT NULL,
        blue_champion_image TEXT NOT NULL,
        red_player TEXT NOT NULL,
        red_champion_id TEXT NOT NULL,
        red_champion_name TEXT NOT NULL,
        red_champion_image TEXT NOT NULL,
        PRIMARY KEY (session_id, lane_key)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const playerCount = await pool.query("SELECT COUNT(*)::int AS count FROM players");
    if (playerCount.rows[0].count === 0) {
      await upsertPlayers(defaultPlayerPool);
    }
    await upsertDefaultPlayerScores();
    databaseReady = true;
    lastDatabaseError = "";
    return true;
  })();

  try {
    return await databaseInitPromise;
  } catch (error) {
    databaseReady = false;
    lastDatabaseError = error.message || "Database initialization failed.";
    console.error("Database initialization failed:", error);
    return false;
  } finally {
    databaseInitPromise = null;
  }
}

async function databaseIsAvailable() {
  const ready = await initializeDatabase();
  return ready;
}

async function databaseStatus() {
  const ready = await initializeDatabase();
  return {
    storage: "postgres",
    configured: hasDatabaseConfig,
    ready,
    error: ready ? "" : lastDatabaseError,
    variables: {
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      DATABASE_PRIVATE_URL: Boolean(process.env.DATABASE_PRIVATE_URL),
      DATABASE_PUBLIC_URL: Boolean(process.env.DATABASE_PUBLIC_URL),
      POSTGRES_URL: Boolean(process.env.POSTGRES_URL),
      PGHOST: Boolean(process.env.PGHOST),
      PGDATABASE: Boolean(process.env.PGDATABASE),
      PGUSER: Boolean(process.env.PGUSER),
      PGPASSWORD: Boolean(process.env.PGPASSWORD)
    }
  };
}

function sendDatabaseUnavailable(response) {
  response.status(503).json({
    storage: "postgres",
    ok: false,
    ready: false,
    error: lastDatabaseError || "PostgreSQL is not ready."
  });
}

async function upsertPlayers(names) {
  const cleanNames = uniqueNames(names);
  if (cleanNames.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [index, name] of cleanNames.entries()) {
      await client.query(
        `
          INSERT INTO players (name, sort_order)
          VALUES ($1, $2)
          ON CONFLICT (name)
          DO UPDATE SET sort_order = LEAST(players.sort_order, EXCLUDED.sort_order)
        `,
        [name, index]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function upsertDefaultPlayerScores() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const name of defaultPlayerPool) {
      const profile = defaultPlayerSkillProfiles[name];
      const playerResult = await client.query("SELECT id FROM players WHERE name = $1", [name]);
      const playerId = playerResult.rows[0]?.id;
      if (!playerId || !profile) continue;

      for (const lane of lanes) {
        await client.query(
          `
            INSERT INTO player_lane_scores (player_id, lane_key, score, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (player_id, lane_key) DO NOTHING
          `,
          [playerId, lane.key, clampScore(profile[lane.key])]
        );
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function readPlayerPoolNames() {
  const result = await pool.query(`
    SELECT name
    FROM players
    ORDER BY sort_order ASC, id ASC
  `);
  return result.rows.map((row) => row.name);
}

async function readPlayerScores() {
  const result = await pool.query(`
    SELECT p.name, s.lane_key, s.score
    FROM player_lane_scores s
    JOIN players p ON p.id = s.player_id
    ORDER BY p.sort_order ASC, p.id ASC
  `);
  const scores = {};
  result.rows.forEach((row) => {
    scores[row.name] = scores[row.name] || {};
    scores[row.name][row.lane_key] = clampScore(row.score);
  });
  return scores;
}

async function savePlayerScore(name, laneKey, score) {
  const normalizedName = normalizeName(name);
  if (!normalizedName || !isLaneKey(laneKey)) {
    const error = new Error("Invalid player score payload");
    error.status = 400;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const playerResult = await client.query(
      `
        INSERT INTO players (name, sort_order)
        VALUES ($1, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM players))
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `,
      [normalizedName]
    );
    const playerId = playerResult.rows[0].id;
    await client.query(
      `
        INSERT INTO player_lane_scores (player_id, lane_key, score, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (player_id, lane_key)
        DO UPDATE SET score = EXCLUDED.score, updated_at = NOW()
      `,
      [playerId, laneKey, clampScore(score)]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function renamePlayer(oldName, newName) {
  const normalizedOldName = normalizeName(oldName);
  const normalizedNewName = normalizeName(newName);
  if (!normalizedOldName || !normalizedNewName) {
    const error = new Error("Invalid player rename payload");
    error.status = 400;
    throw error;
  }

  const result = await pool.query(
    `
      UPDATE players
      SET name = $2
      WHERE name = $1
      RETURNING id, name
    `,
    [normalizedOldName, normalizedNewName]
  );

  if (result.rowCount === 0) {
    await upsertPlayers([normalizedNewName]);
  }
}

async function deletePlayer(name) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) {
    const error = new Error("Invalid player delete payload");
    error.status = 400;
    throw error;
  }

  await pool.query("DELETE FROM players WHERE name = $1", [normalizedName]);
}

function formatSessionTime(createdAt) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Seoul"
  }).format(new Date(createdAt));
}

async function readSessionRecords() {
  const result = await pool.query(`
    SELECT
      sr.id,
      sr.created_at,
      slr.lane_key,
      slr.lane_label,
      slr.blue_player,
      slr.blue_champion_id,
      slr.blue_champion_name,
      slr.blue_champion_image,
      slr.red_player,
      slr.red_champion_id,
      slr.red_champion_name,
      slr.red_champion_image
    FROM session_records sr
    JOIN session_lane_records slr ON slr.session_id = sr.id
    ORDER BY sr.created_at DESC, sr.id DESC
  `);

  const recordsById = new Map();
  result.rows.forEach((row) => {
    if (!recordsById.has(row.id)) {
      recordsById.set(row.id, {
        id: String(row.id),
        time: formatSessionTime(row.created_at),
        lanes: []
      });
    }

    recordsById.get(row.id).lanes.push({
      key: row.lane_key,
      label: row.lane_label,
      blue: {
        player: row.blue_player,
        champion: {
          id: row.blue_champion_id,
          name: row.blue_champion_name,
          image: row.blue_champion_image
        }
      },
      red: {
        player: row.red_player,
        champion: {
          id: row.red_champion_id,
          name: row.red_champion_name,
          image: row.red_champion_image
        }
      }
    });
  });

  return [...recordsById.values()].map((record) => ({
    ...record,
    lanes: lanes
      .map((lane) => record.lanes.find((laneRecord) => laneRecord.key === lane.key))
      .filter(Boolean)
  }));
}

async function readBalanceRules() {
  const result = await pool.query("SELECT value FROM app_settings WHERE key = $1", ["balance_rules"]);
  return sanitizeBalanceRules(result.rows[0]?.value || {});
}

async function saveBalanceRules(rawRules) {
  const rules = sanitizeBalanceRules(rawRules || {});
  await pool.query(
    `
      INSERT INTO app_settings (key, value, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `,
    ["balance_rules", JSON.stringify(rules)]
  );
  return rules;
}

function sanitizeSessionLane(laneRecord) {
  const lane = lanes.find((item) => item.key === laneRecord?.key);
  if (!lane || !laneRecord?.blue?.champion || !laneRecord?.red?.champion) {
    const error = new Error("Invalid session lane payload");
    error.status = 400;
    throw error;
  }

  return {
    key: lane.key,
    label: lane.label,
    blue: {
      player: normalizeName(laneRecord.blue.player),
      champion: laneRecord.blue.champion
    },
    red: {
      player: normalizeName(laneRecord.red.player),
      champion: laneRecord.red.champion
    }
  };
}

async function saveSessionRecord(laneRecords) {
  const cleanLaneRecords = lanes.map((lane) => {
    const laneRecord = laneRecords.find((item) => item?.key === lane.key);
    return sanitizeSessionLane(laneRecord);
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sessionResult = await client.query(
      "INSERT INTO session_records DEFAULT VALUES RETURNING id, created_at"
    );
    const session = sessionResult.rows[0];

    for (const laneRecord of cleanLaneRecords) {
      await client.query(
        `
          INSERT INTO session_lane_records (
            session_id,
            lane_key,
            lane_label,
            blue_player,
            blue_champion_id,
            blue_champion_name,
            blue_champion_image,
            red_player,
            red_champion_id,
            red_champion_name,
            red_champion_image
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          session.id,
          laneRecord.key,
          laneRecord.label,
          laneRecord.blue.player,
          String(laneRecord.blue.champion.id),
          String(laneRecord.blue.champion.name),
          String(laneRecord.blue.champion.image),
          laneRecord.red.player,
          String(laneRecord.red.champion.id),
          String(laneRecord.red.champion.name),
          String(laneRecord.red.champion.image)
        ]
      );
    }

    await client.query("COMMIT");
    return {
      id: String(session.id),
      time: formatSessionTime(session.created_at),
      lanes: cleanLaneRecords
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

app.get("/health", (_request, response) => {
  response.type("text/plain").send("ok\n");
});

app.get("/api/db-status", async (_request, response, next) => {
  try {
    response.json(await databaseStatus());
  } catch (error) {
    next(error);
  }
});

app.get("/api/state", async (_request, response, next) => {
  try {
    const status = await databaseStatus();
    if (!status.ready) {
      response.json({
        ...status,
        storage: "postgres",
        playerPoolNames: [],
        playerSkillScores: {},
        balanceRules: sanitizeBalanceRules(),
        sessionRecords: []
      });
      return;
    }

    response.json({
      ...status,
      storage: "postgres",
      playerPoolNames: await readPlayerPoolNames(),
      playerSkillScores: await readPlayerScores(),
      balanceRules: await readBalanceRules(),
      sessionRecords: await readSessionRecords()
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/players/sync", async (request, response, next) => {
  try {
    if (!(await databaseIsAvailable())) {
      sendDatabaseUnavailable(response);
      return;
    }

    await upsertPlayers(request.body?.names || []);
    response.json({ playerPoolNames: await readPlayerPoolNames() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/players/rename", async (request, response, next) => {
  try {
    if (!(await databaseIsAvailable())) {
      sendDatabaseUnavailable(response);
      return;
    }

    await renamePlayer(request.body?.oldName, request.body?.newName);
    response.json({ ok: true, playerPoolNames: await readPlayerPoolNames() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/players/delete", async (request, response, next) => {
  try {
    if (!(await databaseIsAvailable())) {
      sendDatabaseUnavailable(response);
      return;
    }

    await deletePlayer(request.body?.name);
    response.json({ ok: true, playerPoolNames: await readPlayerPoolNames() });
  } catch (error) {
    next(error);
  }
});

app.put("/api/player-score", async (request, response, next) => {
  try {
    if (!(await databaseIsAvailable())) {
      sendDatabaseUnavailable(response);
      return;
    }

    await savePlayerScore(request.body?.name, request.body?.laneKey, request.body?.score);
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.put("/api/balance-rules", async (request, response, next) => {
  try {
    if (!(await databaseIsAvailable())) {
      sendDatabaseUnavailable(response);
      return;
    }

    const balanceRules = await saveBalanceRules(request.body || {});
    response.json({ ok: true, balanceRules });
  } catch (error) {
    next(error);
  }
});

app.post("/api/session-records", async (request, response, next) => {
  try {
    if (!(await databaseIsAvailable())) {
      sendDatabaseUnavailable(response);
      return;
    }

    const record = await saveSessionRecord(request.body?.lanes || []);
    response.status(201).json({ record });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/session-records", async (_request, response, next) => {
  try {
    if (!(await databaseIsAvailable())) {
      sendDatabaseUnavailable(response);
      return;
    }

    await pool.query("DELETE FROM session_records");
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use(express.static(__dirname, {
  etag: true,
  maxAge: "1h",
  setHeaders(response, filePath) {
    if (filePath.endsWith(".html")) {
      response.setHeader("Cache-Control", "no-cache");
    }
  }
}));

app.use((request, response, next) => {
  if (request.path.startsWith("/api/")) {
    response.status(404).json({ error: "not_found" });
    return;
  }
  next();
});

app.get("*", (_request, response) => {
  response.sendFile(path.join(__dirname, "index.html"));
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.status || 500).json({
    error: error.status ? "bad_request" : "server_error",
    message: error.message || "Unexpected server error"
  });
});

initializeDatabase().then((ready) => {
  if (!ready) {
    console.warn("PostgreSQL is not ready. Persistence is disabled until the database is connected.");
  }
});

app.listen(port, () => {
  console.log(`randomCK server listening on ${port}`);
});
