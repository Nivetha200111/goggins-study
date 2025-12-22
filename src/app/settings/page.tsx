"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useGameStore } from "@/store/gameStore";
import Link from "next/link";

export default function SettingsPage() {
  const {
    isDemonModeEnabled,
    toggleDemonMode,
    isMonitoringEnabled,
    toggleMonitoring,
    isPostureMonitoringEnabled,
    togglePostureMonitoring,
    isPostureDebugEnabled,
    togglePostureDebug,
    isSoundEnabled,
    toggleSound,
    whitelist,
    addWhitelistDomain,
    removeWhitelistDomain,
    addWhitelistKeyword,
    removeWhitelistKeyword,
  } = useGameStore();

  const [domainInput, setDomainInput] = useState("");
  const [domainStatus, setDomainStatus] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  const handleAddDomain = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = domainInput.trim();
    if (!trimmed) return;
    const added = addWhitelistDomain(trimmed);
    if (!added) {
      setDomainStatus("Enter a valid, new domain or URL.");
      return;
    }
    setDomainStatus("Added.");
    setDomainInput("");
  };

  const handleAddKeyword = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = keywordInput.trim().toLowerCase();
    if (!trimmed) return;
    addWhitelistKeyword(trimmed);
    setKeywordInput("");
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div>
          <p className="settings-kicker">Infernal Companion</p>
          <h1>Ritual Settings</h1>
          <p className="settings-subtitle">
            Tune monitoring, voices, and demon mode behavior.
          </p>
        </div>
        <Link href="/" className="back-link">
          Back to the ritual
        </Link>
      </header>

      <section className="settings-card">
        <h2>Monitoring</h2>
        <p className="settings-help">
          When bound, the companion watches your activity and tightens its grip when you stop.
        </p>
        <div className="toggle-row">
          <label className="toggle-label" htmlFor="monitoring-toggle">
            Enable Activity Monitoring
          </label>
          <label className="switch">
            <input
              type="checkbox"
              id="monitoring-toggle"
              checked={isMonitoringEnabled}
              onChange={toggleMonitoring}
            />
            <span className="slider"></span>
          </label>
        </div>
      </section>

      <section className="settings-card">
        <h2>Posture Monitoring</h2>
        <p className="settings-help">
          Uses your camera to spot slouching, wandering eyes, or a phone in hand.
        </p>
        <div className="toggle-row">
          <label className="toggle-label" htmlFor="posture-toggle">
            Enable Posture Monitoring
          </label>
          <label className="switch">
            <input
              type="checkbox"
              id="posture-toggle"
              checked={isPostureMonitoringEnabled}
              onChange={togglePostureMonitoring}
            />
            <span className="slider"></span>
          </label>
        </div>
        <p className="settings-help">
          Camera access is only used on-device for real-time checks.
        </p>
        <p className="settings-help">
          If a phone is detected, alerts continue until the phone is gone and both hands are up.
        </p>
        <div className="toggle-row">
          <label className="toggle-label" htmlFor="posture-debug-toggle">
            Show Infernal Popout
          </label>
          <label className="switch">
            <input
              type="checkbox"
              id="posture-debug-toggle"
              checked={isPostureDebugEnabled}
              onChange={togglePostureDebug}
            />
            <span className="slider"></span>
          </label>
        </div>
        <p className="settings-help">
          Shows a floating warden and camera preview with live posture status.
        </p>
      </section>

      <section className="settings-card">
        <h2>Voice Alerts</h2>
        <p className="settings-help">
          When enabled, the warden will roar when you drift.
        </p>
        <div className="toggle-row">
          <label className="toggle-label" htmlFor="sound-toggle">
            Enable Voice Shouting
          </label>
          <label className="switch">
            <input
              type="checkbox"
              id="sound-toggle"
              checked={isSoundEnabled}
              onChange={toggleSound}
            />
            <span className="slider"></span>
          </label>
        </div>
      </section>

      <section className="settings-card">
        <h2>Whitelist Sites</h2>
        <p className="settings-help">
          Domains etched in your notes count as on-topic and avoid demon mode.
        </p>
        <form onSubmit={handleAddDomain} className="whitelist-form">
          <input
            type="text"
            value={domainInput}
            onChange={(e) => {
              setDomainInput(e.target.value);
              setDomainStatus("");
            }}
            placeholder="Add a domain or URL (e.g. developer.mozilla.org)"
            className="whitelist-input"
          />
          <button type="submit" className="whitelist-add">
            Add
          </button>
        </form>
        {domainStatus ? <p className="whitelist-status">{domainStatus}</p> : null}
        {whitelist.domains.length === 0 ? (
          <p className="whitelist-empty">No sites yet. Add one to get started.</p>
        ) : (
          <div className="whitelist-tags">
            {whitelist.domains.map((domain) => (
              <button
                key={domain}
                type="button"
                className="whitelist-tag"
                onClick={() => removeWhitelistDomain(domain)}
                aria-label={`Remove ${domain}`}
              >
                {domain} ✕
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="settings-card">
        <h2>Whitelist Keywords</h2>
        <p className="settings-help">
          Notes that include these keywords count as on-topic and avoid demon mode.
        </p>
        <form onSubmit={handleAddKeyword} className="whitelist-form">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder="Add a keyword (e.g. calculus, react)"
            className="whitelist-input"
          />
          <button type="submit" className="whitelist-add">
            Add
          </button>
        </form>
        {whitelist.keywords.length === 0 ? (
          <p className="whitelist-empty">No keywords yet. Add one to get started.</p>
        ) : (
          <div className="whitelist-tags">
            {whitelist.keywords.map((keyword) => (
              <button
                key={keyword}
                type="button"
                className="whitelist-tag"
                onClick={() => removeWhitelistKeyword(keyword)}
                aria-label={`Remove ${keyword}`}
              >
                {keyword} ✕
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="settings-card">
        <h2>Demon Mode</h2>
        <p className="settings-help">
          When enabled, leaving the tab triggers a full-screen lockout until you apologize.
        </p>
        <div className="toggle-row">
          <label className="toggle-label" htmlFor="demon-mode-toggle">
            Enable Demon Mode
          </label>
          <label className="switch">
            <input
              type="checkbox"
              id="demon-mode-toggle"
              checked={isDemonModeEnabled}
              onChange={toggleDemonMode}
            />
            <span className="slider"></span>
          </label>
        </div>
      </section>

      <section className="settings-card info-card">
        <h2>How It Works</h2>
        <ul className="info-list">
          <li><strong>Activity Monitoring:</strong> Detects when you stop moving your mouse or typing</li>
          <li><strong>Posture Monitoring:</strong> On-device checks for slouching, looking away, looking down, or phone use</li>
          <li><strong>Tab Detection:</strong> Knows when you leave the study tab</li>
          <li><strong>Voice Alerts:</strong> Uses browser speech synthesis to shout at you</li>
          <li><strong>Pop Out:</strong> Opens a floating window that stays visible across apps (Chrome 116+)</li>
          <li><strong>Demon Mode:</strong> Full-screen lockout requiring you to type &quot;i will focus&quot; to be released</li>
        </ul>
      </section>

      <section className="settings-card info-card">
        <h2>Privacy</h2>
        <ul className="info-list">
          <li>All data is stored locally in your browser</li>
          <li>No data is sent to any server</li>
          <li>Camera frames are processed locally and never saved</li>
          <li>Your study sessions are private</li>
        </ul>
      </section>

      <style jsx>{`
        .settings-page {
          min-height: 100vh;
          padding: 32px;
          background: transparent;
          color: var(--foreground);
          max-width: 800px;
          margin: 0 auto;
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-bottom: 32px;
        }

        .settings-kicker {
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.75rem;
          color: var(--muted);
          margin: 0;
        }

        h1 {
          font-size: 2.5rem;
          margin: 8px 0;
          color: var(--foreground);
        }

        .settings-subtitle {
          max-width: 520px;
          color: var(--muted);
          margin: 0;
        }

        .back-link {
          padding: 10px 18px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: var(--foreground);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.875rem;
          white-space: nowrap;
          background: rgba(10, 5, 6, 0.4);
        }

        .settings-card {
          background: var(--card);
          border-radius: 20px;
          padding: 24px;
          border: 1px solid var(--edge);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
          margin-bottom: 20px;
        }

        .info-card {
          background: #120a0b;
        }

        .settings-card h2 {
          margin: 0 0 8px;
          color: var(--foreground);
          font-size: 1.25rem;
        }

        .settings-help {
          color: var(--muted);
          font-size: 0.875rem;
          margin-bottom: 16px;
        }

        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .whitelist-form {
          display: flex;
          gap: 12px;
          margin-top: 12px;
        }

        .whitelist-input {
          flex: 1;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid var(--edge);
          background: #120b0c;
          font-size: 0.95rem;
          color: var(--foreground);
          outline: none;
        }

        .whitelist-input:focus {
          border-color: var(--accent);
        }
        .whitelist-input::placeholder {
          color: rgba(247, 231, 214, 0.55);
        }

        .whitelist-add {
          padding: 10px 18px;
          border-radius: 12px;
          border: none;
          background: var(--accent);
          color: white;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(225, 29, 72, 0.35);
        }

        .whitelist-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .whitelist-tag {
          padding: 6px 12px;
          border-radius: 999px;
          border: none;
          background: #2a1112;
          color: var(--foreground);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }

        .whitelist-status {
          margin: 8px 0 0;
          font-size: 0.8rem;
          color: var(--muted);
        }

        .whitelist-empty {
          margin: 12px 0 0;
          color: var(--muted);
          font-size: 0.85rem;
        }

        .toggle-label {
          font-weight: 600;
          color: var(--foreground);
        }

        .info-list {
          margin: 0;
          padding: 0 0 0 20px;
          color: var(--foreground);
        }

        .info-list li {
          margin-bottom: 8px;
          line-height: 1.5;
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 28px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #2a1b1c;
          transition: 0.4s;
          border-radius: 28px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 4px;
          bottom: 4px;
          background-color: #fef3c7;
          transition: 0.4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: var(--accent);
        }

        input:checked + .slider:before {
          transform: translateX(22px);
        }

        @media (max-width: 768px) {
          .settings-header {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
