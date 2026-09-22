const SITE_URL = "https://roastmypr.xyz";
const PERSONALITY_LABELS = {
  dry: "😐 Dry",
  sarcastic: "😏 Sarcastic",
  savage: "🔥 Savage",
  unhinged: "☠️ Unhinged",
};

document.addEventListener("DOMContentLoaded", async () => {
  const loading = document.getElementById("loading");
  const mainContent = document.getElementById("main-content");
  const noKeyCard = document.getElementById("no-key-card");
  const userCard = document.getElementById("user-card");
  const usageCard = document.getElementById("usage-card");
  const usageFill = document.getElementById("usage-fill");
  const usageText = document.getElementById("usage-text");
  const reviewsCount = document.getElementById("reviews-count");
  const damageLabel = document.getElementById("damage-label");
  const optionsBtn = document.getElementById("options-btn");
  const googleBtn = document.getElementById("google-btn");
  const openPanelBtn = document.getElementById("open-panel-btn");
  const siteBtn = document.getElementById("site-btn");
  const versionEl = document.getElementById("version");

  siteBtn.href = SITE_URL;
  versionEl.textContent = `v${chrome.runtime.getManifest().version}`;

  async function render() {
    const status = await chrome.runtime.sendMessage({ type: "GET_USER_STATUS" });
    loading.style.display = "none";
    mainContent.style.display = "block";

    const signedIn = Boolean(status.loggedIn && status.user);
    const ready = Boolean(status.hasApiKey && status.valid);

    if (!ready) {
      noKeyCard.style.display = "block";
      usageCard.style.display = "none";
      userCard.style.display = "none";
    } else {
      noKeyCard.style.display = signedIn ? "none" : "block";
      if (signedIn) {
        userCard.style.display = "block";
        document.getElementById("user-name").textContent = status.user.name || status.user.email;
        document.getElementById("user-personality").textContent =
          PERSONALITY_LABELS[status.user.roastPersonality] || "🔥 Savage";
        const pic = document.getElementById("user-pic");
        if (status.user.picture) pic.src = status.user.picture;
      } else {
        userCard.style.display = "none";
      }

      usageCard.style.display = "block";
      const used = status.callsUsedThisHour || 0;
      const limit = status.callsPerHour || 100;
      const remaining = status.callsRemainingThisHour ?? Math.max(0, limit - used);
      const remainingPct = Math.max(0, Math.min(100, (remaining / limit) * 100));
      usageFill.style.width = `${remainingPct}%`;
      usageFill.classList.toggle("low", remaining <= 20);
      usageText.textContent = `${remaining} of ${limit}`;
    }

    const serverRoasts = status.stats?.roasts;
    const local = await chrome.storage.local.get(["reviewsCount"]);
    const count = serverRoasts ?? local.reviewsCount ?? 0;
    reviewsCount.textContent = String(count);
    damageLabel.textContent =
      count === 1 ? "PR emotionally damaged" : "PRs emotionally damaged";
  }

  try {
    await render();
  } catch (err) {
    console.error("Failed to load user status:", err);
    loading.innerHTML =
      "Could not reach the roast engine.<br><span style='font-size:11px'>Check your connection, then try again.</span>";
  }

  optionsBtn?.addEventListener("click", () => chrome.runtime.openOptionsPage());

  googleBtn?.addEventListener("click", async () => {
    googleBtn.disabled = true;
    googleBtn.textContent = "Opening Google…";
    try {
      const result = await chrome.runtime.sendMessage({ type: "GOOGLE_LOGIN" });
      if (result?.error) throw new Error(result.error);
      await render();
    } catch (err) {
      googleBtn.textContent = err.message || "Google login failed";
      setTimeout(() => {
        googleBtn.disabled = false;
        googleBtn.textContent = "Continue with Google";
      }, 2200);
      return;
    }
    googleBtn.disabled = false;
    googleBtn.textContent = "Continue with Google";
  });

  openPanelBtn?.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    if (!/github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(tab.url || "")) {
      openPanelBtn.textContent = "Open a GitHub PR first";
      setTimeout(() => {
        openPanelBtn.textContent = "🔥 Roast a PR";
      }, 1800);
      return;
    }
    openPanelBtn.disabled = true;
    openPanelBtn.textContent = "Opening…";
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      await chrome.tabs.sendMessage(tab.id, { type: "OPEN_ROAST_PANEL" });
      window.close();
    } catch (err) {
      console.error(err);
      openPanelBtn.disabled = false;
      openPanelBtn.textContent = "Retry roast";
    }
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.reviewsCount) return;
  const el = document.getElementById("reviews-count");
  const label = document.getElementById("damage-label");
  if (!el) return;
  const count = changes.reviewsCount.newValue || 0;
  el.textContent = String(count);
  if (label) {
    label.textContent =
      count === 1 ? "PR emotionally damaged" : "PRs emotionally damaged";
  }
});
