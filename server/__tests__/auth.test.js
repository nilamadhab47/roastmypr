const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const {
  adminGate,
  requireAdmin,
  findExistingKey,
  parseEventPayload,
  ALLOWED_EVENTS
} = require('../security');

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

function request(port, { method = 'GET', path, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      method,
      path,
      headers
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { /* empty */ }
        resolve({ status: res.statusCode, json, raw: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('adminGate', () => {
  it('returns 503 when ADMIN_KEY is unset', () => {
    const result = adminGate('anything', '');
    assert.equal(result.status, 503);
    assert.equal(result.error, 'admin disabled');
  });

  it('returns 401 when the header is missing', () => {
    const result = adminGate(undefined, 'secret');
    assert.equal(result.status, 401);
  });

  it('returns 401 when the header is wrong', () => {
    const result = adminGate('nope', 'secret');
    assert.equal(result.status, 401);
  });

  it('passes when the header matches', () => {
    const result = adminGate('secret', 'secret');
    assert.equal(result.ok, true);
  });
});

describe('findExistingKey', () => {
  it('rejects an unknown rmpr_beta_ key', async () => {
    const store = { getKey: async () => null };
    const found = await findExistingKey('rmpr_beta_invented_not_in_db', new Map(), store);
    assert.equal(found, null);
  });

  it('returns a key that is already in memory/store', async () => {
    const mem = new Map();
    mem.set('rmpr_beta_stored', { tier: 'beta', hourlyUsage: {} });
    const store = {
      getKey: async () => {
        throw new Error('should not hit the database');
      }
    };
    const found = await findExistingKey('rmpr_beta_stored', mem, store);
    assert.equal(found.tier, 'beta');
  });
});

describe('parseEventPayload', () => {
  it('accepts allowlisted event names', () => {
    for (const name of ALLOWED_EVENTS) {
      const parsed = parseEventPayload({ name, properties: { ok: true } }, 40);
      assert.equal(parsed.ok, true, name);
      assert.equal(parsed.name, name);
    }
  });

  it('rejects unknown names and oversized bodies', () => {
    assert.equal(parseEventPayload({ name: 'drop_all_tables' }).ok, false);
    assert.equal(parseEventPayload({ name: 'login' }, 9000).status, 413);
  });
});

describe('HTTP: keys and admin', () => {
  let server;
  let port;
  const apiKeys = new Map();
  const store = {
    getKey: async (key) => apiKeys.get(key) || null
  };

  before(async () => {
    const app = express();
    app.use(express.json());
    app.get('/api/validate', async (req, res) => {
      const keyData = await findExistingKey(req.headers['x-api-key'], apiKeys, store);
      if (!keyData) return res.status(401).json({ error: 'invalid_api_key' });
      res.json({ valid: true, tier: keyData.tier });
    });
    app.post('/api/admin/keys', requireAdmin, (req, res) => {
      res.json({ ok: true });
    });
    ({ server, port } = await listen(app));
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  beforeEach(() => {
    apiKeys.clear();
  });

  it('unknown rmpr_beta_ key gets 401', async () => {
    const res = await request(port, {
      path: '/api/validate',
      headers: { 'x-api-key': 'rmpr_beta_not_real_at_all' }
    });
    assert.equal(res.status, 401);
    assert.equal(res.json.error, 'invalid_api_key');
  });

  it('a stored key passes', async () => {
    apiKeys.set('rmpr_beta_known', { tier: 'beta', hourlyUsage: {} });
    const res = await request(port, {
      path: '/api/validate',
      headers: { 'x-api-key': 'rmpr_beta_known' }
    });
    assert.equal(res.status, 200);
    assert.equal(res.json.valid, true);
  });

  it('admin with ADMIN_KEY unset gets 503', async () => {
    const prev = process.env.ADMIN_KEY;
    delete process.env.ADMIN_KEY;
    try {
      const res = await request(port, {
        method: 'POST',
        path: '/api/admin/keys',
        headers: { 'content-type': 'application/json' },
        body: '{}'
      });
      assert.equal(res.status, 503);
      assert.equal(res.json.error, 'admin disabled');
    } finally {
      if (prev !== undefined) process.env.ADMIN_KEY = prev;
    }
  });

  it('admin with the wrong key gets 401', async () => {
    const prev = process.env.ADMIN_KEY;
    process.env.ADMIN_KEY = 'correct-admin-secret';
    try {
      const res = await request(port, {
        method: 'POST',
        path: '/api/admin/keys',
        headers: {
          'content-type': 'application/json',
          'x-admin-key': 'wrong'
        },
        body: '{}'
      });
      assert.equal(res.status, 401);
      assert.equal(res.json.error, 'Unauthorized');
    } finally {
      if (prev === undefined) delete process.env.ADMIN_KEY;
      else process.env.ADMIN_KEY = prev;
    }
  });
});
