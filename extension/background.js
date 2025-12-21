const DEFAULT_WHITELIST = {
  domains: [
    "localhost",
    "127.0.0.1",
    "github.com",
    "stackoverflow.com",
    "developer.mozilla.org",
    "docs.google.com",
    "coursera.org",
    "udemy.com",
    "edx.org",
    "khanacademy.org",
    "leetcode.com",
    "hackerrank.com",
    "w3schools.com",
    "geeksforgeeks.org",
    "medium.com",
    "dev.to",
    "notion.so",
    "obsidian.md",
  ],
  keywords: [
    "documentation",
    "tutorial",
    "learn",
    "course",
    "study",
    "education",
    "programming",
    "code",
    "development",
    "research",
    "article",
    "guide",
    "reference",
  ],
};

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

let sessionActive = false;
let currentMood = "happy";
let distractionCount = 0;
let moodTimer = null;
let whitelist = DEFAULT_WHITELIST;
let userId = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    whitelist: DEFAULT_WHITELIST,
    sessionActive: false,
    mood: "happy",
    distractionCount: 0,
    userId: null,
  });
});

chrome.storage.local.get(["whitelist", "sessionActive", "userId"], (result) => {
  if (result.whitelist) whitelist = result.whitelist;
  if (result.sessionActive) sessionActive = result.sessionActive;
  if (result.userId) userId = result.userId;
});

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function isWhitelisted(url, title) {
  const domain = getDomain(url);
  const lowerTitle = (title || "").toLowerCase();
  const lowerUrl = url.toLowerCase();

  if (whitelist.domains.some((d) => domain.includes(d))) {
    return true;
  }

  if (whitelist.keywords.some((k) => lowerTitle.includes(k) || lowerUrl.includes(k))) {
    return true;
  }

  return false;
}

function isBlocked(url) {
  const domain = getDomain(url);
  return BLOCKED_DOMAINS.some((d) => domain.includes(d));
}

function escalateMood() {
  if (currentMood === "happy") {
    currentMood = "suspicious";
  } else if (currentMood === "suspicious") {
    currentMood = "angry";
  } else if (currentMood === "angry") {
    currentMood = "demon";
    distractionCount++;
  }

  chrome.storage.local.set({ mood: currentMood, distractionCount });
  broadcastMood();

  if (currentMood !== "demon") {
    clearTimeout(moodTimer);
    moodTimer = setTimeout(escalateMood, 10000);
  }
}

function resetMood() {
  currentMood = "happy";
  clearTimeout(moodTimer);
  chrome.storage.local.set({ mood: currentMood });
  broadcastMood();
}

function broadcastMood() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: "MOOD_UPDATE",
          mood: currentMood,
          sessionActive,
        }).catch(() => {});
      }
    });
  });
}

function checkTab(tab) {
  if (!sessionActive || !tab.url) return;

  if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
    return;
  }

  if (isBlocked(tab.url)) {
    if (currentMood !== "demon") {
      currentMood = "angry";
      clearTimeout(moodTimer);
      moodTimer = setTimeout(() => {
        currentMood = "demon";
        distractionCount++;
        chrome.storage.local.set({ mood: currentMood, distractionCount });
        broadcastMood();
      }, 5000);
    }
    chrome.storage.local.set({ mood: currentMood });
    broadcastMood();
    return;
  }

  if (isWhitelisted(tab.url, tab.title)) {
    resetMood();
  } else {
    if (currentMood === "happy") {
      escalateMood();
    }
  }
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab) checkTab(tab);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id === tabId) {
        checkTab(tab);
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_SESSION") {
    sessionActive = true;
    userId = message.userId;
    currentMood = "happy";
    distractionCount = 0;
    chrome.storage.local.set({ sessionActive, userId, mood: currentMood, distractionCount });
    broadcastMood();
    sendResponse({ success: true });
  }

  if (message.type === "END_SESSION") {
    sessionActive = false;
    clearTimeout(moodTimer);
    const stats = { distractionCount };
    currentMood = "happy";
    distractionCount = 0;
    chrome.storage.local.set({ sessionActive, mood: currentMood, distractionCount });
    broadcastMood();
    sendResponse({ success: true, stats });
  }

  if (message.type === "UPDATE_WHITELIST") {
    whitelist = message.whitelist;
    chrome.storage.local.set({ whitelist });
    sendResponse({ success: true });
  }

  if (message.type === "GET_STATE") {
    sendResponse({
      sessionActive,
      mood: currentMood,
      distractionCount,
      whitelist,
    });
  }

  if (message.type === "APOLOGIZE") {
    resetMood();
    sendResponse({ success: true });
  }

  return true;
});
