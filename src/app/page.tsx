"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { Companion } from "@/components/Companion/Companion";
import { DemonOverlay } from "@/components/Companion/DemonOverlay";
import { TabSelector } from "@/components/StudyTabs/TabSelector";
import { PostureMonitor } from "@/components/PostureMonitor/PostureMonitor";
import { getUser } from "@/lib/supabase";

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
    let isMounted = true;
    const bootstrap = async () => {
      const stored = localStorage.getItem("focus-companion-user");
      if (!stored) {
        router.push("/login");
        if (isMounted) setLoading(false);
        return;
      }
      const parsed = JSON.parse(stored) as User;
      const profile = await getUser(parsed.id);
      if (!profile) {
        router.push("/login");
        if (isMounted) setLoading(false);
        return;
      }
      if (!profile.contract_signed_at) {
        router.push("/contract");
        if (isMounted) setLoading(false);
        return;
      }
      if (isMounted) {
        setUser(parsed);
      }
      await loadUserData(parsed.id);
      if (isMounted) setLoading(false);
    };
    void bootstrap();
    return () => {
      isMounted = false;
    };
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
        <p>Summoning...</p>
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
            background: radial-gradient(circle, #ffedd5 0%, #e11d48 100%);
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
            <h1 className="app-title">Infernal Companion</h1>
            <p className="app-description">
              Your infernal warden watches. Drift away and the pact bites back.
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
              <h3>Ritual Steps</h3>
              <ul>
                <li>Select a subject to pledge</li>
                <li>Start your session</li>
                <li>The warden watches</li>
                <li>Slouching or looking away too long draws wrath</li>
                <li>Leave the tab = face the demon</li>
                <li>Stay focused = earn XP</li>
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
                    ? "Etch your notes here... the pact is watching."
                    : "Start a session to open the grimoire..."
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
              <p className="mood-label">Warden Mood</p>
              <div className={`mood-display ${mood}`}>
                {mood === "happy" && "Compliant"}
                {mood === "suspicious" && "Watching"}
                {mood === "angry" && "Wrath"}
                {mood === "demon" && "INFERNAL"}
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
          color: var(--foreground);
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
          background: rgba(255, 90, 70, 0.32);
          top: -100px;
          left: -100px;
          animation: floaty 12s ease-in-out infinite;
        }
        .orb-2 {
          width: 400px;
          height: 400px;
          background: rgba(120, 16, 20, 0.35);
          top: 50%;
          right: -150px;
          animation: floaty 15s ease-in-out infinite reverse;
        }
        .orb-3 {
          width: 250px;
          height: 250px;
          background: rgba(255, 176, 97, 0.2);
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
          color: var(--foreground);
          margin: 0;
          line-height: 1.1;
          text-shadow: 0 10px 30px rgba(225, 29, 72, 0.35);
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
          color: var(--foreground);
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
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: var(--foreground);
          background: rgba(10, 5, 6, 0.4);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .ghost-btn:hover {
          border-color: rgba(225, 29, 72, 0.6);
          background: rgba(225, 29, 72, 0.2);
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
          box-shadow: 0 8px 24px var(--glow);
        }
        .session-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .session-btn.active { background: var(--accent-deep); }
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
          background: var(--card);
          border-radius: 20px;
          padding: 20px 24px;
          border: 1px solid var(--edge);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
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
          color: var(--foreground);
        }
        .tips-card li { margin-bottom: 6px; }
        .focus-area {
          background: var(--card);
          border-radius: 24px;
          padding: 28px;
          border: 1px solid var(--edge);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
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
          color: var(--foreground);
          margin: 0;
        }
        .session-indicator {
          padding: 8px 16px;
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 1px;
          color: var(--muted);
          background: #1f1415;
          border: 1px solid var(--edge);
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
          color: var(--foreground);
          background: var(--card-muted);
          border: 1px solid var(--edge);
          border-radius: 16px;
          resize: vertical;
          outline: none;
          transition: all 0.2s ease;
        }
        .notes-area:focus { border-color: var(--accent); }
        .notes-area:disabled { opacity: 0.6; cursor: not-allowed; }
        .notes-area::placeholder {
          color: rgba(247, 231, 214, 0.55);
        }
        .focus-stats {
          display: flex;
          justify-content: space-around;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--edge);
        }
        .focus-stat { text-align: center; }
        .focus-stat-value {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          color: var(--foreground);
        }
        .focus-stat-value.danger { color: var(--accent); }
        .focus-stat-label { font-size: 0.75rem; color: var(--muted); }
        .mood-indicator {
          margin-top: 24px;
          padding: 20px;
          background: #120b0c;
          border: 1px solid var(--edge);
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
        .mood-display.happy { color: #facc15; }
        .mood-display.suspicious { color: #f97316; }
        .mood-display.angry { color: #f87171; animation: shake 0.3s ease-in-out infinite; }
        .mood-display.demon { color: var(--accent); text-transform: uppercase; letter-spacing: 4px; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
