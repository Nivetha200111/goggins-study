"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { Companion } from "@/components/Companion/Companion";
import { DemonOverlay } from "@/components/Companion/DemonOverlay";
import { TabSelector } from "@/components/StudyTabs/TabSelector";
import { PostureMonitor } from "@/components/PostureMonitor/PostureMonitor";

interface User {
  id: string;
  username: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    tabs,
    activeTabId,
    isSessionActive,
    startSession,
    endSession,
    totalXp,
    level,
    streak,
    mood,
    loadUserData,
    isLoading,
    updateFocusTime,
    notesByTab,
    setNotes,
  } = useGameStore();

  useEffect(() => {
    const stored = localStorage.getItem("focus-companion-user");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      loadUserData(parsed.id);
    } else {
      router.push("/login");
    }
    setLoading(false);
  }, [router, loadUserData]);

  useEffect(() => {
    if (!isSessionActive) return;
    const interval = setInterval(() => {
      updateFocusTime();
    }, 60000);
    return () => clearInterval(interval);
  }, [isSessionActive, updateFocusTime]);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const notesValue = activeTabId ? notesByTab[activeTabId] ?? "" : "";
  const canStartSession = activeTabId !== null;

  const handleSignOut = () => {
    if (isSessionActive) {
      endSession();
    }
    localStorage.removeItem("focus-companion-user");
    router.push("/login");
  };

  if (loading || isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-eye" />
        <p>Loading...</p>
        <style jsx>{`
          .loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            color: var(--muted);
          }
          .loading-eye {
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, #fff 0%, #667eea 100%);
            border-radius: 50%;
            margin-bottom: 16px;
            animation: pulse 1.5s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="app-container">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />

      <main className="main-content">
        <header className="app-header">
          <div className="header-left">
            <p className="app-subtitle">Welcome back, {user.username}</p>
            <h1 className="app-title">Focus Companion</h1>
            <p className="app-description">
              Your robotic friend watches over you. Drift away, and face the consequences.
            </p>
          </div>

          <div className="header-right">
            <div className="stats-bar">
              <div className="stat-item">
                <span className="stat-label">Level</span>
                <span className="stat-value">{level}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">XP</span>
                <span className="stat-value">{totalXp}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Streak</span>
                <span className="stat-value streak">{streak} days</span>
              </div>
            </div>

            <div className="header-actions">
              <Link href="/settings" className="ghost-btn">
                Settings
              </Link>
              <button className="ghost-btn" onClick={handleSignOut}>
                Sign Out
              </button>
              <button
                onClick={isSessionActive ? endSession : startSession}
                disabled={!canStartSession && !isSessionActive}
                className={`session-btn ${isSessionActive ? "active" : ""}`}
              >
                {isSessionActive ? "End Session" : "Start Session"}
              </button>
            </div>
          </div>
        </header>

        <div className="content-grid">
          <div className="left-column">
            <TabSelector />

            <div className="tips-card">
              <h3>How it works</h3>
              <ul>
                <li>Select a subject to focus on</li>
                <li>Start your session</li>
                <li>Your companion watches you</li>
                <li>Slouching or looking away too long triggers a warning</li>
                <li>Leave the tab = face the demon</li>
                <li>Stay focused = earn XP!</li>
              </ul>
            </div>
          </div>

          <div className="right-column">
            <div className="focus-area">
              <div className="focus-header">
                <div>
                  <p className="focus-label">Current Focus</p>
                  <h2 className="focus-subject">
                    {activeTab ? activeTab.name : "Select a subject"}
                  </h2>
                </div>
                <div
                  className={`session-indicator ${isSessionActive ? "active" : ""}`}
                  style={
                    isSessionActive && activeTab
                      ? { backgroundColor: activeTab.color }
                      : undefined
                  }
                >
                  {isSessionActive ? "ACTIVE" : "PAUSED"}
                </div>
              </div>

              <textarea
                className="notes-area"
                value={notesValue}
                onChange={(e) => {
                  if (activeTabId) {
                    setNotes(activeTabId, e.target.value);
                  }
                }}
                placeholder={
                  isSessionActive
                    ? "Take notes here while you study... Your companion is watching!"
                    : "Start a session to begin taking notes..."
                }
                disabled={!isSessionActive || !activeTabId}
              />

              {activeTab && (
                <div className="focus-stats">
                  <div className="focus-stat">
                    <span className="focus-stat-value">
                      {activeTab.focusMinutes.toFixed(0)}
                    </span>
                    <span className="focus-stat-label">Minutes</span>
                  </div>
                  <div className="focus-stat">
                    <span className="focus-stat-value">{activeTab.xp}</span>
                    <span className="focus-stat-label">XP Earned</span>
                  </div>
                  <div className="focus-stat">
                    <span className="focus-stat-value danger">
                      {activeTab.distractions}
                    </span>
                    <span className="focus-stat-label">Distractions</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mood-indicator">
              <p className="mood-label">Companion Mood</p>
              <div className={`mood-display ${mood}`}>
                {mood === "happy" && "Happy"}
                {mood === "suspicious" && "Suspicious..."}
                {mood === "angry" && "ANGRY!"}
                {mood === "demon" && "DEMON MODE"}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Companion />
      <PostureMonitor />
      <DemonOverlay />

      <style jsx>{`
        .app-container {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          padding: 32px;
        }
        .bg-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(60px);
        }
        .orb-1 {
          width: 300px;
          height: 300px;
          background: rgba(255, 107, 74, 0.3);
          top: -100px;
          left: -100px;
          animation: floaty 12s ease-in-out infinite;
        }
        .orb-2 {
          width: 400px;
          height: 400px;
          background: rgba(102, 126, 234, 0.2);
          top: 50%;
          right: -150px;
          animation: floaty 15s ease-in-out infinite reverse;
        }
        .orb-3 {
          width: 250px;
          height: 250px;
          background: rgba(255, 210, 74, 0.25);
          bottom: -80px;
          left: 30%;
          animation: floaty 10s ease-in-out infinite;
        }
        @keyframes floaty {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .main-content {
          position: relative;
          max-width: 1200px;
          margin: 0 auto;
        }
        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 32px;
          margin-bottom: 40px;
          flex-wrap: wrap;
        }
        .header-left { flex: 1; min-width: 280px; }
        .app-subtitle {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: var(--muted);
          margin: 0 0 8px 0;
        }
        .app-title {
          font-size: 3rem;
          font-weight: 700;
          color: var(--ink);
          margin: 0;
          line-height: 1.1;
        }
        .app-description {
          font-size: 1rem;
          color: var(--muted);
          margin: 12px 0 0 0;
          max-width: 400px;
        }
        .header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 16px;
        }
        .stats-bar { display: flex; gap: 24px; }
        .stat-item { text-align: center; }
        .stat-label {
          display: block;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--muted);
        }
        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--ink);
        }
        .stat-value.streak { color: var(--accent); }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ghost-btn {
          padding: 10px 18px;
          border-radius: 999px;
          border: 2px solid var(--ink);
          color: var(--ink);
          background: transparent;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .session-btn {
          padding: 14px 32px;
          font-size: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: white;
          background: var(--accent);
          border: none;
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .session-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(255, 107, 74, 0.4);
        }
        .session-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .session-btn.active { background: var(--ink); }
        .content-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 32px;
        }
        @media (max-width: 900px) {
          .content-grid { grid-template-columns: 1fr; }
        }
        .left-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .tips-card {
          background: white;
          border-radius: 20px;
          padding: 20px 24px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }
        .tips-card h3 {
          font-size: 0.875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--muted);
          margin: 0 0 12px 0;
        }
        .tips-card ul {
          margin: 0;
          padding: 0 0 0 20px;
          font-size: 0.875rem;
          color: var(--ink);
        }
        .tips-card li { margin-bottom: 6px; }
        .focus-area {
          background: white;
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }
        .focus-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .focus-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--muted);
          margin: 0 0 4px 0;
        }
        .focus-subject {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--ink);
          margin: 0;
        }
        .session-indicator {
          padding: 8px 16px;
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 1px;
          color: var(--muted);
          background: #f1f1f1;
          border-radius: 20px;
          transition: all 0.3s ease;
        }
        .session-indicator.active {
          color: white;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        .notes-area {
          width: 100%;
          min-height: 200px;
          padding: 16px;
          font-size: 0.95rem;
          font-family: inherit;
          color: var(--ink);
          background: var(--background);
          border: 2px solid transparent;
          border-radius: 16px;
          resize: vertical;
          outline: none;
          transition: all 0.2s ease;
        }
        .notes-area:focus { border-color: var(--accent); }
        .notes-area:disabled { opacity: 0.6; cursor: not-allowed; }
        .focus-stats {
          display: flex;
          justify-content: space-around;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        .focus-stat { text-align: center; }
        .focus-stat-value {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          color: var(--ink);
        }
        .focus-stat-value.danger { color: #dc2626; }
        .focus-stat-label { font-size: 0.75rem; color: var(--muted); }
        .mood-indicator {
          margin-top: 24px;
          padding: 20px;
          background: var(--ink);
          border-radius: 16px;
          text-align: center;
        }
        .mood-label {
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: rgba(255, 255, 255, 0.6);
          margin: 0 0 8px 0;
        }
        .mood-display {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          transition: all 0.3s ease;
        }
        .mood-display.happy { color: #4ade80; }
        .mood-display.suspicious { color: #fbbf24; }
        .mood-display.angry { color: #f87171; animation: shake 0.3s ease-in-out infinite; }
        .mood-display.demon { color: #dc2626; text-transform: uppercase; letter-spacing: 4px; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
