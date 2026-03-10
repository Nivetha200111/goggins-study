let overlay = null;
let overlayState = null;
let collapsed = false;
let speechTimeout = null;
let typingTimeout = null;
let snapshotTimeout = null;
let timerInterval = null;
let lastSnapshotUrl = "";

function formatDuration(totalMs) {
  const clamped = Math.max(0, totalMs || 0);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function ensureOverlay() {
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "focus-agent-overlay";
  overlay.innerHTML = `
    <button class="fa-toggle" type="button" aria-label="Collapse timer">-</button>
    <div class="fa-card">
      <div class="fa-header">
        <div>
          <p class="fa-kicker">Local focus agent</p>
          <strong class="fa-topic">No session running</strong>
        </div>
        <span class="fa-pill">Idle</span>
      </div>
      <div class="fa-timer">50:00</div>
      <div class="fa-progress">
        <div class="fa-progress-fill"></div>
      </div>
      <p class="fa-status">Waiting for a study timer.</p>
      <div class="fa-footer">
        <div class="fa-face" aria-hidden="true">
          <span class="eye left"></span>
          <span class="eye right"></span>
          <span class="mouth"></span>
        </div>
        <div class="fa-reason">The overlay will track your session here.</div>
      </div>
      <div class="fa-speech"></div>
    </div>
  `;

  overlay.querySelector(".fa-toggle")?.addEventListener("click", () => {
    collapsed = !collapsed;
    overlay.classList.toggle("collapsed", collapsed);
    const button = overlay.querySelector(".fa-toggle");
    if (button) {
      button.textContent = collapsed ? "+" : "-";
      button.setAttribute("aria-label", collapsed ? "Expand timer" : "Collapse timer");
    }
  });

  document.documentElement.appendChild(overlay);
  return overlay;
}

function speakAloud(text, yell) {
  if (!overlayState?.soundEnabled) return;
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = yell ? 1.14 : 1;
  utterance.pitch = yell ? 0.88 : 1;
  utterance.volume = yell ? 1 : 0.82;
  window.speechSynthesis.speak(utterance);
}

function showSpeech(message, yell) {
  const root = ensureOverlay();
  const bubble = root.querySelector(".fa-speech");
  if (!bubble) return;

  bubble.textContent = message;
  bubble.classList.add("visible");
  speakAloud(message, yell);

  clearTimeout(speechTimeout);
  speechTimeout = setTimeout(() => {
    bubble.classList.remove("visible");
  }, 4000);
}

function updateVisibility() {
  if (!overlay || !overlayState) return;

  const shouldShow =
    overlayState.sessionActive && (overlayState.pinnedTimer || overlayState.mood !== "happy");
  overlay.classList.toggle("hidden", !shouldShow);
}

function renderOverlay() {
  const root = ensureOverlay();
  if (!overlayState) return;

  root.className = "";
  root.id = "focus-agent-overlay";
  root.classList.add(overlayState.mood || "happy");
  root.classList.toggle("collapsed", collapsed);

  const topicEl = root.querySelector(".fa-topic");
  const pillEl = root.querySelector(".fa-pill");
  const timerEl = root.querySelector(".fa-timer");
  const statusEl = root.querySelector(".fa-status");
  const reasonEl = root.querySelector(".fa-reason");
  const progressFill = root.querySelector(".fa-progress-fill");

  const remainingMs = overlayState.remainingMs || 0;
  const totalMs = (overlayState.sessionDurationMinutes || 50) * 60000;
  const elapsedMs = overlayState.elapsedMs || 0;
  const progress = totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 0;

  if (topicEl) {
    topicEl.textContent = overlayState.studyTopic || "Choose a study subject";
  }

  if (pillEl) {
    const moodLabel = overlayState.goalComplete
      ? "Complete"
      : overlayState.sessionActive
        ? overlayState.mood
        : "Idle";
    pillEl.textContent = moodLabel;
  }

  if (timerEl) {
    timerEl.textContent = overlayState.sessionActive
      ? formatDuration(remainingMs)
      : formatDuration(totalMs);
  }

  if (statusEl) {
    statusEl.textContent = overlayState.goalComplete
      ? "Goal complete. No more shouting for this session."
      : overlayState.lastClassification || "Watching Chrome locally.";
  }

  if (reasonEl) {
    reasonEl.textContent = overlayState.lastReason || "Watching Chrome locally.";
  }

  if (progressFill) {
    progressFill.style.width = `${Math.max(4, progress * 100)}%`;
  }

  updateVisibility();
}

function startTimerLoop() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!overlayState?.sessionActive) return;
    renderOverlay();
  }, 1000);
}

function extractPageText() {
  const main =
    document.querySelector("main, article, [role='main'], .content, #content") ||
    document.body;
  return (main?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 3500);
}

function sendSnapshot() {
  if (!overlayState?.sessionActive) return;

  const url = window.location.href;
  if (lastSnapshotUrl === url) return;
  lastSnapshotUrl = url;

  chrome.runtime.sendMessage({
    type: "PAGE_SNAPSHOT",
    url,
    title: document.title,
    text: extractPageText(),
  });
}

function scheduleSnapshot() {
  clearTimeout(snapshotTimeout);
  snapshotTimeout = setTimeout(sendSnapshot, 900);
}

function getEditableText(target) {
  if (!target) return "";

  if (target instanceof HTMLInputElement) {
    if (target.type === "password" || target.type === "email" || target.type === "search") {
      return target.value || "";
    }
    return target.value || "";
  }

  if (target instanceof HTMLTextAreaElement) {
    return target.value || "";
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    return target.innerText || "";
  }

  return "";
}

function queueTypedText(target) {
  if (!overlayState?.sessionActive) return;

  const text = getEditableText(target).trim();
  if (text.length < 24) return;

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    chrome.runtime.sendMessage({
      type: "TYPED_TEXT",
      url: window.location.href,
      title: document.title,
      text: text.slice(-800),
    });
  }, 1200);
}

function handleRuntimeMessage(message) {
  if (message.type === "STATE_UPDATE") {
    overlayState = message.state;
    renderOverlay();
    startTimerLoop();
  }

  if (message.type === "SHOUT") {
    showSpeech(message.message || "Back to work.", true);
  }
}

function bridgeDashboardMessages(event) {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== "focus-dashboard") return;

  if (
    data.type === "FOCUS_AGENT_CONFIG_SYNC" ||
    data.type === "FOCUS_AGENT_START_SESSION" ||
    data.type === "FOCUS_AGENT_END_SESSION"
  ) {
    chrome.runtime.sendMessage(data);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  handleRuntimeMessage(message);
});

chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
  if (!response) return;
  overlayState = response;
  renderOverlay();
  startTimerLoop();
  scheduleSnapshot();
});

ensureOverlay();

window.addEventListener("message", bridgeDashboardMessages);

document.addEventListener("input", (event) => {
  queueTypedText(event.target);
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    lastSnapshotUrl = "";
    scheduleSnapshot();
  }
});

if (document.readyState === "complete") {
  scheduleSnapshot();
} else {
  window.addEventListener("load", scheduleSnapshot);
}

let observedUrl = location.href;
new MutationObserver(() => {
  if (location.href !== observedUrl) {
    observedUrl = location.href;
    lastSnapshotUrl = "";
    scheduleSnapshot();
  }
}).observe(document, { subtree: true, childList: true });
