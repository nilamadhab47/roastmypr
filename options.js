// RoastMyPR - Options Page

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('api-key');
  const validateBtn = document.getElementById('validate-btn');
  const saveBtn = document.getElementById('save-btn');
  const apiStatus = document.getElementById('api-status');
  const accountCard = document.getElementById('account-card');
  const tierBadge = document.getElementById('tier-badge');
  const usageDisplay = document.getElementById('usage-display');
  const savedToast = document.getElementById('saved-toast');
  
  // Load existing API key
  const storage = await chrome.storage.local.get(['apiKey']);
  if (storage.apiKey) {
    apiKeyInput.value = storage.apiKey;
    apiStatus.innerHTML = '<span class="status-success">✓ Key saved</span>';
    loadUserStatus();
  }
  
  // Validate API key
  validateBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      apiStatus.innerHTML = '<span class="status-error">✗ Please enter an API key</span>';
      return;
    }
    
    validateBtn.disabled = true;
    validateBtn.textContent = 'Validating...';
    apiStatus.innerHTML = '<span class="status-loading">⏳ Validating key...</span>';
    
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'VALIDATE_API_KEY',
        apiKey: apiKey
      });
      
      if (result.valid) {
        apiStatus.innerHTML = `<span class="status-success">✓ Valid! ${result.tierName} tier (${result.callsPerHour} calls/hour)</span>`;
      } else {
        apiStatus.innerHTML = `<span class="status-error">✗ ${result.error || 'Invalid API key'}</span>`;
      }
    } catch (err) {
      apiStatus.innerHTML = `<span class="status-error">✗ ${err.message}</span>`;
    } finally {
      validateBtn.disabled = false;
      validateBtn.textContent = 'Validate';
    }
  });
  
  // Save API key
  saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    try {
      await chrome.storage.local.set({ apiKey });
      
      // Show success toast
      savedToast.classList.add('visible');
      setTimeout(() => savedToast.classList.remove('visible'), 2500);
      
      apiStatus.innerHTML = '<span class="status-success">✓ Key saved</span>';
      
      // Reload user status
      if (apiKey) {
        loadUserStatus();
      } else {
        accountCard.style.display = 'none';
      }
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save API Key';
    }
  });
  
  // Load user status
  async function loadUserStatus() {
    try {
      const status = await chrome.runtime.sendMessage({ type: 'GET_USER_STATUS' });
      
      if (status.hasApiKey && status.valid) {
        accountCard.style.display = 'block';
        tierBadge.textContent = status.tierName || 'Free Beta';
        usageDisplay.textContent = status.callsRemainingThisHour ?? '—';
        
        // Highlight current plan
        document.querySelectorAll('.pricing-card').forEach(card => {
          card.classList.remove('current');
        });
        const planId = status.tier === 'enterprise' ? 'plan-enterprise' : 'plan-beta';
        document.getElementById(planId)?.classList.add('current');
      } else {
        accountCard.style.display = 'none';
      }
    } catch (err) {
      console.error('Failed to load user status:', err);
    }
  }
  
  // Allow Enter key to save
  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });
});
