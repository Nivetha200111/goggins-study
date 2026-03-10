const sessionBtn = document.getElementById("session-btn");
const sessionPill = document.getElementById("session-pill");
const topicInput = document.getElementById("topic-input");
const durationInput = document.getElementById("duration-input");
const pinToggle = document.getElementById("pin-toggle");
const whitelistBtn = document.getElementById("whitelist-btn");
const domainHint = document.getElementById("domain-hint");
const keywordInput = document.getElementById("keyword-input");
const addKeywordBtn = document.getElementById("add-keyword-btn");
const keywordHint = document.getElementById("keyword-hint");
const summaryHint = document.getElementById("summary-hint");
const timeLeft = document.getElementById("time-left");
const moodLabel = document.getElementById("mood-label");
const reasonLabel = document.getElementById("reason-label");
const whitelistPreview = document.getElementById("whitelist-preview");
const statusEl = document.getElementById("status");

let popupState = null;
let refreshInterval = null;

function formatDuration(totalMs) {
  const totalSeconds = Math.max(0, Math.floor((totalMs || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#fda4af" : "#fdba74";
}

function parseDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function applyState(state) {
  popupState = state;
  sessionPill.textContent = state.sessionActive ? "Live" : "Idle";
  sessionPill.classList.toggle("active", state.sessionActive);
  sessionBtn.textContent = state.sessionActive ? "End Session" : "Start Session";
  sessionBtn.classList.toggle("active", state.sessionActive);

  if (document.activeElement !== topicInput) {
    topicInput.value = state.studyTopic || "";
  }
  if (document.activeElement !== durationInput) {
    durationInput.value = String(state.sessionDurationMinutes || 50);
  }
  pinToggle.checked = Boolean(state.pinnedTimer);

  summaryHint.textContent = state.goalComplete
    ? "Goal complete. The overlay stays quiet until you start again."
    : state.sessionActive
      ? "The overlay is live across Chrome tabs."
      : "The overlay will pin itself across Chrome tabs and score typing locally.";

  timeLeft.textContent = state.sessionActive
    ? formatDuration(state.remainingMs)
    : formatDuration((state.sessionDurationMinutes || 50) * 60000);
  moodLabel.textContent = state.goalComplete ? "complete" : state.mood || "happy";
  reasonLabel.textContent = state.lastReason || "Waiting for a session.";
  whitelistPreview.textContent = `Domains: ${state.whitelist.domains.length} | Keywords: ${state.whitelist.keywords.length}`;
}

function loadState() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (!response) return;
    applyState(response);
  });
}

function syncConfig() {
  chrome.runtime.sendMessage(
    {
      type: "UPDATE_CONFIG",
      topic: topicInput.value.trim(),
      goalMinutes: Number(durationInput.value || 50),
      pinnedTimer: pinToggle.checked,
    },
    (response) => {
      if (response?.state) {
        applyState(response.state);
      }
    }
  );
}

function whitelistCurrentSite() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab?.url) {
      setStatus("No active tab found.", true);
      return;
    }

    const domain = parseDomain(activeTab.url);
    if (!domain) {
      setStatus("Could not read domain.", true);
      return;
    }

    const nextWhitelist = {
      domains: Array.from(new Set([...(popupState?.whitelist?.domains || []), domain])),
      keywords: popupState?.whitelist?.keywords || [],
    };

    chrome.runtime.sendMessage(
      { type: "UPDATE_WHITELIST", whitelist: nextWhitelist },
      (response) => {
        if (!response?.success) {
          setStatus("Could not update allowlist.", true);
          return;
        }

        domainHint.textContent = `Allowed ${domain}.`;
        setStatus("Allowlist updated.");
        loadState();
      }
    );
  });
}

function addKeyword() {
  const keyword = keywordInput.value.trim().toLowerCase();
  if (!keyword) {
    setStatus("Enter a keyword first.", true);
    return;
  }

  const nextWhitelist = {
    domains: popupState?.whitelist?.domains || [],
    keywords: Array.from(new Set([...(popupState?.whitelist?.keywords || []), keyword])),
  };

  chrome.runtime.sendMessage(
    { type: "UPDATE_WHITELIST", whitelist: nextWhitelist },
    (response) => {
      if (!response?.success) {
        setStatus("Could not save keyword.", true);
        return;
      }

      keywordHint.textContent = `Added "${keyword}".`;
      keywordInput.value = "";
      setStatus("Keyword added.");
      loadState();
    }
  );
}

function toggleSession() {
  const action = popupState?.sessionActive ? "END_SESSION" : "START_SESSION";
  const payload =
    action === "START_SESSION"
      ? {
          type: action,
          topic: topicInput.value.trim(),
          goalMinutes: Number(durationInput.value || 50),
          pinnedTimer: pinToggle.checked,
        }
      : { type: action };

  chrome.runtime.sendMessage(payload, (response) => {
    if (!response?.success) {
      setStatus("Could not update session.", true);
      return;
    }

    applyState(response.state);
    setStatus(action === "START_SESSION" ? "Session started." : "Session ended.");
  });
}

sessionBtn.addEventListener("click", toggleSession);
whitelistBtn.addEventListener("click", whitelistCurrentSite);
addKeywordBtn.addEventListener("click", addKeyword);
topicInput.addEventListener("change", syncConfig);
durationInput.addEventListener("change", syncConfig);
pinToggle.addEventListener("change", syncConfig);

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  refreshInterval = setInterval(loadState, 1000);
});

window.addEventListener("unload", () => {
  clearInterval(refreshInterval);
});
