const DEFAULT_WHITELIST = {
  domains: [
    "localhost",
    "127.0.0.1",
    "github.com",
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
    "notion.so",
    "obsidian.md",
  ],
  keywords: [
    "study",
    "notes",
    "research",
    "lecture",
    "reference",
    "problem",
    "proof",
    "code",
    "assignment",
  ],
};

const BLOCKED_DOMAINS = [
  "instagram.com",
  "linkedin.com",
  "whatsapp.com",
  "web.whatsapp.com",
  "youtube.com",
  "youtu.be",
  "reddit.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "tiktok.com",
  "netflix.com",
];

const DISTRACTION_PATTERNS = [
  /\b(lol|lmao|bro|wyd|meme|reel|viral|dm me|follow back|reply asap)\b/i,
  /\b(instagram|linkedin|whatsapp|status update|feed|follower|like and share)\b/i,
  /\b(weekend plan|party tonight|movie night|gaming later|send photo)\b/i,
];

const STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "against",
  "almost",
  "also",
  "among",
  "around",
  "because",
  "before",
  "being",
  "between",
  "could",
  "every",
  "first",
  "from",
  "have",
  "into",
  "just",
  "like",
  "make",
  "many",
  "more",
  "most",
  "other",
  "over",
  "same",
  "some",
  "such",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "under",
  "very",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
]);

const DASHBOARD_HOSTS = ["localhost", "127.0.0.1"];
const VIOLATION_COOLDOWN_MS = 6000;
const VIOLATION_RESET_MS = 45000;

const INITIAL_STATE = {
  sessionActive: false,
  mood: "happy",
  distractionCount: 0,
  studyTopic: "",
  sessionDurationMinutes: 50,
  sessionStartedAt: null,
  sessionEndsAt: null,
  pinnedTimer: true,
  soundEnabled: true,
  whitelist: DEFAULT_WHITELIST,
  lastReason: "Waiting for a session",
  lastClassification: "idle",
  violationStreak: 0,
  lastViolationAt: 0,
  lastViolationKey: "",
};

let agentState = { ...INITIAL_STATE };

function uniq(items) {
  return Array.from(new Set((items || []).filter(Boolean)));
}

function normalizeWhitelist(next) {
  return {
    domains: uniq([...(next?.domains || [])]).map((domain) => domain.toLowerCase().trim()),
    keywords: uniq([...(next?.keywords || [])]).map((keyword) =>
      keyword.toLowerCase().trim()
    ),
  };
}

function whitelistWithDefaults(next) {
  return normalizeWhitelist({
    domains: [...DEFAULT_WHITELIST.domains, ...(next?.domains || [])],
    keywords: [...DEFAULT_WHITELIST.keywords, ...(next?.keywords || [])],
  });
}

