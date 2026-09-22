const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_PATH = path.join(DATA_DIR, 'store.json');
const MAX_EVENTS = 5000;
const MAX_FEEDBACK = 2000;

let pool = null;

function databaseUrl() {
  return String(process.env.DATABASE_URL || '').trim();
}

function localDb() {
  const url = databaseUrl();
  return /localhost|127\.0\.0\.1/i.test(url);
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  picture TEXT,
  roast_personality TEXT DEFAULT 'savage',
  default_roast_level INTEGER DEFAULT 3,
  gifs_enabled BOOLEAN DEFAULT TRUE,
  api_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS api_keys (
  key TEXT PRIMARY KEY,
  tier TEXT DEFAULT 'beta',
  device_id TEXT,
  user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hourly_usage JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_user_name_idx ON events (user_id, name);
CREATE INDEX IF NOT EXISTS events_at_idx ON events (at DESC);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  name TEXT,
  message TEXT,
  rating INTEGER,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_user_idx ON feedback (user_id);
`;

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    googleId: row.google_id,
    email: row.email,
    name: row.name,
    picture: row.picture || '',
    roastPersonality: row.roast_personality || 'savage',
    defaultRoastLevel: row.default_roast_level || 3,
    gifsEnabled: row.gifs_enabled !== false,
    apiKey: row.api_key || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    lastLoginAt: row.last_login_at instanceof Date ? row.last_login_at.toISOString() : row.last_login_at
  };
}

function mapKey(row) {
  if (!row) return null;
  return {
    tier: row.tier || 'beta',
    deviceId: row.device_id || null,
    userId: row.user_id || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    hourlyUsage: row.hourly_usage || {}
  };
}

function requirePool() {
  if (!pool) {
    throw new Error('Database is not initialized');
  }
  return pool;
}

async function init() {
  const url = databaseUrl();
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  pool = new Pool({
    connectionString: url,
    ssl: localDb() ? false : { rejectUnauthorized: false },
    max: 8,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000
  });

  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    await client.query(SCHEMA);
  } finally {
    client.release();
  }

  await migrateJsonIfPresent();
}

async function ping() {
  const result = await requirePool().query('SELECT 1 AS ok');
  return result.rows[0]?.ok === 1;
}

async function migrateJsonIfPresent() {
  try {
    if (!fs.existsSync(DATA_PATH)) return;
    const parsed = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    const users = Object.values(parsed.users || {});
    const keys = parsed.keys || {};
    const events = parsed.events || [];
    const feedback = parsed.feedback || [];
    if (!users.length && !Object.keys(keys).length) return;

    const { rows } = await requirePool().query('SELECT COUNT(*)::int AS n FROM users');
    if (rows[0].n > 0) return;

    const client = await requirePool().connect();
    try {
      await client.query('BEGIN');
      for (const user of users) {
        await client.query(
          `INSERT INTO users (id, google_id, email, name, picture, roast_personality, default_roast_level, gifs_enabled, api_key, created_at, last_login_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id) DO NOTHING`,
          [
            user.id,
            user.googleId,
            user.email,
            user.name,
            user.picture || '',
            user.roastPersonality || 'savage',
            user.defaultRoastLevel || 3,
            user.gifsEnabled !== false,
            user.apiKey || null,
            user.createdAt || new Date().toISOString(),
            user.lastLoginAt || null
          ]
        );
      }
      for (const [key, data] of Object.entries(keys)) {
        await client.query(
          `INSERT INTO api_keys (key, tier, device_id, user_id, created_at, hourly_usage)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb)
           ON CONFLICT (key) DO NOTHING`,
          [
            key,
            data.tier || 'beta',
            data.deviceId || null,
            data.userId || null,
            data.createdAt || new Date().toISOString(),
            JSON.stringify(data.hourlyUsage || {})
          ]
        );
      }
      for (const event of events) {
        await client.query(
          `INSERT INTO events (id, user_id, name, properties, at)
           VALUES ($1,$2,$3,$4::jsonb,$5)
           ON CONFLICT (id) DO NOTHING`,
          [
            event.id,
            event.userId || null,
            event.name,
            JSON.stringify(event.properties || {}),
            event.at || new Date().toISOString()
          ]
        );
      }
      for (const item of feedback) {
        await client.query(
          `INSERT INTO feedback (id, user_id, email, name, message, rating, at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO NOTHING`,
          [
            item.id,
            item.userId || null,
            item.email || '',
            item.name || '',
            item.message || '',
            item.rating || null,
            item.at || new Date().toISOString()
          ]
        );
      }
      await client.query('COMMIT');
      console.log(`[store] Migrated local store.json → Postgres (${users.length} users)`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn('[store] JSON migrate skipped:', err.message);
  }
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    roastPersonality: user.roastPersonality || 'savage',
    defaultRoastLevel: user.defaultRoastLevel || 3,
    gifsEnabled: user.gifsEnabled !== false,
    createdAt: user.createdAt
  };
}

async function upsertGoogleUser(profile) {
  const now = new Date().toISOString();
  const existing = await requirePool().query(
    'SELECT * FROM users WHERE google_id = $1',
    [profile.googleId]
  );

  if (!existing.rows[0]) {
    const id = 'usr_' + String(profile.googleId).slice(0, 16);
    const inserted = await requirePool().query(
      `INSERT INTO users (id, google_id, email, name, picture, roast_personality, default_roast_level, gifs_enabled, api_key, created_at, last_login_at)
       VALUES ($1,$2,$3,$4,$5,'savage',3,TRUE,NULL,$6,$6)
       ON CONFLICT (google_id) DO UPDATE SET
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         picture = EXCLUDED.picture,
         last_login_at = EXCLUDED.last_login_at
       RETURNING *`,
      [id, profile.googleId, profile.email, profile.name, profile.picture || '', now]
    );
    return mapUser(inserted.rows[0]);
  }

  const updated = await requirePool().query(
    `UPDATE users
     SET email = COALESCE($2, email),
         name = COALESCE($3, name),
         picture = COALESCE($4, picture),
         last_login_at = $5
     WHERE google_id = $1
     RETURNING *`,
    [profile.googleId, profile.email, profile.name, profile.picture || '', now]
  );
  return mapUser(updated.rows[0]);
}

async function attachApiKey(user, apiKey, keyData) {
  await requirePool().query('UPDATE users SET api_key = $2 WHERE id = $1', [user.id, apiKey]);
  user.apiKey = apiKey;
  await putKey(apiKey, { ...keyData, userId: user.id });
}

async function getUser(id) {
  if (!id) return null;
  const { rows } = await requirePool().query('SELECT * FROM users WHERE id = $1', [id]);
  return mapUser(rows[0]);
}

async function getUserByApiKey(apiKey) {
  if (!apiKey) return null;
  const { rows } = await requirePool().query(
    `SELECT u.* FROM users u
     LEFT JOIN api_keys k ON k.user_id = u.id
     WHERE u.api_key = $1 OR k.key = $1
     LIMIT 1`,
    [apiKey]
  );
  return mapUser(rows[0]);
}

async function getKey(apiKey) {
  if (!apiKey) return null;
  const { rows } = await requirePool().query('SELECT * FROM api_keys WHERE key = $1', [apiKey]);
  return mapKey(rows[0]);
}

async function putKey(apiKey, data) {
  const existing = await getKey(apiKey);
  const merged = { ...(existing || {}), ...data };
  await requirePool().query(
    `INSERT INTO api_keys (key, tier, device_id, user_id, created_at, hourly_usage)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb)
     ON CONFLICT (key) DO UPDATE SET
       tier = EXCLUDED.tier,
       device_id = EXCLUDED.device_id,
       user_id = COALESCE(EXCLUDED.user_id, api_keys.user_id),
       hourly_usage = EXCLUDED.hourly_usage`,
    [
      apiKey,
      merged.tier || 'beta',
      merged.deviceId || null,
      merged.userId || null,
      merged.createdAt || new Date().toISOString(),
      JSON.stringify(merged.hourlyUsage || {})
    ]
  );
  return merged;
}

async function updateUserPrefs(userId, prefs) {
  const user = await getUser(userId);
  if (!user) return null;
  const roastPersonality = prefs.roastPersonality || user.roastPersonality;
  const defaultRoastLevel = prefs.defaultRoastLevel != null ? prefs.defaultRoastLevel : user.defaultRoastLevel;
  const gifsEnabled = typeof prefs.gifsEnabled === 'boolean' ? prefs.gifsEnabled : user.gifsEnabled;
  const { rows } = await requirePool().query(
    `UPDATE users
     SET roast_personality = $2,
         default_roast_level = $3,
         gifs_enabled = $4
     WHERE id = $1
     RETURNING *`,
    [userId, roastPersonality, defaultRoastLevel, gifsEnabled]
  );
  return mapUser(rows[0]);
}

async function addEvent(event) {
  const id = 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  await requirePool().query(
    `INSERT INTO events (id, user_id, name, properties, at)
     VALUES ($1,$2,$3,$4::jsonb,NOW())`,
    [id, event.userId || null, event.name, JSON.stringify(event.properties || {})]
  );
  await requirePool().query(
    `DELETE FROM events
     WHERE id IN (
       SELECT id FROM events ORDER BY at DESC OFFSET $1
     )`,
    [MAX_EVENTS]
  );
}

async function addFeedback(entry) {
  const item = {
    id: 'fb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    userId: entry.userId,
    email: entry.email || '',
    name: entry.name || '',
    message: String(entry.message || '').slice(0, 2000),
    rating: entry.rating || null,
    at: new Date().toISOString()
  };
  await requirePool().query(
    `INSERT INTO feedback (id, user_id, email, name, message, rating, at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [item.id, item.userId || null, item.email, item.name, item.message, item.rating, item.at]
  );
  await requirePool().query(
    `DELETE FROM feedback
     WHERE id IN (
       SELECT id FROM feedback ORDER BY at DESC OFFSET $1
     )`,
    [MAX_FEEDBACK]
  );
  return item;
}

