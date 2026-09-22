const PREFS_DEFAULTS = {
  roastPersonality: "savage",
  defaultRoastLevel: 3,
  gifsEnabled: true,
};

document.addEventListener("DOMContentLoaded", async () => {
  const apiKeyInput = document.getElementById("api-key");
  const validateBtn = document.getElementById("validate-btn");
  const saveBtn = document.getElementById("save-btn");
  const apiStatus = document.getElementById("api-status");
  const accountCard = document.getElementById("account-card");
  const tierBadge = document.getElementById("tier-badge");
  const usageDisplay = document.getElementById("usage-display");
  const connectionStatus = document.getElementById("connection-status");
  const savedToast = document.getElementById("saved-toast");
  const levelInput = document.getElementById("roast-level");
  const levelLabel = document.getElementById("roast-level-label");
  const gifsEnabled = document.getElementById("gifs-enabled");
  const googleBtn = document.getElementById("google-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const feedbackBtn = document.getElementById("feedback-btn");
  const feedbackText = document.getElementById("feedback-text");
  const feedbackStatus = document.getElementById("feedback-status");

  const storage = await chrome.storage.local.get([
    "apiKey",
    "roastPersonality",
    "defaultRoastLevel",
    "gifsEnabled",
  ]);

  if (storage.apiKey) apiKeyInput.value = storage.apiKey;

  loadUserStatus();

  googleBtn?.addEventListener("click", async () => {
    googleBtn.disabled = true;
    googleBtn.textContent = "Opening Google…";
    try {
      const result = await chrome.runtime.sendMessage({ type: "GOOGLE_LOGIN" });
      if (result?.error) throw new Error(result.error);
      await loadUserStatus();
    } catch (err) {
      connectionStatus.textContent = err.message || "Google login failed";
      accountCard.style.display = "block";
    } finally {
      googleBtn.disabled = false;
      googleBtn.textContent = "Continue with Google";
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "GOOGLE_LOGOUT" });
    document.getElementById("google-signed-in").style.display = "none";
    document.getElementById("google-signed-out").style.display = "block";
    await loadUserStatus();
  });

  feedbackBtn?.addEventListener("click", async () => {
    const message = feedbackText.value.trim();
    if (message.length < 3) {
      feedbackStatus.innerHTML = '<span class="status-error">Write a little more than that.</span>';
      return;
    }
    feedbackBtn.disabled = true;
    try {
      const result = await chrome.runtime.sendMessage({
        type: "SUBMIT_FEEDBACK",
        message,
      });
      if (result?.error) throw new Error(result.error);
      feedbackText.value = "";
      feedbackStatus.innerHTML = '<span class="status-success">Sent. We will read it. Eventually.</span>';
    } catch (err) {
      feedbackStatus.innerHTML = `<span class="status-error">${err.message}</span>`;
    } finally {
      feedbackBtn.disabled = false;
    }
  });

  setPersonality(storage.roastPersonality || PREFS_DEFAULTS.roastPersonality);
  const level = clampLevel(storage.defaultRoastLevel);
  levelInput.value = String(level);
  levelLabel.textContent = `${level} / 5`;
  gifsEnabled.checked = storage.gifsEnabled !== false;

  document.querySelectorAll("[data-personality]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      setPersonality(btn.dataset.personality);
      await savePrefs();
    });
  });

  levelInput.addEventListener("input", () => {
    levelLabel.textContent = `${levelInput.value} / 5`;
  });
  levelInput.addEventListener("change", savePrefs);
  gifsEnabled.addEventListener("change", savePrefs);

  validateBtn.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      apiStatus.innerHTML = '<span class="status-error">Enter an API key first</span>';
      return;
    }

    validateBtn.disabled = true;
    validateBtn.textContent = "Checking…";
    apiStatus.innerHTML = '<span class="status-loading">Validating…</span>';

    try {
      const result = await chrome.runtime.sendMessage({
        type: "VALIDATE_API_KEY",
        apiKey,
      });
      if (result.valid) {
        apiStatus.innerHTML = `<span class="status-success">Valid · ${result.tierName} (${result.callsPerHour}/hr)</span>`;
      } else {
        apiStatus.innerHTML = `<span class="status-error">${result.error || "Invalid API key"}</span>`;
      }
    } catch (err) {
      apiStatus.innerHTML = `<span class="status-error">${err.message}</span>`;
    } finally {
      validateBtn.disabled = false;
      validateBtn.textContent = "Check";
    }
  });

  saveBtn.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim();
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    try {
      await chrome.storage.local.set({ apiKey });
      await chrome.storage.local.set({
        roastPersonality: currentPersonality(),
        defaultRoastLevel: clampLevel(levelInput.value),
        gifsEnabled: gifsEnabled.checked,
      });
      toast();
      apiStatus.innerHTML = '<span class="status-success">Saved</span>';
      if (apiKey) loadUserStatus();
      else accountCard.style.display = "none";
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
    }
  });

  apiKeyInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") saveBtn.click();
  });

  function setPersonality(value) {
    document.querySelectorAll("[data-personality]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.personality === value);
    });
  }

  function currentPersonality() {
    return (
      document.querySelector("[data-personality].active")?.dataset.personality ||
      PREFS_DEFAULTS.roastPersonality
    );
  }

  async function savePrefs() {
    const prefs = {
      roastPersonality: currentPersonality(),
      defaultRoastLevel: clampLevel(levelInput.value),
      gifsEnabled: gifsEnabled.checked,
    };
    await chrome.runtime.sendMessage({ type: "UPDATE_PREFS", prefs });
    toast();
  }

  function toast() {
    savedToast.classList.add("visible");
    setTimeout(() => savedToast.classList.remove("visible"), 1800);
  }

  function clampLevel(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return PREFS_DEFAULTS.defaultRoastLevel;
    return Math.min(5, Math.max(1, Math.round(n)));
  }

  async function loadUserStatus() {
    try {
      const status = await chrome.runtime.sendMessage({ type: "GET_USER_STATUS" });
      const signedIn = Boolean(status.loggedIn && status.user);
      document.getElementById("google-signed-in").style.display = signedIn ? "block" : "none";
      document.getElementById("google-signed-out").style.display = signedIn ? "none" : "block";
      if (signedIn) {
        document.getElementById("google-name").textContent = status.user.name || "You";
        document.getElementById("google-email").textContent = status.user.email || "";
        const pic = document.getElementById("google-pic");
        if (status.user.picture) pic.src = status.user.picture;
        setPersonality(status.user.roastPersonality || PREFS_DEFAULTS.roastPersonality);
        const level = clampLevel(status.user.defaultRoastLevel);
        levelInput.value = String(level);
        levelLabel.textContent = `${level} / 5`;
        gifsEnabled.checked = status.user.gifsEnabled !== false;
        if (status.apiKey) apiKeyInput.value = status.apiKey;
      }

      if (status.hasApiKey && status.valid) {
        accountCard.style.display = "block";
        connectionStatus.textContent = signedIn ? "Google connected" : "Connected";
        tierBadge.textContent = status.tierName || "Free Beta";
        usageDisplay.textContent = `${status.callsRemainingThisHour ?? "—"} remaining`;
      } else {
        accountCard.style.display = "block";
        connectionStatus.textContent = signedIn ? "Session expired" : "Signed out";
        tierBadge.textContent = "—";
        usageDisplay.textContent = "—";
      }
    } catch (err) {
      console.error("Failed to load user status:", err);
      accountCard.style.display = "block";
      connectionStatus.textContent = "Could not reach roast engine";
    }
  }
});