function setAgentState(patch, broadcast = true) {
  agentState = {
    ...agentState,
    ...patch,
    whitelist: patch.whitelist
      ? normalizeWhitelist(patch.whitelist)
      : agentState.whitelist,
  };

  chrome.storage.local.set({
    sessionActive: agentState.sessionActive,
    mood: agentState.mood,
    distractionCount: agentState.distractionCount,
    studyTopic: agentState.studyTopic,
    sessionDurationMinutes: agentState.sessionDurationMinutes,
    sessionStartedAt: agentState.sessionStartedAt,
    sessionEndsAt: agentState.sessionEndsAt,
    pinnedTimer: agentState.pinnedTimer,
    soundEnabled: agentState.soundEnabled,
    whitelist: agentState.whitelist,
    lastReason: agentState.lastReason,
    lastClassification: agentState.lastClassification,
    violationStreak: agentState.violationStreak,
    lastViolationAt: agentState.lastViolationAt,
    lastViolationKey: agentState.lastViolationKey,
  });

  if (broadcast) {
    broadcastState();
  }
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isTrustedDashboardSender(sender) {
  const candidateUrl = sender?.tab?.url || sender?.url || "";
  try {
    const { hostname } = new URL(candidateUrl);
    return DASHBOARD_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}

function normalizeWord(word) {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(ingly|edly|ingly|ing|edly|ed|es|s)$/g, "");
}

function tokenize(text) {
  return uniq(
    (text || "")
      .match(/[a-z0-9']+/gi)
      ?.map(normalizeWord)
      .filter((token) => token.length > 2 && !STOPWORDS.has(token)) || []
  );
}

function buildTopicKeywords() {
  return uniq([
    ...tokenize(agentState.studyTopic),
    ...agentState.whitelist.keywords.flatMap((keyword) => tokenize(keyword)),
  ]);
}

function hasDistractingLanguage(text) {
  return DISTRACTION_PATTERNS.some((pattern) => pattern.test(text || ""));
}

function scoreRelevance(text) {
  const topicKeywords = buildTopicKeywords();
  if (topicKeywords.length === 0) {
    return { score: 1, matches: [], topicKeywords };
  }

  const tokens = tokenize(text).slice(0, 80);
  if (tokens.length === 0) {
    return { score: 0, matches: [], topicKeywords };
  }

  const matches = tokens.filter((token) => topicKeywords.includes(token));
  const coverage = matches.length / topicKeywords.length;
  const density = matches.length / tokens.length;
  const score = coverage * 0.7 + density * 0.3;

  return {
    score,
    matches: uniq(matches),
    topicKeywords,
  };
}

function serializeState() {
  const now = Date.now();
  const remainingMs = agentState.sessionEndsAt
    ? Math.max(0, agentState.sessionEndsAt - now)
    : 0;
  const elapsedMs = agentState.sessionStartedAt
    ? Math.max(0, now - agentState.sessionStartedAt)
    : 0;

  return {
    ...agentState,
    remainingMs,
    elapsedMs,
    goalComplete: Boolean(agentState.sessionActive && agentState.sessionEndsAt && remainingMs === 0),
    topicKeywords: buildTopicKeywords(),
  };
}

function sendToTab(tabId, message) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, message).catch(() => {});
}

function broadcastState() {
  const state = serializeState();
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        sendToTab(tab.id, { type: "STATE_UPDATE", state });
      }
    });
  });
}

function isGoalComplete() {
  return Boolean(
    agentState.sessionActive && agentState.sessionEndsAt && Date.now() >= agentState.sessionEndsAt
  );
}

function isAllowedDomain(url) {
  const domain = getDomain(url);
  return agentState.whitelist.domains.some((allowed) => domain.includes(allowed));
}

function isBlockedDomain(url) {
  const domain = getDomain(url);
  return BLOCKED_DOMAINS.some((blocked) => domain.includes(blocked));
}

function clearPressure(reason) {
  if (!agentState.sessionActive) return;
  if (agentState.mood === "happy" && agentState.violationStreak === 0) return;

  setAgentState({
    mood: "happy",
    violationStreak: 0,
    lastReason: reason || "On topic",
    lastClassification: "on-topic",
    lastViolationKey: "",
  });
}

function violationMood(nextStreak) {
  if (nextStreak >= 4) return "demon";
  if (nextStreak >= 2) return "angry";
  return "suspicious";
}

function violationMessage(kind, details) {
  const topic = agentState.studyTopic || "your subject";
  const domain = details?.url ? getDomain(details.url) : "";

  if (kind === "blocked-domain") {
    return `Timer unfinished. Leave ${domain || "that site"} and get back to ${topic}.`;
  }

  if (kind === "irrelevant-typing") {
    return `That typing is off-topic. Write about ${topic} instead.`;
  }

  return `This page is drifting away from ${topic}. Refocus now.`;
}

function registerViolation(kind, tab, details = {}) {
  if (!agentState.sessionActive || isGoalComplete()) {
    clearPressure("Goal complete");
    return;
  }

  const now = Date.now();
  const domain = details.url ? getDomain(details.url) : getDomain(tab?.url || "");
  const violationKey = `${kind}:${tab?.id || "na"}:${domain}`;

  if (
    agentState.lastViolationKey === violationKey &&
    now - agentState.lastViolationAt < VIOLATION_COOLDOWN_MS
  ) {
    return;
  }

  const severity = kind === "blocked-domain" ? 2 : 1;
  const streak =
    now - agentState.lastViolationAt > VIOLATION_RESET_MS
      ? severity
      : agentState.violationStreak + severity;
  const mood = violationMood(streak);
  const message = violationMessage(kind, details);

  setAgentState({
    mood,
    distractionCount: agentState.distractionCount + 1,
    violationStreak: streak,
    lastViolationAt: now,
    lastViolationKey: violationKey,
    lastReason: message,
    lastClassification: kind,
  });

  if (tab?.id) {
    sendToTab(tab.id, { type: "SHOUT", message });
  }
}

