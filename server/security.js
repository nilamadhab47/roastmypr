const crypto = require('crypto');

/** Events the extension / site actually send (or the API records itself). */
const ALLOWED_EVENTS = new Set([
  'login',
  'prefs_updated',
  'roast_generated',
  'roast_again',
  'roast_meaner',
  'feedback_submitted'
]);

const EVENT_MAX_BYTES = 2048;

function timingSafeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function adminGate(headerKey, envKey = process.env.ADMIN_KEY) {
  if (!envKey) {
    return { ok: false, status: 503, error: 'admin disabled' };
  }
  if (!headerKey || !timingSafeEqualString(String(headerKey), envKey)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  return { ok: true };
}

function requireAdmin(req, res, next) {
  const result = adminGate(req.headers['x-admin-key']);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  return next();
}

async function findExistingKey(apiKey, memMap, store) {
  if (!apiKey) return null;
  if (memMap.has(apiKey)) return memMap.get(apiKey);
  const fromStore = await store.getKey(apiKey);
  if (fromStore) {
    memMap.set(apiKey, fromStore);
    return fromStore;
  }
  return null;
}

function parseEventPayload(body, contentLength) {
  const declared = Number(contentLength || 0);
  if (Number.isFinite(declared) && declared > EVENT_MAX_BYTES) {
    return { ok: false, status: 413, error: 'payload too large' };
  }
  const raw = JSON.stringify(body || {});
  if (Buffer.byteLength(raw, 'utf8') > EVENT_MAX_BYTES) {
    return { ok: false, status: 413, error: 'payload too large' };
  }
  const name = String(body?.name || '').trim();
  if (!ALLOWED_EVENTS.has(name)) {
    return { ok: false, status: 400, error: 'unknown event' };
  }
  const properties = body?.properties && typeof body.properties === 'object' && !Array.isArray(body.properties)
    ? body.properties
    : {};
  return { ok: true, name, properties };
}

module.exports = {
  ALLOWED_EVENTS,
  EVENT_MAX_BYTES,
  timingSafeEqualString,
  adminGate,
  requireAdmin,
  findExistingKey,
  parseEventPayload
};
