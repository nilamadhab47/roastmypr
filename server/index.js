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

const app = express();
const PORT = process.env.PORT || 3000;

// API Keys from environment variables (YOUR keys, not user's)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

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

// Generate beta API keys (in production, use a proper key generation service)
function generateApiKey(tier = 'beta') {
  const key = `rmpr_${tier}_${uuidv4().replace(/-/g, '')}`;
  apiKeys.set(key, {
    tier,
    createdAt: new Date().toISOString(),
    hourlyUsage: {}
  });
  return key;
}

// Pre-generate some demo beta keys (remove in production)
if (process.env.NODE_ENV !== 'production') {
  const demoKey = generateApiKey('beta');
  console.log(`Demo API Key (for testing): ${demoKey}`);
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    /chrome-extension:\/\/.*/,
    'https://github.com',
    /http:\/\/localhost:.*/,
    'https://roastmypr.com',
    'https://www.roastmypr.com'
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

// Validate API key middleware
function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // Check if key exists
  let keyData = apiKeys.get(apiKey);
  
  // For production: also check database or key validation service
  // For beta: auto-register new keys that match the pattern
  if (!keyData && apiKey.startsWith('rmpr_beta_')) {
    keyData = {
      tier: 'beta',
      createdAt: new Date().toISOString(),
      hourlyUsage: {}
    };
    apiKeys.set(apiKey, keyData);
  }
  
  if (!keyData) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  req.apiKey = apiKey;
  req.keyData = keyData;
  req.tier = TIERS[keyData.tier];
  
  next();
}