function analyzePage(tab, snapshot) {
  if (!agentState.sessionActive) return;

  const url = snapshot?.url || tab?.url || "";
  if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
    return;
  }

  if (isGoalComplete()) {
    clearPressure("Goal complete");
    return;
  }

  if (isBlockedDomain(url)) {
    registerViolation("blocked-domain", tab, { url });
    return;
  }

  if (isAllowedDomain(url)) {
    clearPressure("Allowed domain");
    return;
  }

  const combinedText = [snapshot?.title || tab?.title || "", snapshot?.text || ""]
    .filter(Boolean)
    .join(" ");
  if (!combinedText.trim()) return;

  const analysis = scoreRelevance(combinedText);
  if (analysis.score >= 0.16 || analysis.matches.length >= 2) {
    clearPressure(
      analysis.matches.length > 0
        ? `On topic: ${analysis.matches.slice(0, 3).join(", ")}`
        : "On topic"
    );
    return;
  }

  registerViolation("off-topic-page", tab, { url, score: analysis.score });
}

function analyzeTyping(tab, payload) {
  if (!agentState.sessionActive) return;
  if (isGoalComplete()) {
    clearPressure("Goal complete");
    return;
  }

  const text = (payload?.text || "").trim();
  if (text.length < 24) return;

  if (isBlockedDomain(payload?.url || tab?.url || "")) {
    registerViolation("blocked-domain", tab, { url: payload?.url || tab?.url || "" });
    return;
  }

  const analysis = scoreRelevance(text);
  if (analysis.score >= 0.12 && !hasDistractingLanguage(text)) {
    clearPressure(
      analysis.matches.length > 0
        ? `Typing on topic: ${analysis.matches.slice(0, 3).join(", ")}`
        : "Typing on topic"
    );
    return;
  }

  registerViolation("irrelevant-typing", tab, {
    url: payload?.url || tab?.url || "",
    score: analysis.score,
  });
}

function mergeWhitelist(nextWhitelist) {
  return whitelistWithDefaults(nextWhitelist);
}

function currentSessionStart(goalEndsAt, durationMinutes) {
  if (typeof goalEndsAt === "number" && goalEndsAt > Date.now()) {
    return goalEndsAt - durationMinutes * 60000;
  }
  return Date.now();
}

function applyConfig(payload = {}) {
  const duration = Math.min(
    480,
    Math.max(15, Number(payload.goalMinutes || payload.sessionDurationMinutes || agentState.sessionDurationMinutes || 50))
  );

  const patch = {
    studyTopic: typeof payload.topic === "string" ? payload.topic.trim() : agentState.studyTopic,
    sessionDurationMinutes: duration,
    pinnedTimer:
      typeof payload.pinnedTimer === "boolean" ? payload.pinnedTimer : agentState.pinnedTimer,
    soundEnabled:
      typeof payload.soundEnabled === "boolean" ? payload.soundEnabled : agentState.soundEnabled,
    whitelist: payload.whitelist ? mergeWhitelist(payload.whitelist) : agentState.whitelist,
  };

  if (agentState.sessionActive && typeof payload.goalEndsAt === "number") {
    patch.sessionEndsAt = payload.goalEndsAt;
  }

  setAgentState(patch);
}

