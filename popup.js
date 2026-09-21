// RoastMyPR - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const loading = document.getElementById('loading');
  const mainContent = document.getElementById('main-content');
  const noKeyCard = document.getElementById('no-key-card');
  const usageCard = document.getElementById('usage-card');
  const tierBadge = document.getElementById('tier-badge');
  const usageFill = document.getElementById('usage-fill');
  const usageText = document.getElementById('usage-text');
  const upgradeBtn = document.getElementById('upgrade-btn');
  const reviewsCount = document.getElementById('reviews-count');
  const gifsCount = document.getElementById('gifs-count');
  const optionsBtn = document.getElementById('options-btn');
  const getKeyBtn = document.getElementById('get-key-btn');
  const openPanelBtn = document.getElementById('open-panel-btn');
  
  try {
    // Get user status from API
    const status = await chrome.runtime.sendMessage({ type: 'GET_USER_STATUS' });
    
    // Show main content
    loading.style.display = 'none';
    mainContent.style.display = 'block';
    
    if (!status.hasApiKey) {
      // No API key - show setup card
      noKeyCard.style.display = 'block';
      usageCard.style.display = 'none';
    } else if (!status.valid) {
      // Invalid API key
      noKeyCard.style.display = 'block';
      noKeyCard.querySelector('h3').textContent = '⚠️ Invalid API Key';
      noKeyCard.querySelector('p').textContent = 'Your API key is invalid. Please check your settings.';
      noKeyCard.querySelector('button').textContent = 'Fix API Key';
      usageCard.style.display = 'none';
    } else {
      // Valid API key - show usage
      noKeyCard.style.display = 'none';
      usageCard.style.display = 'block';
      
      // Update tier badge
      tierBadge.textContent = status.tierName || 'Free Beta';
      
      // Update usage meter and text
      const used = status.callsUsedThisHour || 0;
      const limit = status.callsPerHour || 100;
      const remaining = status.callsRemainingThisHour || 0;
      const percentage = Math.min(100, (used / limit) * 100);
      
      usageFill.style.width = `${percentage}%`;
      
      if (remaining <= 10) {
        usageFill.classList.add('low');
      }
      
      usageText.textContent = `${remaining} of ${limit} calls remaining`;
      
      // Show upgrade button when usage is high
      if (remaining <= 20) {
        upgradeBtn.style.display = 'block';
      }
    }
    
    // Load session stats
    const stats = await chrome.storage.local.get(['reviewsCount', 'gifsPosted']);
    reviewsCount.textContent = stats.reviewsCount || 0;
    gifsCount.textContent = stats.gifsPosted || 0;
    
  } catch (err) {
    console.error('Failed to load user status:', err);
    
    loading.innerHTML = `
      <p>⚠️ Could not connect to server</p>
      <p style="font-size: 11px; margin-top: 8px;">Check your internet connection and try again.</p>
    `;
  }
  
  // Options button
  optionsBtn?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Get key button
  getKeyBtn?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  openPanelBtn?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    if (!/github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(tab.url || '')) {
      openPanelBtn.textContent = 'Open a GitHub PR first';
      setTimeout(() => { openPanelBtn.textContent = 'Open Roast panel'; }, 1800);
      return;
    }
    openPanelBtn.disabled = true;
    openPanelBtn.textContent = 'Opening…';
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      await chrome.tabs.sendMessage(tab.id, { type: 'OPEN_ROAST_PANEL' });
      window.close();
    } catch (err) {
      console.error(err);
      openPanelBtn.disabled = false;
      openPanelBtn.textContent = 'Retry Open Roast panel';
    }
  });
});

// Listen for stats updates
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.reviewsCount) {
      document.getElementById('reviews-count').textContent = changes.reviewsCount.newValue || 0;
    }
    if (changes.gifsPosted) {
      document.getElementById('gifs-count').textContent = changes.gifsPosted.newValue || 0;
    }
  }
});
