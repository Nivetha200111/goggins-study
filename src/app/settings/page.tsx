"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useGameStore } from "@/store/gameStore";

export default function SettingsPage() {
  const {
    isMonitoringEnabled,
    toggleMonitoring,
    isSoundEnabled,
    toggleSound,
    sessionGoalMinutes,
    setSessionGoalMinutes,
    isSessionActive,
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
      setDomainStatus("Enter a valid new domain or URL.");
      return;
    }

    setDomainStatus("Allowed site added.");
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
      <div className="settings-shell">
        <header className="settings-header pixel-panel">
          <div>
            <p className="kicker">Option Screen</p>
            <h1>Agent Settings</h1>
            <p className="subtitle">
              Tune the browser guardrail, the pinned HUD timer, and the words the
              local detector treats as valid study context.
            </p>
          </div>
          <Link href="/" className="back-link">
            Return
          </Link>
        </header>

        <section className="settings-card pixel-panel">
          <h2>System Toggles</h2>

          <div className="toggle-row">
            <div>
              <p className="label">Chrome monitoring</p>
              <p className="help">
                The extension watches URLs, page text, and typed snippets against your
                current study topic.
              </p>
            </div>
            <label className="pixel-switch">
              <input
                type="checkbox"
                checked={isMonitoringEnabled}
                onChange={toggleMonitoring}
              />
              <span className="switch-face">{isMonitoringEnabled ? "On" : "Off"}</span>
            </label>
          </div>

          <div className="toggle-row">
            <div>
              <p className="label">Voice yell</p>
              <p className="help">
                Browser speech on desktop, TextToSpeech on Android.
              </p>
            </div>
            <label className="pixel-switch">
              <input type="checkbox" checked={isSoundEnabled} onChange={toggleSound} />
              <span className="switch-face">{isSoundEnabled ? "On" : "Off"}</span>
            </label>
          </div>

          <div className="goal-row">
            <div>
              <p className="label">Default study timer</p>
              <p className="help">
                Sets the baseline run length for the pinned timer HUD.
              </p>
            </div>
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
          </div>
        </section>

        <section className="settings-card pixel-panel">
          <h2>Allowed Domains</h2>
          <p className="help">
            Give safe passage to docs, LMS portals, and any site you already trust.
          </p>
          <form onSubmit={handleAddDomain} className="inline-form">
            <input
              type="text"
              value={domainInput}
              onChange={(event) => {
                setDomainInput(event.target.value);
                setDomainStatus("");
              }}
              placeholder="developer.mozilla.org"
            />
            <button type="submit">Add</button>
          </form>
          {domainStatus ? <p className="status">{domainStatus}</p> : null}
          <div className="tag-list">
            {whitelist.domains.length === 0 ? (
              <span className="empty">No allowed domains yet.</span>
            ) : (
              whitelist.domains.map((domain) => (
                <button
                  key={domain}
                  type="button"
                  className="tag"
                  onClick={() => removeWhitelistDomain(domain)}
                >
                  {domain} x
                </button>
              ))
            )}
          </div>
        </section>

        <section className="settings-card pixel-panel">
          <h2>Topic Keywords</h2>
          <p className="help">
            These are your quest words. The local detector rewards overlap with them.
          </p>
          <form onSubmit={handleAddKeyword} className="inline-form">
            <input
              type="text"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="algorithms, thermodynamics, react"
            />
            <button type="submit">Add</button>
          </form>
          <div className="tag-list">
            {whitelist.keywords.length === 0 ? (
              <span className="empty">No topic keywords yet.</span>
            ) : (
              whitelist.keywords.map((keyword) => (
                <button
                  key={keyword}
                  type="button"
                  className="tag"
                  onClick={() => removeWhitelistKeyword(keyword)}
                >
                  {keyword} x
                </button>
              ))
            )}
          </div>
        </section>

        <section className="settings-card pixel-panel">
          <h2>Mobile Alert Targets</h2>
          <p className="help">
            The Android sidecar watches these apps before your run is complete.
          </p>
          <div className="mobile-grid">
            <span>Instagram</span>
            <span>LinkedIn</span>
            <span>WhatsApp</span>
          </div>
          <p className="help">
            APK generation still needs Java and the Android SDK on the build machine.
          </p>
        </section>
      </div>

      <style jsx>{`
        .settings-page {
          min-height: 100vh;
          padding: 18px 12px 56px;
        }

        .settings-shell {
          width: min(1040px, 100%);
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

        .settings-header {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
        }

        .kicker {
          margin: 0 0 10px;
          color: var(--accent);
          font-size: 0.74rem;
          line-height: 1.7;
        }

        h1,
        h2 {
          margin: 0;
          line-height: 1.35;
          color: #fff6bf;
        }

        h1 {
          font-size: clamp(1.5rem, 3vw, 2.6rem);
          text-shadow: 4px 4px 0 #26124b;
        }

        h2 {
          font-size: clamp(1rem, 2vw, 1.4rem);
        }

        .subtitle,
        .help,
        .empty,
        .status {
          margin: 12px 0 0;
          font-size: 1.38rem;
          line-height: 1.08;
          color: var(--foreground);
        }

        .back-link,
        .inline-form button,
        .tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 12px 16px;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          background: var(--accent-3);
          color: #0d1022;
          text-decoration: none;
          cursor: pointer;
        }

        .settings-card {
          display: grid;
          gap: 14px;
        }

        .toggle-row,
        .goal-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding-top: 14px;
          border-top: 4px solid rgba(12, 6, 25, 0.45);
        }

        .label {
          margin: 0;
          color: var(--accent-2);
          font-size: 0.76rem;
          line-height: 1.7;
        }

        .pixel-switch {
          position: relative;
          display: inline-flex;
          flex-shrink: 0;
        }

        .pixel-switch input {
          position: absolute;
          opacity: 0;
          inset: 0;
        }

        .switch-face {
          min-width: 92px;
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 12px;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          background: var(--success);
          color: #0f200d;
        }

        .pixel-switch input:not(:checked) + .switch-face {
          background: var(--danger);
          color: #250808;
        }

        .goal-row input,
        .inline-form input {
          width: 100%;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          background: #f2f0ff;
          color: #13091f;
          padding: 12px 14px;
          font-size: 1.5rem;
          line-height: 1.1;
        }

        .goal-row input {
          width: 140px;
          flex-shrink: 0;
        }

        .inline-form {
          display: flex;
          gap: 10px;
        }

        .inline-form button {
          background: var(--accent);
        }

        .tag-list {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .tag {
          min-height: 40px;
          background: #f2f0ff;
          color: #13091f;
        }

        .mobile-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .mobile-grid span {
          padding: 14px 10px;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          background: rgba(10, 4, 20, 0.45);
          text-align: center;
          font-family: var(--font-pixel-heading), monospace;
          font-size: 0.72rem;
          line-height: 1.6;
        }

        @media (max-width: 760px) {
          .settings-header,
          .toggle-row,
          .goal-row,
          .inline-form {
            flex-direction: column;
            align-items: flex-start;
          }

          .goal-row input,
          .inline-form input {
            width: 100%;
          }

          .mobile-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
