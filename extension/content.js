let mascot = null;
let currentMood = "happy";
let sessionActive = false;
let speechTimeout = null;

const DIALOGUES = {
  happy: [
    "Great job staying focused!",
    "Keep it up!",
    "You're doing amazing!",
    "I'm proud of you!",
  ],
  suspicious: [
    "Hmm... what are you doing?",
    "This doesn't look like studying...",
    "Are you sure about this?",
    "I'm watching you...",
  ],
  angry: [
    "GET BACK TO WORK!",
    "STOP WASTING TIME!",
    "THIS IS NOT OKAY!",
    "I'M GETTING REALLY MAD!",
  ],
  demon: [
    "YOU BETRAYED ME!",
    "LOOK WHAT YOU'VE DONE!",
    "APOLOGIZE. NOW.",
    "I TRUSTED YOU!",
  ],
};

function createMascot() {
  if (mascot) return;

  mascot = document.createElement("div");
  mascot.id = "focus-companion-mascot";
  mascot.innerHTML = `
    <div class="fc-body">
      <div class="fc-antenna"><div class="fc-antenna-ball"></div></div>
      <div class="fc-face">
        <div class="fc-eyes">
          <div class="fc-eye left"><div class="fc-pupil"></div></div>
          <div class="fc-eye right"><div class="fc-pupil"></div></div>
        </div>
        <div class="fc-mouth"></div>
      </div>
      <div class="fc-tentacles">
        <div class="fc-tentacle t1"></div>
        <div class="fc-tentacle t2"></div>
        <div class="fc-tentacle t3"></div>
        <div class="fc-tentacle t4"></div>
      </div>
    </div>
    <div class="fc-speech"></div>
  `;

  document.body.appendChild(mascot);

  mascot.addEventListener("click", () => {
    if (currentMood === "demon") {
      showApologyPrompt();
    }
  });
}

function updateMascot(mood, isActive) {
  if (!mascot) createMascot();

  currentMood = mood;
  sessionActive = isActive;

  mascot.className = "";
  mascot.classList.add(mood);

  if (!isActive) {
    mascot.classList.add("hidden");
  } else {
    mascot.classList.remove("hidden");
  }

  if (mood === "demon") {
    mascot.classList.add("demon-mode");
  }

  speak(mood);
}

function speak(mood) {
  if (!mascot) return;

  const speech = mascot.querySelector(".fc-speech");
  const messages = DIALOGUES[mood];
  const message = messages[Math.floor(Math.random() * messages.length)];

  speech.textContent = message;
  speech.classList.add("visible");

  if (mood === "angry" || mood === "demon") {
    speakAloud(message, true);
  }

  clearTimeout(speechTimeout);
  speechTimeout = setTimeout(() => {
    speech.classList.remove("visible");
  }, 4000);
}

function speakAloud(text, yell = false) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = yell ? 1.3 : 1.0;
  utterance.pitch = yell ? 1.4 : 1.0;
  utterance.volume = yell ? 1.0 : 0.8;

  window.speechSynthesis.speak(utterance);
}

function showApologyPrompt() {
  const overlay = document.createElement("div");
  overlay.id = "fc-apology-overlay";
  overlay.innerHTML = `
    <div class="fc-apology-box">
      <h2>APOLOGIZE</h2>
      <p>Type "i will focus" to continue</p>
      <input type="text" id="fc-apology-input" placeholder="Type here..." autocomplete="off" />
      <p class="fc-error"></p>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector("#fc-apology-input");
  const error = overlay.querySelector(".fc-error");

  input.focus();

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const value = input.value.trim().toLowerCase();
      if (value === "i will focus") {
        chrome.runtime.sendMessage({ type: "APOLOGIZE" });
        overlay.remove();
      } else {
        error.textContent = "Wrong. Try again.";
        input.value = "";
        overlay.classList.add("shake");
        setTimeout(() => overlay.classList.remove("shake"), 500);
      }
    }
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "MOOD_UPDATE") {
    updateMascot(message.mood, message.sessionActive);
  }
});

chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
  if (response) {
    updateMascot(response.mood, response.sessionActive);
  }
});

createMascot();
