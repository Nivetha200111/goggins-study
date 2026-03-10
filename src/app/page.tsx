"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TabSelector } from "@/components/StudyTabs/TabSelector";
import { useGameStore } from "@/store/gameStore";
import { getUser } from "@/lib/supabase";

interface User {
  id: string;
  username: string;
}

function formatDuration(totalMs: number): string {
  const clamped = Math.max(0, totalMs);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) {
    return `${Math.round(totalMinutes)}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}h ${minutes}m`;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);

  const {
    tabs,
    activeTabId,
    isSessionActive,
    startSession,
    endSession,
    totalXp,
    level,
    streak,
    loadUserData,
    isLoading,
    updateFocusTime,
    notesByTab,
    setNotes,
    sessionGoalMinutes,
    setSessionGoalMinutes,
    sessionStartedAt,
    sessionGoalEndsAt,
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
  }, [loadUserData, router]);

  useEffect(() => {
    if (!isSessionActive) return;

    const interval = setInterval(() => {
      updateFocusTime();
    }, 60000);

    return () => clearInterval(interval);
  }, [isSessionActive, updateFocusTime]);

  useEffect(() => {
    if (!isSessionActive) return;

    const frame = window.requestAnimationFrame(() => {
      setNow(Date.now());
    });
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.cancelAnimationFrame(frame);
      clearInterval(interval);
    };
  }, [isSessionActive]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const notesValue = activeTabId ? notesByTab[activeTabId] ?? "" : "";
  const canStartSession = Boolean(activeTabId);

  const totalPlannedMs = sessionGoalMinutes * 60000;
  const elapsedMs =
    isSessionActive && sessionStartedAt ? Math.max(0, now - sessionStartedAt) : 0;
  const remainingMs =
    isSessionActive && sessionGoalEndsAt
      ? Math.max(0, sessionGoalEndsAt - now)
      : totalPlannedMs;
  const progress = totalPlannedMs > 0 ? Math.min(1, elapsedMs / totalPlannedMs) : 0;

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
        <div className="loading-sprite" />
        <p>Booting pixel arena...</p>
        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            display: grid;
            place-items: center;
            gap: 18px;
            color: var(--accent);
            text-align: center;
          }

          .loading-sprite {
            width: 72px;
            height: 72px;
            background:
              linear-gradient(90deg, transparent 0 18px, var(--accent) 18px 54px, transparent 54px 100%),
              linear-gradient(180deg, transparent 0 18px, var(--accent-2) 18px 54px, transparent 54px 100%),
              var(--panel);
            border: 4px solid var(--edge);
            box-shadow: 6px 6px 0 var(--shadow);
            animation: blink 0.9s steps(2, jump-none) infinite;
          }

          p {
            margin: 0;
            font-size: 1.6rem;
          }

          @keyframes blink {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="dashboard-page">
      <div className="stars" />
      <div className="terrain terrain-back" />
      <div className="terrain terrain-front" />

      <main className="dashboard-shell">
        <header className="hero pixel-panel">
          <div className="hero-copy">
            <p className="hero-label">Player One: {user.username}</p>
            <h1>Local Focus Quest</h1>
            <p className="hero-text">
              Retro HUD outside, strict agent underneath. Chrome stays pinned with a
              timer, reads visible study text and typed snippets, and barks the moment
              you drift before the run is complete.
            </p>
          </div>

          <div className="hero-actions">
            <div className="stats-bar">
              <div className="stat-tile">
                <span className="stat-label">Lvl</span>
                <strong>{level}</strong>
              </div>
              <div className="stat-tile">
                <span className="stat-label">XP</span>
                <strong>{totalXp}</strong>
              </div>
              <div className="stat-tile">
                <span className="stat-label">Streak</span>
                <strong>{streak}d</strong>
              </div>
            </div>

            <div className="button-row">
              <Link href="/settings" className="pixel-btn alt">
                Options
              </Link>
              <button type="button" className="pixel-btn alt" onClick={handleSignOut}>
                Exit
              </button>
              <button
                type="button"
                className={`pixel-btn ${isSessionActive ? "danger" : "primary"}`}
                onClick={isSessionActive ? endSession : startSession}
                disabled={!canStartSession && !isSessionActive}
              >
                {isSessionActive ? "Stop Run" : "Start Run"}
              </button>
            </div>
          </div>
        </header>

        <section className="marquee-row">
          <div className="marquee pixel-panel">
            <span className="marquee-title">Browser agent</span>
            <span>Chrome title + URL + visible text + typed fields</span>
          </div>
          <div className="marquee pixel-panel">
            <span className="marquee-title">Pinned clock</span>
            <span>Always-on HUD overlay while the run is active</span>
          </div>
          <div className="marquee pixel-panel">
            <span className="marquee-title">Mobile alert</span>
            <span>Android companion warns on Instagram, LinkedIn, WhatsApp</span>
          </div>
        </section>

        <div className="content-grid">
          <div className="left-column">
            <TabSelector />

            <section className="pixel-panel info-card">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Quest Setup</p>
                  <h2>Stage Timer</h2>
                </div>
                <span className={`badge ${isSessionActive ? "live" : ""}`}>
                  {isSessionActive ? "Live" : "Idle"}
                </span>
              </div>

              <label className="goal-field">
                <span>Goal Minutes</span>
                <input
                  type="number"
                  min={15}
                  max={480}
                  step={5}
                  value={sessionGoalMinutes}
                  disabled={isSessionActive}
                  onChange={(event) =>
                    setSessionGoalMinutes(Number(event.target.value || sessionGoalMinutes))
                  }
                />
              </label>

              <div className="flavor-copy">
                <p>The dashboard syncs the active quest, sound, timer, and allowlist.</p>
                <p>The extension can still keep score even if this tab is not visible.</p>
              </div>
            </section>

            <section className="pixel-panel info-card">
              <p className="panel-kicker">Rulebook</p>
              <h2>How you lose HP</h2>
              <ul className="rule-list">
                <li>Typing text with weak overlap against your topic keywords.</li>
                <li>Opening blocked distractor domains before the timer ends.</li>
                <li>Writing obvious social chatter instead of study material.</li>
                <li>Landing on pages that fail both allowlist and relevance checks.</li>
              </ul>
            </section>
          </div>

          <div className="right-column">
            <section className="pixel-panel timer-card">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Run HUD</p>
                  <h2>{activeTab?.name ?? "Choose a quest slot"}</h2>
                </div>
                <span className="badge goal">{sessionGoalMinutes} min</span>
              </div>

              <div className="timer-value">
                {isSessionActive ? formatDuration(remainingMs) : formatDuration(totalPlannedMs)}
              </div>

              <div className="timer-meta">
                <span>Elapsed {formatDuration(elapsedMs)}</span>
                <span>
                  {isSessionActive
                    ? remainingMs > 0
                      ? "Quest active"
                      : "Quest clear"
                    : "Waiting for launch"}
                </span>
              </div>

              <div className="progress-track" aria-hidden="true">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.max(4, progress * 100)}%` }}
                />
              </div>

              <div className="timer-stats">
                <div>
                  <span className="mini-label">Study Time</span>
                  <strong>{activeTab ? formatMinutes(activeTab.focusMinutes) : "0m"}</strong>
                </div>
                <div>
                  <span className="mini-label">Misses</span>
                  <strong>{activeTab?.distractions ?? 0}</strong>
                </div>
                <div>
                  <span className="mini-label">Quest XP</span>
                  <strong>{activeTab?.xp ?? 0}</strong>
                </div>
              </div>
            </section>

            <section className="pixel-panel notes-card">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Notebook</p>
                  <h2>Topic Memory</h2>
                </div>
                <span className="badge note">
                  {activeTab ? "Auto save" : "Select subject"}
                </span>
              </div>

              <textarea
                className="notes-area"
                value={notesValue}
                onChange={(event) => {
                  if (activeTabId) {
                    setNotes(activeTabId, event.target.value);
                  }
                }}
                placeholder="Drop the key terms the Chrome agent should keep hearing in your work."
                disabled={!activeTabId}
              />
            </section>

            <section className="pixel-panel info-card">
              <p className="panel-kicker">Mobile Quest</p>
              <h2>Android sidecar is scaffolded</h2>
              <p className="flavor-single">
                The phone app source in `android-app/` watches foreground usage and
                shouts when Instagram, LinkedIn, or WhatsApp open before your study run
                finishes.
              </p>
            </section>
          </div>
        </div>
      </main>

      <style jsx>{`
        .dashboard-page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          padding: 18px 12px 64px;
        }

        .stars,
        .terrain {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .stars {
          background-image:
            radial-gradient(circle, rgba(255, 255, 255, 0.85) 0 1px, transparent 1px),
            radial-gradient(circle, rgba(255, 216, 74, 0.75) 0 1px, transparent 1px),
            radial-gradient(circle, rgba(70, 216, 255, 0.75) 0 1px, transparent 1px);
          background-size: 140px 140px, 210px 210px, 280px 280px;
          background-position: 20px 18px, 100px 60px, 60px 120px;
          opacity: 0.6;
        }

        .terrain {
          bottom: 0;
          top: auto;
          height: 240px;
          image-rendering: pixelated;
        }

        .terrain-back {
          background:
            linear-gradient(
              135deg,
              transparent 0 12%,
              #30185b 12% 18%,
              transparent 18% 28%,
              #30185b 28% 38%,
              transparent 38% 48%,
              #30185b 48% 60%,
              transparent 60% 100%
            );
          opacity: 0.78;
        }

        .terrain-front {
          height: 180px;
          background:
            linear-gradient(
              135deg,
              transparent 0 8%,
              #13091f 8% 16%,
              transparent 16% 22%,
              #13091f 22% 34%,
              transparent 34% 40%,
              #13091f 40% 54%,
              transparent 54% 64%,
              #13091f 64% 78%,
              transparent 78% 100%
            );
          opacity: 0.95;
        }

        .dashboard-shell {
          position: relative;
          z-index: 1;
          width: min(1240px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 16px;
        }

        .pixel-panel {
          background: linear-gradient(180deg, var(--panel-strong) 0%, var(--panel) 100%);
          border: 4px solid var(--edge);
          box-shadow: var(--shadow-strong);
          padding: 18px;
        }

        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
          gap: 18px;
          align-items: end;
        }

        .hero-label,
        .panel-kicker,
        .stat-label,
        .mini-label,
        .marquee-title {
          margin: 0 0 8px;
          color: var(--accent);
          font-size: 0.74rem;
          line-height: 1.7;
        }

        h1,
        h2 {
          margin: 0;
          line-height: 1.35;
        }

        h1 {
          max-width: 12ch;
          font-size: clamp(1.55rem, 3.2vw, 2.8rem);
          color: #fff7ba;
          text-shadow: 4px 4px 0 #2f1a57;
        }

        h2 {
          font-size: clamp(1rem, 2vw, 1.35rem);
          color: #fff4d1;
        }

        .hero-text,
        .flavor-copy p,
        .flavor-single {
          margin: 14px 0 0;
          font-size: 1.45rem;
          line-height: 1.15;
          color: var(--foreground);
          max-width: 42ch;
        }

        .hero-actions {
          display: grid;
          gap: 14px;
        }

        .stats-bar,
        .timer-stats,
        .marquee-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .stat-tile,
        .marquee {
          background: rgba(10, 4, 20, 0.45);
          border: 4px solid var(--edge);
          box-shadow: var(--shadow-soft);
          padding: 14px;
        }

        .stat-tile strong {
          display: block;
          font-size: 2.2rem;
          color: var(--accent-3);
          font-family: var(--font-pixel-body), monospace;
          letter-spacing: 0.02em;
        }

        .marquee {
          display: grid;
          gap: 6px;
          align-content: start;
          min-height: 96px;
          font-size: 1.35rem;
          line-height: 1.1;
        }

        .marquee-title {
          color: var(--accent-2);
        }

        .button-row {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 10px;
        }

        .pixel-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 12px 16px;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          text-decoration: none;
          background: var(--accent);
          color: #140b23;
          cursor: pointer;
          transition: transform 0.08s steps(2, jump-none), box-shadow 0.08s steps(2, jump-none);
        }

        .pixel-btn.alt {
          background: var(--accent-3);
        }

        .pixel-btn.danger {
          background: var(--danger);
        }

        .pixel-btn:hover:not(:disabled) {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0 var(--shadow);
        }

        .pixel-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .content-grid {
          display: grid;
          grid-template-columns: minmax(320px, 0.42fr) minmax(0, 0.58fr);
          gap: 16px;
        }

        .left-column,
        .right-column {
          display: grid;
          gap: 16px;
          align-content: start;
        }

        .info-card {
          display: grid;
          gap: 14px;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          min-height: 38px;
          padding: 8px 12px;
          border: 4px solid var(--edge);
          background: rgba(10, 4, 20, 0.55);
          color: var(--muted);
          box-shadow: 4px 4px 0 var(--shadow);
          font-size: 0.72rem;
        }

        .badge.live {
          color: #10200d;
          background: var(--success);
        }

        .badge.goal {
          color: #201200;
          background: var(--accent);
        }

        .badge.note {
          color: #061926;
          background: var(--accent-3);
        }

        .goal-field {
          display: grid;
          gap: 8px;
        }

        .goal-field span {
          font-size: 0.74rem;
          color: var(--accent-2);
          font-family: var(--font-pixel-heading), monospace;
          text-transform: uppercase;
        }

        .goal-field input,
        .notes-area {
          width: 100%;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          background: #f2f0ff;
          color: #13091f;
          padding: 12px 14px;
          font-size: 1.55rem;
          line-height: 1.1;
        }

        .goal-field input:disabled,
        .notes-area:disabled {
          opacity: 0.7;
        }

        .rule-list {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 10px;
          font-size: 1.4rem;
          line-height: 1.08;
        }

        .timer-card {
          background:
            linear-gradient(180deg, rgba(72, 42, 130, 0.96) 0%, rgba(39, 20, 82, 0.98) 100%);
        }

        .timer-value {
          margin-top: 16px;
          font-family: var(--font-pixel-body), monospace;
          font-size: clamp(4.6rem, 10vw, 7.4rem);
          line-height: 0.9;
          color: #fff7ba;
          text-shadow: 6px 6px 0 #201040;
        }

        .timer-meta {
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 1.3rem;
          line-height: 1.1;
          color: var(--muted);
        }

        .progress-track {
          margin-top: 14px;
          height: 22px;
          border: 4px solid var(--edge);
          background:
            repeating-linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.08) 0 14px,
              transparent 14px 28px
            ),
            rgba(10, 4, 20, 0.5);
          box-shadow: 4px 4px 0 var(--shadow);
        }

        .progress-fill {
          height: 100%;
          background:
            repeating-linear-gradient(
              90deg,
              #ffd84a 0 14px,
              #ffb82e 14px 28px
            );
          transition: width 0.25s linear;
        }

        .timer-stats div {
          background: rgba(10, 4, 20, 0.45);
          border: 4px solid var(--edge);
          box-shadow: var(--shadow-soft);
          padding: 12px;
          display: grid;
          gap: 8px;
        }

        .timer-stats strong {
          font-family: var(--font-pixel-body), monospace;
          font-size: 2rem;
          color: var(--accent-3);
        }

        .notes-area {
          margin-top: 14px;
          min-height: 280px;
          resize: vertical;
        }

        .flavor-copy,
        .flavor-single {
          display: grid;
          gap: 8px;
        }

        .flavor-copy p,
        .flavor-single {
          margin: 0;
        }

        @media (max-width: 980px) {
          .hero,
          .content-grid,
          .marquee-row {
            grid-template-columns: 1fr;
          }

          .button-row {
            justify-content: flex-start;
          }
        }

        @media (max-width: 640px) {
          .dashboard-page {
            padding: 12px 8px 48px;
          }

          .stats-bar,
          .timer-stats {
            grid-template-columns: 1fr;
          }

          .panel-header,
          .timer-meta {
            flex-direction: column;
            align-items: flex-start;
          }

          .pixel-panel {
            padding: 14px;
          }

          .hero-text,
          .rule-list,
          .flavor-copy p,
          .flavor-single,
          .timer-meta,
          .marquee {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
}
