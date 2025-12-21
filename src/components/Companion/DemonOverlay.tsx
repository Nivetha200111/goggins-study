"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import "./DemonOverlay.css";

const APOLOGY_PHRASE = "i will focus";

export function DemonOverlay() {
  const { mood, resetToHappy, addDistraction, isDemonModeEnabled } = useGameStore();
  const [apology, setApology] = useState("");
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (apology.toLowerCase().trim() === APOLOGY_PHRASE) {
      resetToHappy();
      setApology("");
      setAttempts(0);
      document.title = "The Ignorant Apprentice";
    } else {
      setShake(true);
      setAttempts((a) => a + 1);
      setTimeout(() => setShake(false), 500);

      // After 3 failed attempts, add another distraction
      if (attempts >= 2) {
        addDistraction();
        setAttempts(0);
      }
    }
  };

  // Glitch effect on mount
  useEffect(() => {
    if (mood === "demon" && isDemonModeEnabled) {
      document.body.classList.add("demon-active");
    } else {
      document.body.classList.remove("demon-active");
    }
    return () => {
      document.body.classList.remove("demon-active");
    };
  }, [mood, isDemonModeEnabled]);

  if (mood !== "demon" || !isDemonModeEnabled) {
    return null;
  }

  return (
    <div className="demon-overlay">
      {/* Glitch background lines */}
      <div className="glitch-lines">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="glitch-line" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>

      {/* The Eye */}
      <div className="demon-eye-container">
        <div className="demon-eye">
          <div className="demon-iris">
            <div className="demon-pupil" />
          </div>
        </div>
        <div className="eye-veins">
          <div className="vein v1" />
          <div className="vein v2" />
          <div className="vein v3" />
          <div className="vein v4" />
        </div>
      </div>

      {/* Message */}
      <div className="demon-message">
        <h1 className="glitch-text" data-text="YOU LEFT ME.">
          YOU LEFT ME.
        </h1>
        <p className="demon-subtext">
          Type <span className="highlight">&quot;{APOLOGY_PHRASE}&quot;</span>{" "}
          to be forgiven.
        </p>
      </div>

      {/* Apology Input */}
      <form onSubmit={handleSubmit} className={`apology-form ${shake ? "shake" : ""}`}>
        <input
          type="text"
          value={apology}
          onChange={(e) => setApology(e.target.value)}
          placeholder="Type your apology..."
          autoFocus
          autoComplete="off"
          className="apology-input"
        />
        <button type="submit" className="apology-submit">
          APOLOGIZE
        </button>
      </form>

      {/* Attempt counter */}
      {attempts > 0 && (
        <p className="attempt-warning">
          Wrong. {3 - attempts} attempts remaining before another distraction is recorded.
        </p>
      )}

      {/* Creepy corner messages */}
      <div className="corner-message top-left">I WAS WATCHING</div>
      <div className="corner-message top-right">ALWAYS WATCHING</div>
      <div className="corner-message bottom-left">YOU CAN&apos;T ESCAPE</div>
      <div className="corner-message bottom-right">FOCUS OR SUFFER</div>
    </div>
  );
}