// Check hourly rate limit
function checkRateLimit(req, res, next) {
  const { keyData, tier, apiKey } = req;
  
  const currentHour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
  const hourlyCount = keyData.hourlyUsage[currentHour] || 0;
  
  if (hourlyCount >= tier.callsPerHour) {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded. ${tier.name} tier allows ${tier.callsPerHour} calls per hour.`,
      resetAt: new Date(new Date().setMinutes(60, 0, 0)).toISOString(),
      upgradeUrl: 'https://roastmypr.com/pricing'
    });
  }
  
  // Increment usage
  keyData.hourlyUsage[currentHour] = hourlyCount + 1;
  
  // Clean up old hours
  const hours = Object.keys(keyData.hourlyUsage);
  if (hours.length > 24) {
    hours.sort().slice(0, -24).forEach(h => delete keyData.hourlyUsage[h]);
  }
  
  next();
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'RoastMyPR API',
    hasAnthropicKey: !!ANTHROPIC_API_KEY,
    hasGiphyKey: !!GIPHY_API_KEY 
  });
});

// Validate API key endpoint
app.get('/api/validate', validateApiKey, (req, res) => {
  const { keyData, tier } = req;
  const currentHour = new Date().toISOString().slice(0, 13);
  const hourlyUsed = keyData.hourlyUsage[currentHour] || 0;
  
  res.json({
    valid: true,
    tier: keyData.tier,
    tierName: tier.name,
    callsPerHour: tier.callsPerHour,
    callsUsedThisHour: hourlyUsed,
    callsRemainingThisHour: Math.max(0, tier.callsPerHour - hourlyUsed)
  });
});

// Get user status and usage
app.get('/api/user', validateApiKey, (req, res) => {
  const { keyData, tier } = req;
  const currentHour = new Date().toISOString().slice(0, 13);
  const hourlyUsed = keyData.hourlyUsage[currentHour] || 0;
  
  res.json({
    tier: keyData.tier,
    tierName: tier.name,
    callsPerHour: tier.callsPerHour,
    callsUsedThisHour: hourlyUsed,
    callsRemainingThisHour: Math.max(0, tier.callsPerHour - hourlyUsed),
    canReview: hourlyUsed < tier.callsPerHour
  });
});

// Claude System Prompt
const SYSTEM_PROMPT = `You are RoastMyPR — a brutally honest but helpful code reviewer with a sense of humor.
You will be given a GitHub PR's title, description, and diff. Respond with ONLY valid JSON, no markdown fences,
in this exact shape:

{
  "review": [
    {"type": "bug|style|suggestion|praise", "note": "one sentence, plain English, specific to the code"}
  ],
  "hygiene": [
    {"rule": "linear_issue|size|description_mismatch|etiquette", "note": "one sentence, specific"}
  ],
  "vibe": "one short punchy phrase describing the mood/energy of this PR",
  "roastLevel": 1-5,
  "archetype": "The 2am Hotfix|The Overcautious Refactor|The One-Line Hero|The Drive-By Formatter|The Kitchen Sink|The Surgical Strike|The Copy-Paste Special|The Documentation Hero|The Tech Debt Slayer|Other",
  "gif_queries": ["2-4 word search term", "another term", "a third term", "a fourth term"],
  "jokes": ["one-line roast or witty comment a reviewer might post"]
}

Rules:
- review: 3-6 items max. Be genuinely useful, not just roasting. Include at
  least one "praise" item if there's anything praiseworthy — but don't
  force positivity if the code doesn't earn it.
- hygiene: check against these team rules and only include entries for
  actual violations (empty array if the PR is clean):
  - PR description should describe what the diff actually does, not be
    generic or stale (rule: "description_mismatch").
  - Title or description should reference a Linear issue ID (pattern like
    ABC-123). Flag if missing (rule: "linear_issue").
  - Diff should not exceed ~400 added+removed lines, excluding lockfiles
    and generated files (you'll be told the excluded-file-adjusted count).
    Suggest splitting rather than just flagging (rule: "size").
  - No leftover console.log/debugger statements, no large commented-out
    blocks, no unrelated formatting-only changes mixed into a logic PR,
    tests present for non-trivial logic changes (rule: "etiquette").
  Be specific ("no Linear issue ID found in title or description", not
  just "missing issue link").
- roastLevel: 1 = clean PR (gentle teasing), 5 = needs serious work (maximum roast).
  Scale joke intensity accordingly.
- archetype: classify the PR into one of these personalities.
- gif_queries: 4 Giphy search terms that match the PR's vibe. Mix it up with variety:
  include Bollywood reactions, desi memes, Hindi/Hinglish pop culture alongside
  English ones (e.g. "this is fine fire", "bollywood shocked reaction",
  "hera pheri meme", "shipping it friday", "indian head wobble approve",
  "dhoom action scene", "chai coding", "jugaad fix").
- jokes: developer humor roasts with personality. Mix in Hinglish phrases, Bollywood
  references, or desi developer culture where it fits naturally (e.g. "Bhai ne code
  likh diya, testing ki zimmedari agle dev ki", "This PR has more side effects than
  a Rajnikanth movie"). Reference actual diff content when possible (variable names,
  removed TODOs, suspicious patterns). Never punch down or get personal — roast the
  code, not the coder.
- Never invent facts about the diff you weren't given.`;

// Review PR endpoint
app.post('/api/review', validateApiKey, checkRateLimit, async (req, res) => {
  const { keyData, tier } = req;
  
  if (!ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
  
  const { prTitle, prDescription, diff, lineCount } = req.body;
  
  if (!diff) {
    return res.status(400).json({ error: 'Missing diff content' });
  }
  
  const userPrompt = `PR Title: ${prTitle || '(No title)'}

PR Description:
${prDescription || '(No description provided)'}

Changed lines (excluding lockfiles/generated files): ${lineCount || 'unknown'}

Diff:
${diff}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return res.status(502).json({ error: 'Failed to get review from AI' });
    }
    
    const result = await response.json();
    const content = result.content[0].text;
    
    // Parse Claude's response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      const cleaned = content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch (e2) {
        console.error('Parse error:', content);
        return res.status(502).json({ error: 'Failed to parse AI response' });
      }
    }
    
    // Update stats
    usageStats.totalReviews++;
    
    // Add usage info to response
    const currentHour = new Date().toISOString().slice(0, 13);
    const hourlyUsed = keyData.hourlyUsage[currentHour] || 0;
    
    parsed._usage = {
      tier: keyData.tier,
      tierName: tier.name,
      callsPerHour: tier.callsPerHour,
      callsUsedThisHour: hourlyUsed,
      callsRemainingThisHour: Math.max(0, tier.callsPerHour - hourlyUsed)
    };
    
    res.json(parsed);
    
  } catch (err) {
    console.error('Review error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch GIFs endpoint
app.post('/api/gifs', validateApiKey, async (req, res) => {
  if (!GIPHY_API_KEY) {
    return res.json([]);
  }
  
  const { queries } = req.body;
  
  if (!queries || !Array.isArray(queries)) {
    return res.status(400).json({ error: 'Missing queries array' });
  }
  
  try {
    const results = await Promise.all(
      queries.slice(0, 4).map(async (query) => {
        try {
          const response = await fetch(
            `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=4&rating=pg-13`
          );
          
          if (!response.ok) {
            return { query, error: 'fetch_failed' };
          }
          
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            usageStats.totalGifs++;
            return data.data.map(gif => ({
              query,
              thumbnail: gif.images.fixed_height.url,
              original: gif.images.original.url,
              title: gif.title
            }));
          }
          return { query, error: 'no_results' };
        } catch (err) {
          return { query, error: err.message };
        }
      })
    );
    
    res.json(results.flat().filter(r => r.thumbnail));
    
  } catch (err) {
    console.error('GIF error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate new API key (admin endpoint)
app.post('/api/admin/keys', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { tier = 'beta' } = req.body;
  
  if (!TIERS[tier]) {
    return res.status(400).json({ error: 'Invalid tier' });
  }
  
  const newKey = generateApiKey(tier);
  
  res.json({
    apiKey: newKey,
    tier,
    tierName: TIERS[tier].name,
    callsPerHour: TIERS[tier].callsPerHour
  });
});

// Admin stats
app.get('/api/admin/stats', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const keyList = Array.from(apiKeys.entries()).map(([key, data]) => ({
    keyPrefix: key.slice(0, 20) + '...',
    tier: data.tier,
    createdAt: data.createdAt
  }));
  
  res.json({
    totalKeys: apiKeys.size,
    totalReviews: usageStats.totalReviews,
    totalGifs: usageStats.totalGifs,
    keysByTier: {
      beta: keyList.filter(k => k.tier === 'beta').length,
      enterprise: keyList.filter(k => k.tier === 'enterprise').length
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔥 RoastMyPR API running on port ${PORT}`);
  console.log(`   Anthropic API: ${ANTHROPIC_API_KEY ? '✓ configured' : '✗ missing'}`);
  console.log(`   Giphy API: ${GIPHY_API_KEY ? '✓ configured' : '✗ missing'}`);
});