function startSession(payload = {}) {
  const duration = Math.min(
    480,
    Math.max(15, Number(payload.goalMinutes || payload.sessionDurationMinutes || agentState.sessionDurationMinutes || 50))
  );
  const goalEndsAt =
    typeof payload.goalEndsAt === "number" && payload.goalEndsAt > Date.now()
      ? payload.goalEndsAt
      : Date.now() + duration * 60000;

  setAgentState({
    sessionActive: true,
    mood: "happy",
    distractionCount: 0,
    studyTopic: typeof payload.topic === "string" ? payload.topic.trim() : agentState.studyTopic,
    sessionDurationMinutes: duration,
    sessionStartedAt: currentSessionStart(goalEndsAt, duration),
    sessionEndsAt: goalEndsAt,
    pinnedTimer:
      typeof payload.pinnedTimer === "boolean" ? payload.pinnedTimer : agentState.pinnedTimer,
    soundEnabled:
      typeof payload.soundEnabled === "boolean" ? payload.soundEnabled : agentState.soundEnabled,
    whitelist: payload.whitelist ? mergeWhitelist(payload.whitelist) : agentState.whitelist,
    lastReason: "Session active",
    lastClassification: "waiting-for-page",
    violationStreak: 0,
    lastViolationAt: 0,
    lastViolationKey: "",
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      analyzePage(tabs[0], { url: tabs[0].url, title: tabs[0].title, text: "" });
    }
  });
}

function endSession() {
  setAgentState({
    sessionActive: false,
    mood: "happy",
    sessionStartedAt: null,
    sessionEndsAt: null,
    violationStreak: 0,
    lastViolationKey: "",
    lastReason: "Session ended",
    lastClassification: "idle",
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setAgentState(
    {
      ...INITIAL_STATE,
      whitelist: normalizeWhitelist(DEFAULT_WHITELIST),
    },
    false
  );
  chrome.storage.local.set({
    ...INITIAL_STATE,
    whitelist: normalizeWhitelist(DEFAULT_WHITELIST),
  });
});

chrome.storage.local.get(
  [
    "sessionActive",
    "mood",
    "distractionCount",
    "studyTopic",
    "sessionDurationMinutes",
    "sessionStartedAt",
    "sessionEndsAt",
    "pinnedTimer",
    "soundEnabled",
    "whitelist",
    "lastReason",
    "lastClassification",
    "violationStreak",
    "lastViolationAt",
    "lastViolationKey",
  ],
  (stored) => {
    agentState = {
      ...INITIAL_STATE,
      ...stored,
      whitelist: normalizeWhitelist(stored.whitelist || DEFAULT_WHITELIST),
    };
    broadcastState();
  }
);

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    analyzePage(tab, { url: tab.url, title: tab.title, text: "" });
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.active) return;
  analyzePage(tab, { url: tab.url, title: tab.title, text: "" });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tab = sender.tab;

  if (message.type === "GET_STATE") {
    sendResponse(serializeState());
    return true;
  }

  if (message.type === "UPDATE_WHITELIST") {
    setAgentState({ whitelist: mergeWhitelist(message.whitelist) });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "UPDATE_CONFIG") {
    applyConfig(message);
    sendResponse({ success: true, state: serializeState() });
    return true;
  }

  if (message.type === "START_SESSION") {
    startSession(message);
    sendResponse({ success: true, state: serializeState() });
    return true;
  }

  if (message.type === "END_SESSION") {
    endSession();
    sendResponse({ success: true, state: serializeState() });
    return true;
  }

  if (message.type === "PAGE_SNAPSHOT" && tab?.active) {
    analyzePage(tab, message);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "TYPED_TEXT" && tab?.active) {
    analyzeTyping(tab, message);
    sendResponse({ success: true });
    return true;
  }

  if (
    message.type === "FOCUS_AGENT_CONFIG_SYNC" &&
    message.source === "focus-dashboard" &&
    isTrustedDashboardSender(sender)
  ) {
    applyConfig(message.payload || {});
    sendResponse({ success: true });
    return true;
  }

  if (
    message.type === "FOCUS_AGENT_START_SESSION" &&
    message.source === "focus-dashboard" &&
    isTrustedDashboardSender(sender)
  ) {
    startSession(message.payload || {});
    sendResponse({ success: true });
    return true;
  }

  if (
    message.type === "FOCUS_AGENT_END_SESSION" &&
    message.source === "focus-dashboard" &&
    isTrustedDashboardSender(sender)
  ) {
    endSession();
    sendResponse({ success: true });
    return true;
  }

  return true;
});
