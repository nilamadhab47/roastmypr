// RoastMyPR - Background Service Worker
// Communicates with RoastMyPR API server

// API Configuration
const API_BASE_URL = 'http://localhost:3000'; // Local server
// Production: 'https://api.roastmypr.com'

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
  
  if (request.type === 'VALIDATE_API_KEY') {
    validateApiKey(request.apiKey)
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
  const { prTitle, prDescription, diff, lineCount, prUrl } = data;
  
  // Check cache first
  const cacheKey = `review_${prUrl}`;
  const cached = await chrome.storage.session.get(cacheKey);
  if (cached[cacheKey]) {
    return { ...cached[cacheKey], fromCache: true };
  }
  
  const deviceId = await getDeviceId();
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }
  
  const response = await fetch(`${API_BASE_URL}/api/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-id': deviceId,
      'x-api-key': apiKey
    },
    body: JSON.stringify({
      prTitle,
      prDescription,
      diff,
      lineCount
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
  
  // Cache the result (without usage info)
  const { _usage, ...reviewData } = result;
  await chrome.storage.session.set({ [cacheKey]: reviewData });
  
  // Store latest usage info
  if (_usage) {
    await chrome.storage.local.set({ usage: _usage });
  }
  
  return result;
}

async function handleGifRequest(queries) {
  const deviceId = await getDeviceId();
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    return []; // No API key, skip GIFs
  }
  
  const response = await fetch(`${API_BASE_URL}/api/gifs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-id': deviceId,
      'x-api-key': apiKey
    },
    body: JSON.stringify({ queries })
  });
  
  if (!response.ok) {
    return []; // GIFs are optional, fail silently
  }
  
  return response.json();
}

async function getUserStatus() {
  const deviceId = await getDeviceId();
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    return { 
      hasApiKey: false,
      tier: 'none',
      tierName: 'No API Key'
    };
  }
  
  const response = await fetch(`${API_BASE_URL}/api/user`, {
    headers: {
      'x-device-id': deviceId,
      'x-api-key': apiKey
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      return {
        hasApiKey: true,
        valid: false,
        tier: 'invalid',
        tierName: 'Invalid Key'
      };
    }
    throw new Error('Failed to get user status');
  }
  
  const status = await response.json();
  status.hasApiKey = true;
  status.valid = true;
  
  // Cache the status
  await chrome.storage.local.set({ userStatus: status });
  
  return status;
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

