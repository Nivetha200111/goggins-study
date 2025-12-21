"use client";

import { useEffect, useState } from "react";
import type { ElectronAPI, Mood } from "@/types";
import "./CompanionStyles.css";

interface WindowInfo {
  title: string;
  owner: string;
  url?: string;
  isStudying: boolean;
}

interface OverlayCompanionProps {
  mood: Mood;
  isSessionActive: boolean;
  currentWindow: WindowInfo | null;
  onCompanionClick: () => void;
  onApologyComplete: () => void;
}

const DIALOGUES = {
  happy: ["Keep going!", "You're doing great!", "I'm learning too!", "Focus power!"],
  suspicious: ["Hey... what's that?", "Is that... work?", "Hmm...", "Stay focused!"],
  angry: ["GET BACK!", "FOCUS NOW!", "I'M WARNING YOU!", "DON'T DO IT!"],
  demon: ["YOU LEFT.", "APOLOGIZE.", "LOOK AT ME.", "FOCUS."],
};

function getRandomDialogue(mood: Mood): string {
  const options = DIALOGUES[mood];
  return options[Math.floor(Math.random() * options.length)];
}

export function OverlayCompanion({
  mood,
  isSessionActive,
  currentWindow,
  onCompanionClick,
  onApologyComplete,
}: OverlayCompanionProps) {
  const [apology, setApology] = useState("");

  const getElectronAPI = (): ElectronAPI | undefined => {
    if (typeof window === "undefined") return undefined;
    return (window as Window & { electronAPI?: ElectronAPI }).electronAPI;
  };

  const setOverlayInteractive = (interactive: boolean) => {
    const api = getElectronAPI();
    if (api) {
      api.setOverlayInteractive(interactive);
    }
  };

  useEffect(() => {
    setOverlayInteractive(mood === "demon");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood]);

  const handleApologySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apology.toLowerCase().trim() === "i will focus") {
      onApologyComplete();
      setApology("");
    }
  };

  const getSize = () => {
    switch (mood) {
      case "happy":
        return "small";
      case "suspicious":
        return "medium";
      case "angry":
        return "large";
      case "demon":
        return "xlarge";
      default:
        return "small";
    }
  };

  if (!isSessionActive && mood !== "demon") {
    return (
      <div
        className="overlay-companion idle"
        onClick={onCompanionClick}
        onMouseEnter={() => setOverlayInteractive(true)}
        onMouseLeave={() => setOverlayInteractive(false)}
      >
        <div className="companion-body-mini">
          <div className="mini-eye" />
        </div>
        <div className="mini-dialogue">Click to start</div>
      </div>
    );
  }

  return (
    <div
      className={`overlay-companion ${mood} ${getSize()}`}
      onMouseEnter={() => mood !== "demon" && setOverlayInteractive(true)}
      onMouseLeave={() => mood !== "demon" && setOverlayInteractive(false)}
    >
      <div className="companion-body" onClick={onCompanionClick}>
        {mood !== "demon" && (
          <div className="companion-antenna">
            <div className="antenna-ball" />
          </div>
        )}

        <div className="companion-face">
          <div className="companion-eyes">
            <div className="eye left">
              <div className="pupil" />
            </div>
            {mood !== "demon" && (
              <div className="eye right">
                <div className="pupil" />
              </div>
            )}
          </div>
          {mood !== "demon" && <div className="companion-mouth" />}
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
        <span>{getRandomDialogue(mood)}</span>
      </div>

      {mood !== "happy" && currentWindow && !currentWindow.isStudying && (
        <div className="distraction-indicator">
          <span className="distraction-app">{currentWindow.owner}</span>
        </div>
      )}

      {mood === "demon" && (
        <div className="demon-apology-overlay">
          <form onSubmit={handleApologySubmit} className="apology-form-mini">
            <input
              type="text"
              value={apology}
              onChange={(e) => setApology(e.target.value)}
              placeholder='Type "i will focus"'
              autoFocus
              className="apology-input-mini"
            />
          </form>
        </div>
      )}

      {mood === "angry" && (
        <div className="anger-particles">
          <span className="particle">!</span>
          <span className="particle">!</span>
        </div>
      )}

      <style jsx>{`
        .overlay-companion {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .overlay-companion.idle {
          opacity: 0.6;
          cursor: pointer;
        }

        .overlay-companion.idle:hover {
          opacity: 1;
          transform: scale(1.1);
        }

        .companion-body-mini {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mini-eye {
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
        }

        .mini-dialogue {
          font-size: 10px;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .overlay-companion.small .companion-body {
          width: 60px;
          height: 60px;
        }

        .overlay-companion.medium .companion-body {
          width: 80px;
          height: 80px;
        }

        .overlay-companion.large .companion-body {
          width: 100px;
          height: 100px;
        }

        .overlay-companion.xlarge {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .overlay-companion.xlarge .companion-body {
          width: 150px;
          height: 150px;
        }

        .distraction-indicator {
          background: rgba(220, 38, 38, 0.9);
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 10px;
          color: white;
          max-width: 120px;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .demon-apology-overlay {
          margin-top: 8px;
        }

        .apology-form-mini {
          display: flex;
        }

        .apology-input-mini {
          width: 140px;
          padding: 8px 12px;
          font-size: 11px;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid #dc2626;
          border-radius: 8px;
          color: white;
          outline: none;
          text-align: center;
        }

        .apology-input-mini::placeholder {
          color: #999;
        }
      `}</style>
    </div>
  );
}
