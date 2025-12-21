const BLOCKED_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "netflix.com",
  "twitch.tv",
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "reddit.com",
  "9gag.com",
  "imgur.com",
];

const DEFAULT_WHITELIST = { domains: [], keywords: [] };

const sessionBtn = document.getElementById("session-btn");
const sessionPill = document.getElementById("session-pill");
const whitelistBtn = document.getElementById("whitelist-btn");
const domainHint = document.getElementById("domain-hint");
const keywordInput = document.getElementById("keyword-input");
const addKeywordBtn = document.getElementById("add-keyword-btn");
const keywordHint = document.getElementById("keyword-hint");
const whitelistPreview = document.getElementById("whitelist-preview");
const statusEl = document.getElementById("status");

let sessionActive = false;
let whitelist = DEFAULT_WHITELIST;

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#f87171" : "#0ea5e9";
}

function parseDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function loadState() {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (!response) return;
    sessionActive = Boolean(response.sessionActive);
    whitelist = response.whitelist || DEFAULT_WHITELIST;
    updateUI();
  });
}

function updateUI() {
  sessionPill.textContent = sessionActive ? "Active" : "Inactive";
  sessionPill.classList.toggle("active", sessionActive);
  sessionBtn.textContent = sessionActive ? "End Session" : "Start Session";
  sessionBtn.classList.toggle("active", sessionActive);
  whitelistPreview.textContent = `Domains: ${whitelist.domains.length} | Keywords: ${whitelist.keywords.length}`;
}

function mergeWhitelist(next) {
  whitelist = {
    domains: Array.from(new Set(next.domains || [])),
    keywords: Array.from(new Set(next.keywords || [])),
  };
  chrome.runtime.sendMessage(
    { type: "UPDATE_WHITELIST", whitelist },
    (res) => {
      if (res && res.success) {
        chrome.storage.local.set({ whitelist });
        updateUI();
      }
    }
  );
}

function whitelistCurrentSite() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.url) {
      setStatus("No active tab.");
      return;
    }
    const domain = parseDomain(tab.url);
    if (!domain) {
      setStatus("Could not parse domain.", true);
      return;
    }
    const blocked = BLOCKED_DOMAINS.some((d) => domain.includes(d));
    if (blocked) {
      setStatus("This site cannot be whitelisted (blocked).", true);
      return;
    }
    if (whitelist.domains.includes(domain)) {
      setStatus("Already whitelisted.");
      return;
    }
    mergeWhitelist({
      domains: [...whitelist.domains, domain],
      keywords: whitelist.keywords,
    });
    domainHint.textContent = `Added ${domain} to whitelist.`;
    setStatus("Whitelist updated.");
  });
}

function addKeyword() {
  const raw = keywordInput.value.trim().toLowerCase();
  if (!raw) {
    setStatus("Enter a keyword first.", true);
    return;
  }
  if (whitelist.keywords.includes(raw)) {
    setStatus("Keyword already added.");
    return;
  }
  mergeWhitelist({
    domains: whitelist.domains,
    keywords: [...whitelist.keywords, raw],
  });
  keywordHint.textContent = `Added "${raw}".`;
  keywordInput.value = "";
  setStatus("Whitelist updated.");
}

sessionBtn.addEventListener("click", () => {
  const type = sessionActive ? "END_SESSION" : "START_SESSION";
  chrome.runtime.sendMessage({ type }, (res) => {
    if (res && res.success) {
      sessionActive = !sessionActive;
      updateUI();
      setStatus(sessionActive ? "Session started." : "Session ended.");
    } else {
      setStatus("Could not update session.", true);
    }
  });
});

whitelistBtn.addEventListener("click", whitelistCurrentSite);
addKeywordBtn.addEventListener("click", addKeyword);

document.addEventListener("DOMContentLoaded", loadState);
