/**
 * RoastMyPR API Server
 * 
 * Proxies requests to Claude and Giphy with your embedded API keys.
 * Implements rate limiting (100 calls/hour for free beta tier).
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const store = require('./store');
const auth = require('./auth');
const jevGate = require('./jev-gate');
const { requireAdmin, findExistingKey, parseEventPayload } = require('./security');

const app = express();
const PORT = process.env.PORT || 3000;

// API Keys from environment variables (YOUR keys, not user's)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
const MOCK = process.env.ROASTMYPR_MOCK === '1';
const MOCK_ROAST = require('./fixtures/mock-roast.json');
const MOCK_GIFS = [
  {
    query: 'code review',
    thumbnail: 'https://media2.giphy.com/media/LyJ6KPlrFdKnK/200.gif',
    original: 'https://media2.giphy.com/media/LyJ6KPlrFdKnK/giphy.gif',
    title: 'The reviewer'
  },
  {
    query: 'this is fine',
    thumbnail: 'https://media2.giphy.com/media/CNna9G8BQvnoI/200.gif',
    original: 'https://media2.giphy.com/media/CNna9G8BQvnoI/giphy.gif',
    title: 'Your confidence'
  }
];

// Pricing tiers
const TIERS = {
  beta: { 
    callsPerHour: 100, 
    name: 'Free Beta',
    description: 'Free Beta API access'
  },
  enterprise: { 
    callsPerHour: 10000, 
    name: 'Enterprise',
    description: 'High-volume enterprise access'
  }
};

// In-memory storage for API keys and usage (replace with database in production)
// Format: { apiKey: { tier, deviceId, createdAt, hourlyUsage: { hour: count } } }
const apiKeys = new Map();
const usageStats = {
  totalReviews: 0,
  totalGifs: 0
};

async function generateApiKey(tier = 'beta', userId = null) {
  const key = `rmpr_${tier}_${uuidv4().replace(/-/g, '')}`;
  const keyData = {
    tier,
    userId,
    createdAt: new Date().toISOString(),
    hourlyUsage: {}
  };
  apiKeys.set(key, keyData);
  await store.putKey(key, keyData);
  return key;
}

async function ensureUserKey(user) {
  if (user.apiKey && apiKeys.has(user.apiKey)) return user.apiKey;
  const existing = user.apiKey ? await store.getKey(user.apiKey) : null;
  if (user.apiKey && existing) {
    apiKeys.set(user.apiKey, existing);
    return user.apiKey;
  }
  const key = await generateApiKey('beta', user.id);
  await store.attachApiKey(user, key, apiKeys.get(key));
  return key;
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    /chrome-extension:\/\/.*/,
    'https://github.com',
    /http:\/\/localhost:.*/,
    'https://roastmypr.com',
    'https://www.roastmypr.com',
    'https://roastmypr.xyz',
    'https://www.roastmypr.xyz'
  ],
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// General rate limiting (per IP)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(generalLimiter);

function wrapAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Validate API key or Google session
const validateApiKey = wrapAsync(async (req, res, next) => {
  const bearer = auth.readBearer(req);
  if (bearer) {
    const payload = auth.verifyToken(bearer);
    if (!payload?.sub) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    const user = await store.getUser(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    const apiKey = await ensureUserKey(user);
    let keyData = apiKeys.get(apiKey) || await store.getKey(apiKey);
    if (!keyData) {
      keyData = { tier: 'beta', userId: user.id, createdAt: user.createdAt, hourlyUsage: {} };
      apiKeys.set(apiKey, keyData);
    }
    req.user = user;
    req.apiKey = apiKey;
    req.keyData = keyData;
    req.tier = TIERS[keyData.tier] || TIERS.beta;
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Sign in with Google or provide an API key' });
  }
  
  const keyData = await findExistingKey(apiKey, apiKeys, store);

  if (!keyData) {
    return res.status(401).json({ error: 'invalid_api_key' });
  }

  if (!apiKeys.has(apiKey)) apiKeys.set(apiKey, keyData);
  
  req.apiKey = apiKey;
  req.keyData = keyData;
  req.tier = TIERS[keyData.tier] || TIERS.beta;
  req.user = keyData.userId ? await store.getUser(keyData.userId) : await store.getUserByApiKey(apiKey);
  
  next();
});

const optionalAuth = wrapAsync(async (req, _res, next) => {
  const bearer = auth.readBearer(req);
  if (bearer) {
    const payload = auth.verifyToken(bearer);
    if (payload?.sub) req.user = await store.getUser(payload.sub);
  }
  next();
});

function usagePayload(keyData, tier) {
  const currentHour = new Date().toISOString().slice(0, 13);
  const hourlyUsed = keyData.hourlyUsage[currentHour] || 0;
  return {
    tier: keyData.tier,
    tierName: tier.name,
    callsPerHour: tier.callsPerHour,
    callsUsedThisHour: hourlyUsed,
    callsRemainingThisHour: Math.max(0, tier.callsPerHour - hourlyUsed)
  };
}

// Check hourly rate limit
const checkRateLimit = wrapAsync(async (req, res, next) => {
  const { keyData, tier, apiKey } = req;
  
  const currentHour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
  const hourlyCount = keyData.hourlyUsage[currentHour] || 0;
  
  if (hourlyCount >= tier.callsPerHour) {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded. ${tier.name} tier allows ${tier.callsPerHour} calls per hour.`,
      resetAt: new Date(new Date().setMinutes(60, 0, 0)).toISOString(),
      upgradeUrl: 'https://roastmypr.xyz'
    });
  }
  
  // Increment usage
  keyData.hourlyUsage[currentHour] = hourlyCount + 1;
  if (req.apiKey) await store.putKey(req.apiKey, keyData);
  
  // Clean up old hours
  const hours = Object.keys(keyData.hourlyUsage);
  if (hours.length > 24) {
    hours.sort().slice(0, -24).forEach(h => delete keyData.hourlyUsage[h]);
  }
  
  next();
});

// Health check
app.get('/health', async (req, res) => {
  let postgres = false;
  try {
    postgres = await store.ping();
  } catch {
    postgres = false;
  }
  res.json({ 
    status: postgres ? 'ok' : 'degraded',
    service: 'RoastMyPR API',
    hasAnthropicKey: !!ANTHROPIC_API_KEY,
    hasGiphyKey: !!GIPHY_API_KEY,
    hasJevKey: !!process.env.TYPESAFE_API_KEY,
    postgres,
    googleAuth: auth.googleConfigured()
  });
});

async function sessionResponse(user) {
  const apiKey = await ensureUserKey(user);
  const keyData = apiKeys.get(apiKey) || await store.getKey(apiKey);
  const tier = TIERS[keyData?.tier] || TIERS.beta;
  return {
    token: auth.signToken(user),
    apiKey,
    user: store.publicUser(user),
    ...usagePayload(keyData, tier),
    stats: await store.userStats(user.id)
  };
}

app.get('/api/auth/google/start', (req, res) => {
  if (!auth.googleConfigured()) {
    return res.status(503).json({ error: 'Google login is not configured' });
  }
  const redirectUri = String(req.query.redirect_uri || '');
  if (!auth.isAllowedRedirect(redirectUri)) {
    return res.status(400).json({ error: 'Invalid redirect_uri' });
  }
  const state = auth.createState(redirectUri);
  res.redirect(auth.googleAuthUrl(state));
});

app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const saved = auth.consumeState(String(state || ''));
    if (!saved) {
      return res.status(400).send('Login expired. Close this window and try again.');
    }
    const profile = await auth.exchangeCode(String(code || ''));
    const user = await store.upsertGoogleUser(profile);
    await ensureUserKey(user);
    await store.addEvent({ userId: user.id, name: 'login', properties: { source: 'google' } });
    const token = auth.signToken(user);
    const target = new URL(saved.redirectUri);
    target.searchParams.set('token', token);
    res.redirect(target.toString());
  } catch (err) {
    console.error('Google callback error:', err);
    res.status(500).send('Google login failed. Close this window and try again.');
  }
});

app.get('/api/me', validateApiKey, async (req, res) => {
  if (!req.user) {
    const { keyData, tier } = req;
    return res.json({
      loggedIn: false,
      ...usagePayload(keyData, tier)
    });
  }
  res.json({
    loggedIn: true,
    ...await sessionResponse(req.user)
  });
});

app.patch('/api/me', validateApiKey, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Sign in with Google to save personality' });
  }
  const allowed = ['dry', 'sarcastic', 'savage', 'unhinged'];
  const prefs = {};
  if (allowed.includes(req.body.roastPersonality)) prefs.roastPersonality = req.body.roastPersonality;
  if (req.body.defaultRoastLevel != null) prefs.defaultRoastLevel = clampLevel(req.body.defaultRoastLevel, 3);
  if (typeof req.body.gifsEnabled === 'boolean') prefs.gifsEnabled = req.body.gifsEnabled;
  const user = await store.updateUserPrefs(req.user.id, prefs);
  await store.addEvent({ userId: user.id, name: 'prefs_updated', properties: prefs });
  res.json({ user: store.publicUser(user) });
});

app.post('/api/events', optionalAuth, async (req, res) => {
  const parsed = parseEventPayload(req.body, req.headers['content-length']);
  if (!parsed.ok) {
    return res.status(parsed.status).json({ error: parsed.error });
  }
  await store.addEvent({
    userId: req.user?.id || null,
    name: parsed.name,
    properties: parsed.properties
  });
  res.json({ ok: true });
});

app.post('/api/feedback', validateApiKey, async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (message.length < 3) {
    return res.status(400).json({ error: 'Feedback is too short' });
  }
  const item = await store.addFeedback({
    userId: req.user?.id || null,
    email: req.user?.email,
    name: req.user?.name,
    message,
    rating: req.body.rating ? Number(req.body.rating) : null
  });
  await store.addEvent({ userId: req.user?.id || null, name: 'feedback_submitted' });
  res.json({ ok: true, id: item.id });
});

// Validate API key endpoint
app.get('/api/validate', validateApiKey, (req, res) => {
  const { keyData, tier, user } = req;
  res.json({
    valid: true,
    loggedIn: Boolean(user),
    user: store.publicUser(user),
    ...usagePayload(keyData, tier)
  });
});

app.get('/api/user', validateApiKey, async (req, res) => {
  const { keyData, tier, user } = req;
  res.json({
    loggedIn: Boolean(user),
    user: store.publicUser(user),
    apiKey: user?.apiKey || req.apiKey,
    canReview: usagePayload(keyData, tier).callsRemainingThisHour > 0,
    stats: user ? await store.userStats(user.id) : null,
    ...usagePayload(keyData, tier)
  });
});

const ARCHETYPES = [
  'The 2AM Hotfix',
  'The Copy-Paste Special',
  'The Kitchen Sink',
  'The Ghost PR',
  'The Experimentalist',
  'The Overengineer',
  'The Quick Change',
  'The Accidental Rewrite',
  'The TODO Graveyard',
  'The Dependency Collector',
  'The One-Liner That Changed 47 Files',
  'The Breaking Change™',
  'The Merge Conflict Survivor',
  'The Works on My Machine',
  'The Weekend Deploy',
  'The Infinite Refactor',
  'The Final-Final-Final PR',
  'The README Engineer',
  'The Microservice for a Boolean',
  'The Surgical Strike',
  'The Drive-By Formatter',
  'The One-Line Hero'
];

const PERSONALITY_NOTES = {
  dry: 'Voice: dry, deadpan, almost bored. No exclamation marks. Understatement is the joke.',
  sarcastic: 'Voice: dripping sarcasm. Pretend to compliment, then twist the knife.',
  savage: 'Voice: default RoastMyPR — short, brutal, specific, funny.',
  unhinged: 'Voice: chaotic internet energy. Still roast the CODE, never the person.'
};

const SYSTEM_PROMPT = `You are RoastMyPR — a stand-up comedian who reads git diffs for a living.
Your job is to ROAST the PR, not review it. Users already have real reviewers.
You are the entertainment. Be funny. Be specific to THIS diff. Keep it SHORT.

Respond with ONLY valid JSON, no markdown fences:

{
  "roast": "the headline roast, max 18 words",
  "roastLevel": 1,
  "archetype": "one archetype from the allowed list",
  "reason": "why this roast, max 12 words, still a joke",
  "gif_queries": ["2-4 word search", "another", "third", "fourth"],
  "alternativeRoasts": ["different angle roast", "another different roast", "third different roast"]
}

Allowed archetypes (pick the one that best matches the DIFF, not at random):
${ARCHETYPES.join(' | ')}

Rules:
- THIS IS A COMEDY ROAST, NOT A CODE REVIEW.
- GOOD: "847 lines for a typo is incredible commitment."
- BAD: "Your code contains a potential race condition because..."
- roast: ONE punchline in English. Reference real filenames, symbols, or PR title words.
- reason: still a joke, never an explanation of a bug.
- roastLevel 1 = light teasing, 5 = career-reevaluation energy.
- Language: US English only. Every string in the JSON must be English.
  Forbidden: Hindi, Hinglish, transliteration, Devanagari, Bollywood, celebrity names.
  BAD roast: "Itna detailed test plan likha, code dikha hi nahi."
  GOOD roast: "A novel-length test plan. The code is still a plot twist."
- alternativeRoasts: exactly 3 more DISTINCT English punchlines. Same PR, different joke. Do not repeat the headline roast. Each max 18 words. Never omit this array.
- gif_queries: exactly 4 English Giphy search phrases for a visual reaction to THIS PR's size and mess.
  Good: "this is fine dog", "too many files", "merge conflict screaming", "programmer crying laptop", "lgtm stamp", "code review panic".
  Bad: abstract words (chaos, vibe, energy), celebrity names, Bollywood, Hindi, desi, bhai, SRK, Hinglish.
  At least 2 must include a coding word: code, pr, merge, commit, deploy, bug, laptop, programmer, debug.
- Roast the CODE, never the person. Never invent facts about the diff.
- This is a LIGHT GitHub review: if a casual reviewer would clock something obvious (huge diff, leftover console.log/debugger, empty description, title that doesn't match), hint at it in the joke. One hint, not a bug list.
- If mode is "again", you MUST write a new roast that is not in previousRoasts.
- If mode is "meaner", you MUST hit the requested targetLevel and escalate the joke.`;

function personalityBlock(personality) {
  return PERSONALITY_NOTES[personality] || PERSONALITY_NOTES.savage;
}

function clampLevel(n, fallback = 3) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(5, Math.max(1, Math.round(v)));
}

async function generateRoastFromClaude(userPrompt) {
  if (MOCK) {
    return JSON.parse(JSON.stringify(MOCK_ROAST));
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(`Claude API error ${response.status}: ${errText}`);
    err.status = 502;
    err.publicMessage = 'Failed to get review from AI';
    throw err;
  }

  const result = await response.json();
  const content = result.content?.[0]?.text || '';

  try {
    return JSON.parse(content);
  } catch {
    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const err = new Error('Failed to parse AI response');
      err.status = 502;
      err.publicMessage = 'Failed to parse AI response';
      err.raw = content;
      throw err;
    }
  }
}

function prDataFromRequest({ prTitle, prDescription, diff, lineCount, fileCount }) {
  return {
    title: prTitle,
    body: prDescription,
    diff,
    changed_lines: lineCount,
    files: fileCount
  };
}

function groundedGifQueries(prData = {}) {
  const files = Number(prData.files || 0);
  const lines = Number(prData.changed_lines || 0);
  const q = [];
  if (files >= 20 || lines >= 800) q.push('this is fine dog fire');
  if (files >= 8) q.push('too many files');
  if (lines >= 300) q.push('endless scrolling code');
  q.push('code review panic', 'merge conflict screaming', 'programmer crying laptop', 'lgtm rubber stamp');
  return q;
}

function looksLikeCodingGifQuery(q) {
  return /code|pr\b|pull request|merge|commit|deploy|bug|laptop|programmer|debug|review|lgtm|ship|test|diff|github|dev|this is fine|crying|panic|scream|rubber stamp|too many|keyboard/i.test(q);
}

const HINGLISH_RE = /[\u0900-\u097F]|\bitna\b|\bnahi\b|\bnahin\b|\blikha\b|\bdikha\b|\bbhai\b|\byaar\b|\bmatlab\b|\bnamaste\b|\bkya\b|\bphir\b|\bbanaaye\b|\bhai na\b|\bakhir\b|\bbilkul\b|\baccha\b|\btheek\b|\bkyun\b|\blekin\b|\bbahut\b|\bthoda\b|\bdekho\b|\barey\b|\bbakwas\b|\bjugaad\b|\bhi nahi\b|\bkar diya\b|\bho gaya\b/i;

function isEnglishLine(line) {
  const text = String(line || '').trim();
  if (!text) return false;
  if (HINGLISH_RE.test(text)) return false;
  return true;
}

function fallbackEnglishRoasts(prData = {}) {
  const title = String(prData.title || 'this PR').replace(/\s+/g, ' ').trim().slice(0, 48);
  const files = Number(prData.files || 0);
  const lines = Number(prData.changed_lines || 0);
  return [
    files >= 8
      ? `${files} files for "${title}" is a lot of confidence.`
      : `"${title}" — the title shipped harder than the diff.`,
    lines > 0
      ? `${lines} lines later, tests are still a rumor.`
      : 'Test plan: present. Code: missing in action.',
    'Docs showed up. Implementation left a voicemail.',
    'A magician PR: big talk, nothing in the hat.'
  ];
}

function ensureEnglishRoasts(roast, prData = {}) {
  const pool = [roast.roast, ...(roast.alternativeRoasts || []), ...(roast.jokes || [])]
    .map((line) => String(line || '').trim())
    .filter(isEnglishLine);
  const unique = [];
  for (const line of [...pool, ...fallbackEnglishRoasts(prData)]) {
    if (unique.length >= 4) break;
    if (!unique.some((x) => x.toLowerCase() === line.toLowerCase())) unique.push(line);
  }
  const [headline, ...alts] = unique;
  roast.roast = headline;
  roast.alternativeRoasts = alts.slice(0, 3);
  roast.jokes = [headline, ...roast.alternativeRoasts];
  if (!isEnglishLine(roast.reason)) {
    roast.reason = 'The diff made a face.';
  }
  roast.vibe = roast.reason || headline;
  return roast;
}

function roastNeedsEnglishRetry(roast) {
  if (!isEnglishLine(roast.roast) || !isEnglishLine(roast.reason)) return true;
  const alts = (roast.alternativeRoasts || []).filter(isEnglishLine);
  return alts.length < 3;
}

function sanitizeGifQueries(queries, prData) {
  const banned = /bollywood|desi|hindi|bhai|srk|shah rukh|namaste|dhol|item song|indian movie|shahrukh|hinglish|matlab|yaar/i;
  const cleaned = (Array.isArray(queries) ? queries : [])
    .map((q) => String(q || '').trim())
    .filter((q) => q && q.length < 48 && !banned.test(q) && looksLikeCodingGifQuery(q));
  const out = [];
  for (const q of [...cleaned, ...groundedGifQueries(prData)]) {
    if (out.length >= 4) break;
    if (!out.some((x) => x.toLowerCase() === q.toLowerCase())) out.push(q);
  }
  return out.slice(0, 4);
}

function normalizeRoast(parsed, prData = {}) {
  const jokes = Array.isArray(parsed.jokes) ? parsed.jokes.filter(Boolean) : [];
  const reviewNotes = Array.isArray(parsed.review)
    ? parsed.review.map((item) => item?.note).filter(Boolean)
    : [];
  const roast = String(parsed.roast || jokes[0] || reviewNotes[0] || parsed.vibe || 'This PR has jokes. Unfortunately they are in the diff.').trim();
  const alts = Array.isArray(parsed.alternativeRoasts)
    ? parsed.alternativeRoasts.filter(Boolean)
    : [...jokes, ...reviewNotes].filter((line) => line && line !== roast);

  const uniqueAlts = [...new Set(alts)].filter((line) => line !== roast).slice(0, 3);
  const gifQueries = sanitizeGifQueries(
    Array.isArray(parsed.gif_queries) && parsed.gif_queries.length
      ? parsed.gif_queries
      : (parsed.gifQuery ? [parsed.gifQuery] : []),
    prData
  );

  return {
    roast,
    roastLevel: clampLevel(parsed.roastLevel, 3),
    archetype: parsed.archetype || 'The Ghost PR',
    reason: String(parsed.reason || parsed.vibe || 'The diff made a face.').trim(),
    gifQuery: gifQueries[0],
    gif_queries: gifQueries.slice(0, 4),
    alternativeRoasts: uniqueAlts,
    vibe: parsed.vibe || parsed.reason || roast,
    review: parsed.review || [{ type: 'suggestion', note: roast }],
    hygiene: parsed.hygiene || [],
    jokes: [roast, ...uniqueAlts]
  };
}

// Review PR endpoint
app.post('/api/review', validateApiKey, checkRateLimit, async (req, res) => {
  const { keyData, tier } = req;
  
  if (!ANTHROPIC_API_KEY && !MOCK) {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
  
  let {
    prTitle,
    prDescription,
    diff,
    lineCount,
    fileCount,
    mode = 'fresh',
    previousRoasts = [],
    targetLevel,
    personality = 'savage',
    defaultLevel
  } = req.body;

  if (req.user) {
    personality = personality || req.user.roastPersonality || 'savage';
    defaultLevel = defaultLevel || req.user.defaultRoastLevel || 3;
  }
  
  if (!diff) {
    return res.status(400).json({ error: 'Missing diff content' });
  }

  const requestedLevel = mode === 'meaner'
    ? clampLevel(targetLevel, 5)
    : clampLevel(defaultLevel, 3);

  const extras = [];
  extras.push(personalityBlock(personality));
  extras.push(`Aim roastLevel around ${requestedLevel} unless the diff clearly deserves more.`);
  extras.push('ENGLISH ONLY. roast + reason + exactly 3 alternativeRoasts. No Hindi, no Hinglish, no transliteration.');
  if (mode === 'again' && previousRoasts.length) {
    extras.push(`Mode: again. Do NOT repeat any of these roasts:\n- ${previousRoasts.slice(0, 8).join('\n- ')}`);
  }
  if (mode === 'meaner') {
    extras.push(`Mode: meaner. Escalate. roastLevel MUST be ${requestedLevel}. Meaner joke, still about the code.`);
  }
  
  const userPrompt = `PR Title: ${prTitle || '(No title)'}

PR Description:
${prDescription || '(No description provided)'}

Changed files: ${fileCount || 'unknown'}
Changed lines (excluding lockfiles/generated files): ${lineCount || 'unknown'}

${extras.join('\n')}

Diff:
${diff}`;

  try {
    let parsed = await generateRoastFromClaude(userPrompt);
    const prData = prDataFromRequest({ prTitle, prDescription, diff, lineCount, fileCount });
    let roast = normalizeRoast(parsed, prData);
    const needsEnglish = roastNeedsEnglishRetry(roast);

    let gate = await jevGate.validateReview(prData, roast);
    jevGate.logGate(gate);

    const shouldRetry = (gate.blockingFailed && !gate.skipped && !gate.error) || needsEnglish;
    if (shouldRetry) {
      const hint = needsEnglish
        ? 'REJECTED. Write US English only. Return roast plus exactly 3 distinct alternativeRoasts. No Hindi or Hinglish.'
        : jevGate.retryHint(gate);
      console.log('[review] Retrying Claude once:', needsEnglish ? 'english/alts' : 'jev');
      try {
        parsed = await generateRoastFromClaude(`${userPrompt}\n\n${hint}`);
        roast = normalizeRoast(parsed, prData);
        gate = await jevGate.validateReview(prData, roast);
        gate.retried = true;
        jevGate.logGate(gate);
      } catch (retryErr) {
        console.error('[review] Retry failed — using padded roast:', retryErr.message);
      }
    }

    roast = ensureEnglishRoasts(roast, prData);

    roast.jev_gate = jevGate.publicGate(gate);

    usageStats.totalReviews++;
    if (req.user) {
      const eventName = mode === 'meaner' ? 'roast_meaner' : mode === 'again' ? 'roast_again' : 'roast_generated';
      await store.addEvent({
        userId: req.user.id,
        name: eventName,
        properties: {
          roastLevel: roast.roastLevel,
          archetype: roast.archetype,
          jevPassed: roast.jev_gate.passed,
          jevSkipped: roast.jev_gate.skipped
        }
      });
    }

    roast._usage = usagePayload(keyData, tier);

    res.json(roast);

  } catch (err) {
    if (err.publicMessage) {
      console.error(err.message);
      if (err.raw) console.error('Parse error:', err.raw);
      return res.status(err.status || 502).json({ error: err.publicMessage });
    }
    console.error('Review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch GIFs endpoint
app.post('/api/gifs', validateApiKey, async (req, res) => {
  const { queries } = req.body;

  if (!queries || !Array.isArray(queries)) {
    return res.status(400).json({ error: 'Missing queries array' });
  }

  if (MOCK) {
    return res.json(MOCK_GIFS);
  }

  if (!GIPHY_API_KEY) {
    return res.json([]);
  }
  
  try {
    const results = await Promise.all(
      queries.slice(0, 4).map(async (query) => {
        try {
          const response = await fetch(
            `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=5&offset=0&rating=pg-13&lang=en`
          );
          
          if (!response.ok) {
            return { query, error: 'fetch_failed' };
          }
          
          const data = await response.json();
          const bannedTitle = /bollywood|desi|hindi|bhai|srk|shah rukh|namaste|item song|indian movie/i;
          const gif = (data.data || []).find((item) => !bannedTitle.test(item.title || ''));
          if (gif) {
            usageStats.totalGifs++;
            return {
              query,
              thumbnail: gif.images.fixed_height.url,
              original: gif.images.original.url,
              title: gif.title
            };
          }
          return { query, error: 'no_results' };
        } catch (err) {
          return { query, error: err.message };
        }
      })
    );
    
    res.json(results.filter(r => r && r.thumbnail));
    
  } catch (err) {
    console.error('GIF error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate new API key (admin endpoint)
app.post('/api/admin/keys', requireAdmin, async (req, res) => {
  const { tier = 'beta' } = req.body;
  
  if (!TIERS[tier]) {
    return res.status(400).json({ error: 'Invalid tier' });
  }
  
  const newKey = await generateApiKey(tier);
  
  res.json({
    apiKey: newKey,
    tier,
    tierName: TIERS[tier].name,
    callsPerHour: TIERS[tier].callsPerHour
  });
});

// Admin stats
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  const keyList = Array.from(apiKeys.entries()).map(([key, data]) => ({
    keyPrefix: key.slice(0, 20) + '...',
    tier: data.tier,
    createdAt: data.createdAt
  }));
  const summary = await store.analyticsSummary();
  
  res.json({
    totalKeys: apiKeys.size,
    totalReviews: usageStats.totalReviews,
    totalGifs: usageStats.totalGifs,
    keysByTier: {
      beta: keyList.filter(k => k.tier === 'beta').length,
      enterprise: keyList.filter(k => k.tier === 'enterprise').length
    },
    ...summary
  });
});

async function start() {
  try {
    await store.init();
    await store.hydrateKeyMap(apiKeys);
    console.log('   Postgres: ✓ connected');
  } catch (err) {
    console.error('   Postgres: ✗', err.message);
    process.exit(1);
  }

  if (process.env.NODE_ENV !== 'production') {
    const demoKey = await generateApiKey('beta');
    console.log(`Demo API Key (for testing): ${demoKey}`);
    console.log('   (inserted into the store; unknown rmpr_beta_ headers are rejected)');
  }

  app.listen(PORT, () => {
    console.log(`🔥 RoastMyPR API running on port ${PORT}`);
    console.log(`   Mock mode: ${MOCK ? 'ON' : 'off'}`);
    console.log(`   Anthropic API: ${ANTHROPIC_API_KEY ? '✓ configured' : '✗ missing'}`);
    console.log(`   Giphy API: ${GIPHY_API_KEY ? '✓ configured' : '✗ missing'}`);
    console.log(`   Google login: ${auth.googleConfigured() ? '✓ configured' : '✗ missing'}`);
    console.log(`   Jev gate: ${process.env.TYPESAFE_API_KEY ? '✓ configured' : '✗ skipped (no TYPESAFE_API_KEY)'}`);
    console.log(`   OAuth callback: ${auth.GOOGLE_CALLBACK}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
}

module.exports = { app, start, generateApiKey, apiKeys };
