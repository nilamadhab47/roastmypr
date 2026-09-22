const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
const GOOGLE_CALLBACK = `${PUBLIC_API_URL}/api/auth/google/callback`;

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set — sessions will reset on restart');
}

const oauthState = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

const ALLOWED_REDIRECTS = [
  /^https:\/\/roastmypr\.xyz\/auth\/callback\/?$/,
  /^https:\/\/www\.roastmypr\.xyz\/auth\/callback\/?$/,
  /^http:\/\/localhost:\d+\/auth\/callback\/?$/,
  /^https:\/\/[a-z0-9]+\.chromiumapp\.org\/?$/i
];

function googleConfigured() {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

function googleClient() {
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK);
}

function isAllowedRedirect(uri) {
  if (!uri || typeof uri !== 'string') return false;
  try {
    const url = new URL(uri);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return ALLOWED_REDIRECTS.some((re) => re.test(uri.split('#')[0]));
  } catch {
    return false;
  }
}

function createState(redirectUri) {
  const state = crypto.randomBytes(16).toString('hex');
  oauthState.set(state, { redirectUri, at: Date.now() });
  return state;
}

function consumeState(state) {
  const row = oauthState.get(state);
  oauthState.delete(state);
  if (!row) return null;
  if (Date.now() - row.at > STATE_TTL_MS) return null;
  return row;
}

function googleAuthUrl(state) {
  const client = googleClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'select_account',
    scope: ['openid', 'email', 'profile'],
    state
  });
}

async function exchangeCode(code) {
  const client = googleClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new Error('Google did not return an ID token');
  }
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();
  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email,
    picture: payload.picture || ''
  };
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function readBearer(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

module.exports = {
  googleConfigured,
  isAllowedRedirect,
  createState,
  consumeState,
  googleAuthUrl,
  exchangeCode,
  signToken,
  verifyToken,
  readBearer,
  GOOGLE_CALLBACK
};
