"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { useDemonMode } from "@/hooks/useDemonMode";
import { useVoice } from "@/hooks/useVoice";
import "./CompanionStyles.css";

const DIALOGUES = {
  happy: [
    "Keep going! You're doing great!",
    "I'm learning so much!",
    "Focus is your superpower!",
    "You've got this!",
  ],
  suspicious: [
    "Hey... you still there?",
    "Why did you stop?",
    "I'm watching you...",
    "Don't leave me!",
  ],
  angry: [
    "DON'T YOU DARE LEAVE!",
    "I'm getting angry...",
    "FOCUS. NOW.",
    "One more second and...",
  ],
  demon: [
    "YOU LEFT ME.",
    "LOOK AT ME.",
    "APOLOGIZE.",
    "I TRUSTED YOU.",
  ],
};

function getRandomDialogue(mood: keyof typeof DIALOGUES): string {
  const options = DIALOGUES[mood];
  return options[Math.floor(Math.random() * options.length)];
}

export function Companion() {
  const { isSessionActive, isMonitoringEnabled } = useGameStore();
  const { mood } = useDemonMode();
  const { shout } = useVoice();
  const lastMoodRef = useRef(mood);
  const pipWindowRef = useRef<Window | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);
  const [dialogue, setDialogue] = useState(() => getRandomDialogue("happy"));

  // Update dialogue and shout when mood changes
  useEffect(() => {
    if (mood !== lastMoodRef.current) {
      lastMoodRef.current = mood;
      const newDialogue = getRandomDialogue(mood);
      setDialogue(newDialogue);

      if (isSessionActive && isMonitoringEnabled) {
        if (mood === "suspicious" || mood === "angry" || mood === "demon") {
          shout(newDialogue);
        }
      }
    }
  }, [mood, isSessionActive, isMonitoringEnabled, shout]);

  // Periodic shouting when angry or demon
  useEffect(() => {
    if (!isSessionActive || !isMonitoringEnabled) return;
    if (mood !== "angry" && mood !== "demon") return;

    const interval = setInterval(() => {
      const newDialogue = getRandomDialogue(mood);
      setDialogue(newDialogue);
      shout(newDialogue);
    }, mood === "demon" ? 8000 : 12000);

    return () => clearInterval(interval);
  }, [mood, isSessionActive, isMonitoringEnabled, shout]);

  // Picture-in-Picture functionality
  const openPip = useCallback(async () => {
    if (!("documentPictureInPicture" in window)) {
      alert("Picture-in-Picture is not supported in this browser. Use Chrome 116+.");
      return;
    }

    try {
      // @ts-expect-error - documentPictureInPicture is experimental
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 300,
        height: 200,
      });

      pipWindowRef.current = pipWindow;
      setIsPipActive(true);

      // Copy styles
      const styleSheets = document.styleSheets;
      for (const sheet of styleSheets) {
        try {
          if (sheet.cssRules) {
            const cssText = Array.from(sheet.cssRules)
              .map((rule) => rule.cssText)
              .join("\n");
            const style = pipWindow.document.createElement("style");
            style.textContent = cssText;
            pipWindow.document.head.appendChild(style);
          }
        } catch {
          // Skip cross-origin stylesheets
        }
      }

      // Add base styles
      const baseStyle = pipWindow.document.createElement("style");
      baseStyle.textContent = `
        body {
          margin: 0;
          padding: 16px;
          background: linear-gradient(135deg, #f8f4eb 0%, #e8e4db 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          box-sizing: border-box;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .pip-companion {
          text-align: center;
        }
        .pip-message {
          margin-top: 12px;
          font-size: 14px;
          font-weight: 600;
          color: #1a1d2f;
          max-width: 250px;
        }
        .pip-message.angry { color: #dc2626; }
        .pip-message.demon { color: #dc2626; text-transform: uppercase; }
      `;
      pipWindow.document.head.appendChild(baseStyle);

      // Create companion element
      const container = pipWindow.document.createElement("div");
      container.className = "pip-companion";
      pipWindow.document.body.appendChild(container);

      // Update function
      const updatePip = () => {
        const currentMood = useGameStore.getState().mood;
        container.innerHTML = `
          <div class="companion-container ${currentMood}" style="position: static; transform: none;">
            <div class="companion-body">
              <div class="companion-antenna"><div class="antenna-ball"></div></div>
              <div class="companion-face">
                <div class="companion-eyes">
                  <div class="eye left"><div class="pupil"></div></div>
                  <div class="eye right"><div class="pupil"></div></div>
                </div>
                <div class="companion-mouth"></div>
              </div>
            </div>
          </div>
          <div class="pip-message ${currentMood}">${getRandomDialogue(currentMood)}</div>
        `;
      };

      updatePip();
      const updateInterval = setInterval(updatePip, 2000);

      pipWindow.addEventListener("pagehide", () => {
        clearInterval(updateInterval);
        setIsPipActive(false);
        pipWindowRef.current = null;
      });
    } catch (error) {
      console.error("Failed to open PiP:", error);
    }
  }, []);

  const closePip = useCallback(() => {
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      setIsPipActive(false);
    }
  }, []);

  if (!isSessionActive && mood !== "demon") {
    return null;
  }

  return (
    <div className={`companion-container ${mood}`}>
      <div className="companion-body">
        <div className="companion-antenna">
          <div className="antenna-ball" />
        </div>

        <div className="companion-face">
          <div className="companion-eyes">
            <div className="eye left">
              <div className="pupil" />
            </div>
            <div className="eye right">
              <div className="pupil" />
            </div>
          </div>
          <div className="companion-mouth" />
        </div>

        {mood === "demon" && (
          <div className="demon-tentacles">
            <div className="tentacle t1" />
            <div className="tentacle t2" />
            <div className="tentacle t3" />
            <div className="tentacle t4" />
          </div>
        )}
      </div>

      <div className="companion-dialogue">
        <span>{dialogue}</span>
      </div>

      {mood === "angry" && (
        <div className="anger-particles">
          <span className="particle">!</span>
          <span className="particle">!</span>
          <span className="particle">!</span>
        </div>
      )}

      {isSessionActive && (
        <button
          className="pip-toggle"
          onClick={isPipActive ? closePip : openPip}
          title={isPipActive ? "Close overlay" : "Open overlay (stays visible)"}
        >
          {isPipActive ? "Close Overlay" : "Pop Out"}
        </button>
      )}
    </div>
  );
}