async function userStats(userId) {
  const counts = await requirePool().query(
    `SELECT name, COUNT(*)::int AS n
     FROM events
     WHERE user_id = $1
     GROUP BY name`,
    [userId]
  );
  const byName = Object.fromEntries(counts.rows.map((r) => [r.name, r.n]));
  const feedback = await requirePool().query(
    'SELECT COUNT(*)::int AS n FROM feedback WHERE user_id = $1',
    [userId]
  );
  return {
    roasts: byName.roast_generated || 0,
    again: byName.roast_again || 0,
    meaner: byName.roast_meaner || 0,
    gifInserted: byName.gif_inserted || 0,
    roastInserted: byName.roast_inserted || 0,
    feedback: feedback.rows[0]?.n || 0
  };
}

async function analyticsSummary() {
  const users = await requirePool().query('SELECT COUNT(*)::int AS n FROM users');
  const events = await requirePool().query('SELECT COUNT(*)::int AS n FROM events');
  const feedback = await requirePool().query('SELECT COUNT(*)::int AS n FROM feedback');
  const byEvent = await requirePool().query(
    'SELECT name, COUNT(*)::int AS n FROM events GROUP BY name'
  );
  const recent = await requirePool().query(
    'SELECT id, user_id, email, name, message, rating, at FROM feedback ORDER BY at DESC LIMIT 20'
  );
  return {
    users: users.rows[0].n,
    events: events.rows[0].n,
    feedback: feedback.rows[0].n,
    byEvent: Object.fromEntries(byEvent.rows.map((r) => [r.name, r.n])),
    recentFeedback: recent.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      message: row.message,
      rating: row.rating,
      at: row.at
    }))
  };
}

async function hydrateKeyMap(map) {
  const { rows } = await requirePool().query('SELECT * FROM api_keys');
  for (const row of rows) {
    if (!map.has(row.key)) map.set(row.key, mapKey(row));
  }
}

module.exports = {
  init,
  ping,
  publicUser,
  upsertGoogleUser,
  attachApiKey,
  getUser,
  getUserByApiKey,
  getKey,
  putKey,
  updateUserPrefs,
  addEvent,
  addFeedback,
  userStats,
  analyticsSummary,
  hydrateKeyMap
};
