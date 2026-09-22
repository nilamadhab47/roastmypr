// RoastMyPR - Background Service Worker
// Communicates with RoastMyPR API server

// API Configuration
const API_BASE_URL = 'http://localhost:3002';

// Get or create device ID for user identification
async function getDeviceId() {
  const storage = await chrome.storage.local.get(['deviceId']);
  if (storage.deviceId) {
    return storage.deviceId;
  }
  
  // Generate a new device ID
  const deviceId = 'rmpr_' + crypto.randomUUID();
  await chrome.storage.local.set({ deviceId });
  return deviceId;
}

// Get API key from storage
async function getApiKey() {
  const storage = await chrome.storage.local.get(['apiKey']);
  return storage.apiKey || null;
}

async function getAuthToken() {
  const storage = await chrome.storage.local.get(['authToken']);
  return storage.authToken || null;
}

async function apiHeaders() {
  const deviceId = await getDeviceId();
  const apiKey = await getApiKey();
  const authToken = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    'x-device-id': deviceId
  };
  if (apiKey) headers['x-api-key'] = apiKey;
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  return headers;
}

function looksLikeDiff(text) {
  return typeof text === 'string' && text.length > 40 && /^(diff --git|From |Index: |--- )/m.test(text);
}

async function tryFetchDiff(url, headers) {
  const response = await fetch(url, {
    redirect: 'follow',
    credentials: 'include',
    headers
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

async function fetchPullDiff({ owner, repo, number }) {
  if (!owner || !repo || !number) {
    return { error: 'Missing PR coordinates' };
  }

  const attempts = [
    {
      url: `https://github.com/${owner}/${repo}/pull/${number}.diff`,
      headers: { Accept: 'text/plain' }
    },
    {
      url: `https://patch-diff.githubusercontent.com/raw/${owner}/${repo}/pull/${number}.diff`,
      headers: { Accept: 'text/plain' }
    },
    {
      url: `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
      headers: {
        Accept: 'application/vnd.github.diff',
        'User-Agent': 'RoastMyPR'
      }
    }
  ];

  let lastError = 'Could not fetch PR diff';

  for (const attempt of attempts) {
    for (let round = 0; round < 2; round++) {
      try {
        const result = await tryFetchDiff(attempt.url, attempt.headers);
        if (looksLikeDiff(result.text)) {
          return { text: result.text, status: result.status };
        }
        lastError = result.ok ? 'empty or non-diff response' : `HTTP ${result.status}`;
        if (result.status === 503 || result.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 350 * (round + 1)));
          continue;
        }
        break;
      } catch (err) {
        lastError = err.message || String(err);
      }
    }
  }

  return { error: lastError };
}

// Message handler for content script communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'REVIEW_PR') {
    handleReviewRequest(request.data)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  
  if (request.type === 'FETCH_GIFS') {
    handleGifRequest(request.queries)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  
  if (request.type === 'GET_USER_STATUS') {
    getUserStatus()
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  
  if (request.type === 'GET_API_URL') {
    sendResponse({ url: API_BASE_URL });
    return false;
  }
  
  if (request.type === 'GOOGLE_LOGIN') {
    loginWithGoogle()
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.type === 'GOOGLE_LOGOUT') {
    chrome.storage.local.remove(['authToken', 'user'])
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.type === 'UPDATE_PREFS') {
    updatePrefs(request.prefs)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.type === 'SUBMIT_FEEDBACK') {
    submitFeedback(request)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.type === 'TRACK_EVENT') {
    trackEvent(request.name, request.properties)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.type === 'VALIDATE_API_KEY') {
    validateApiKey(request.apiKey)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.type === 'FETCH_PR_DIFF') {
    fetchPullDiff(request)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.type === 'FETCH_URL') {
    fetch(request.url)
      .then(async (r) => {
        if (!r.ok) return { error: `HTTP ${r.status}`, status: r.status };
        return { text: await r.text(), status: r.status };
      })
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.type === 'FETCH_IMAGE_DATA_URL') {
    fetch(request.url)
      .then(async (r) => {
        if (!r.ok) return { error: `HTTP ${r.status}` };
        const blob = await r.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({ dataUrl: reader.result });
          reader.onerror = () => resolve({ error: 'read failed' });
          reader.readAsDataURL(blob);
        });
      })
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.type === 'INJECT_AND_OPEN') {
    const tabId = request.tabId;
    if (!tabId) {
      sendResponse({ ok: false, error: 'No tab' });
      return false;
    }
    injectContentScript(tabId)
      .then(() => chrome.tabs.sendMessage(tabId, { type: 'OPEN_ROAST_PANEL' }))
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});

async function handleReviewRequest(data) {
  const {
    prTitle,
    prDescription,
    diff,
    lineCount,
    fileCount,
    prUrl,
    mode = 'fresh',
    previousRoasts = [],
    targetLevel,
    personality,
    defaultLevel
  } = data;
  
  const skipCache = true;
  const cacheKey = `review_${prUrl}`;
  if (!skipCache) {
    const cached = await chrome.storage.session.get(cacheKey);
    if (cached[cacheKey]) {
      return { ...cached[cacheKey], fromCache: true };
    }
  }
  
  const prefs = await chrome.storage.local.get(['roastPersonality', 'defaultRoastLevel']);
  const headers = await apiHeaders();
  
  if (!headers['x-api-key'] && !headers.Authorization) {
    throw new Error('NO_API_KEY');
  }
  
  const response = await fetch(`${API_BASE_URL}/api/review`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prTitle,
      prDescription,
      diff,
      lineCount,
      fileCount,
      mode,
      previousRoasts,
      targetLevel,
      personality: personality || prefs.roastPersonality || 'savage',
      defaultLevel: defaultLevel || prefs.defaultRoastLevel || 3
    })
  });
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    
    if (response.status === 401) {
      throw new Error('INVALID_API_KEY');
    }
    
    if (response.status === 429) {
      if (errData.error === 'RATE_LIMIT_EXCEEDED') {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      throw new Error('QUOTA_EXCEEDED');
    }
    
    throw new Error(errData.error || `API error: ${response.status}`);
  }
  
  const result = await response.json();
  
  const { _usage, ...reviewData } = result;
  if (!skipCache) {
    await chrome.storage.session.set({ [cacheKey]: reviewData });
  }
  
  // Store latest usage info
  if (_usage) {
    await chrome.storage.local.set({ usage: _usage });
  }
  
  return result;
}

async function handleGifRequest(queries) {
  const headers = await apiHeaders();
  if (!headers['x-api-key'] && !headers.Authorization) {
    return [];
  }
  
  const response = await fetch(`${API_BASE_URL}/api/gifs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ queries })
  });
  
  if (!response.ok) {
    return []; // GIFs are optional, fail silently
  }
  
  return response.json();
}

async function getUserStatus() {
  const headers = await apiHeaders();
  const localUser = await chrome.storage.local.get(['user', 'authToken']);

  if (!headers['x-api-key'] && !headers.Authorization) {
    return {
      hasApiKey: false,
      loggedIn: false,
      tier: 'none',
      tierName: 'Signed out'
    };
  }
  
  const response = await fetch(`${API_BASE_URL}/api/user`, { headers });
  
  if (!response.ok) {
    if (response.status === 401) {
      return {
        hasApiKey: Boolean(headers['x-api-key']),
        loggedIn: false,
        valid: false,
        tier: 'invalid',
        tierName: 'Invalid session'
      };
    }
    throw new Error('Failed to get user status');
  }
  
  const status = await response.json();
  status.hasApiKey = true;
  status.valid = true;
  status.loggedIn = Boolean(status.loggedIn || localUser.authToken);
  if (status.user) {
    await chrome.storage.local.set({
      user: status.user,
      roastPersonality: status.user.roastPersonality,
      defaultRoastLevel: status.user.defaultRoastLevel,
      gifsEnabled: status.user.gifsEnabled
    });
  }
  await chrome.storage.local.set({ userStatus: status });
  return status;
}

async function loginWithGoogle() {
  const redirectUri = chrome.identity.getRedirectURL();
  const url = `${API_BASE_URL}/api/auth/google/start?redirect_uri=${encodeURIComponent(redirectUri)}`;
  const responseUrl = await chrome.identity.launchWebAuthFlow({ url, interactive: true });
  const token = new URL(responseUrl).searchParams.get('token');
  if (!token) throw new Error('Google login did not return a session');

  await chrome.storage.local.set({ authToken: token });
  const headers = await apiHeaders();
  const me = await fetch(`${API_BASE_URL}/api/me`, { headers });
  if (!me.ok) throw new Error('Could not load your RoastMyPR profile');
  const data = await me.json();
  await chrome.storage.local.set({
    authToken: data.token || token,
    apiKey: data.apiKey,
    user: data.user,
    roastPersonality: data.user?.roastPersonality || 'savage',
    defaultRoastLevel: data.user?.defaultRoastLevel || 3,
    gifsEnabled: data.user?.gifsEnabled !== false
  });
  return { ok: true, user: data.user, stats: data.stats };
}

async function updatePrefs(prefs) {
  await chrome.storage.local.set(prefs);
  const headers = await apiHeaders();
  if (!headers.Authorization && !headers['x-api-key']) return { ok: true, local: true };
  const response = await fetch(`${API_BASE_URL}/api/me`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(prefs)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return { ok: false, error: err.error || 'Could not save prefs' };
  }
  const data = await response.json();
  if (data.user) await chrome.storage.local.set({ user: data.user });
  return { ok: true, user: data.user };
}

async function submitFeedback({ message, rating }) {
  const headers = await apiHeaders();
  const response = await fetch(`${API_BASE_URL}/api/feedback`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, rating })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Could not send feedback');
  }
  return response.json();
}

async function trackEvent(name, properties) {
  try {
    const headers = await apiHeaders();
    await fetch(`${API_BASE_URL}/api/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, properties })
    });
  } catch {
    // analytics should never block the roast
  }
  return { ok: true };
}

async function validateApiKey(apiKey) {
  const deviceId = await getDeviceId();
  
  const response = await fetch(`${API_BASE_URL}/api/validate`, {
    headers: {
      'x-device-id': deviceId,
      'x-api-key': apiKey
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }
    return { valid: false, error: 'Could not validate key' };
  }
  
  const result = await response.json();
  return { valid: true, ...result };
}

chrome.runtime.onInstalled.addListener(async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      console.log('RoastMyPR API connected successfully');
    }
  } catch (err) {
    console.warn('RoastMyPR API not reachable:', err.message);
  }
});

function isGitHubPR(url) {
  return typeof url === 'string' && /github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(url);
}

function injectContentScript(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js']
  }).catch(() => {});
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && isGitHubPR(tab.url)) {
    injectContentScript(tabId);
  }
});

