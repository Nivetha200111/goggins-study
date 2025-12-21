"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PROFILE_KEY = "study-sentry-profile-v1";
const alertCooldownMs = 6000;
// Minimum ratio of on-topic words (excluding stop words) - higher sensitivity = higher required ratio
const ratioThresholds = [0.1, 0.15, 0.2, 0.25, 0.3];
// Common words to ignore in drift detection
const stopWords = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her",
  "was", "one", "our", "out", "has", "have", "been", "were", "they", "this",
  "that", "with", "from", "your", "what", "when", "will", "how", "which", "their",
  "about", "into", "more", "some", "than", "them", "then", "these", "would", "each",
  "make", "like", "just", "over", "such", "also", "most", "other", "very", "after",
  "where", "only", "come", "its", "before", "between", "because", "being", "through",
]);

type FocusProfile = {
  sessions: number;
  distractions: number;
  focusMinutes: number;
};

const emptyProfile: FocusProfile = {
  sessions: 0,
  distractions: 0,
  focusMinutes: 0,
};

export default function Home() {
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [sensitivity, setSensitivity] = useState(3);
  const [sessionActive, setSessionActive] = useState(false);
  const [screamOpen, setScreamOpen] = useState(false);
  const [lastReason, setLastReason] = useState("Stay locked in.");
  const [profile, setProfile] = useState<FocusProfile>(emptyProfile);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const lastAlertRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioEnabledRef = useRef(false);

  const topicKeywords = useMemo(() => {
    return topic
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2);
  }, [topic]);

  useEffect(() => {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as FocusProfile;
      setProfile(parsed);
    } catch {
      setProfile(emptyProfile);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (sessionActive && sessionStart === null) {
      setSessionStart(Date.now());
    }
    if (!sessionActive && sessionStart !== null) {
      const delta = (Date.now() - sessionStart) / 60000;
      setProfile((prev) => ({
        ...prev,
        focusMinutes: Number((prev.focusMinutes + delta).toFixed(1)),
      }));
      setSessionStart(null);
    }
  }, [sessionActive, sessionStart]);

  const recordFocusSlice = useCallback(() => {
    if (sessionStart === null) return;
    const delta = (Date.now() - sessionStart) / 60000;
    setProfile((prev) => ({
      ...prev,
      focusMinutes: Number((prev.focusMinutes + delta).toFixed(1)),
    }));
    setSessionStart(Date.now());
  }, [sessionStart]);

  const raiseAlert = useCallback((reason: string, options?: { force?: boolean }) => {
    // Allow forced alerts (for Test Scream) even without active session
    if (!sessionActive && !options?.force) return;
    const now = Date.now();
    if (now - lastAlertRef.current < alertCooldownMs && !options?.force) return;
    lastAlertRef.current = now;
    if (sessionActive) {
      recordFocusSlice();
      setProfile((prev) => ({
        ...prev,
        distractions: prev.distractions + 1,
      }));
    }
    setLastReason(reason);
    setScreamOpen(true);
  }, [sessionActive, recordFocusSlice]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        raiseAlert("You left the focus tab.");
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [sessionActive, raiseAlert]);

  useEffect(() => {
    if (!sessionActive) return;
    if (topicKeywords.length === 0) return;
    const tokens = notes
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2);
    if (tokens.length < 10) return;
    // Filter out common stop words before checking topic relevance
    const contentWords = tokens.filter((word) => !stopWords.has(word));
    if (contentWords.length < 5) return;
    // Calculate ratio of on-topic words
    const onTopicWords = contentWords.filter((word) => topicKeywords.includes(word));
    const ratio = onTopicWords.length / contentWords.length;
    const requiredRatio = ratioThresholds[Math.min(4, Math.max(0, sensitivity - 1))];
    if (ratio < requiredRatio) {
      raiseAlert("Topic drift detected in your notes.");
    }
  }, [notes, sensitivity, sessionActive, topicKeywords, raiseAlert]);

  useEffect(() => {
    if (!screamOpen || !videoRef.current) return;
    videoRef.current.currentTime = 0;
    // Unmute only if user has interacted (audio enabled)
    videoRef.current.muted = !audioEnabledRef.current;
    videoRef.current.play().catch(() => {
      // Browser blocked autoplay - play muted as fallback
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
    });
  }, [screamOpen]);

  const toggleSession = () => {
    // Enable audio on first user interaction
    audioEnabledRef.current = true;
    if (!sessionActive) {
      setProfile((prev) => ({ ...prev, sessions: prev.sessions + 1 }));
    }
    setSessionActive((prev) => !prev);
  };

  const resetProfile = () => {
    setProfile(emptyProfile);
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-10 sm:px-10">
      <div
        className="pointer-events-none absolute left-6 top-12 h-52 w-52 rounded-full bg-[#ffcf9a]/70 blur-2xl"
        style={{ animation: "floaty 10s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute right-10 top-24 h-72 w-72 rounded-full bg-[#ff6b4a]/30 blur-3xl"
        style={{ animation: "floaty 12s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute bottom-12 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#ffd2e6]/40 blur-3xl"
        style={{ animation: "floaty 14s ease-in-out infinite" }}
      />

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[color:var(--muted)]">
              Focus Sentinel
            </p>
            <h1 className="text-4xl font-semibold text-[color:var(--ink)] sm:text-5xl">
              Study Sentry
            </h1>
            <p className="mt-2 max-w-xl text-base text-[color:var(--muted)]">
              Lock in on a topic. Drift away, and the sentry screams back with a
              full-screen interruption.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSession}
              className={`rounded-full px-6 py-2 text-sm font-semibold uppercase tracking-wide transition ${
                sessionActive
                  ? "bg-[color:var(--ink)] text-white"
                  : "bg-[color:var(--accent)] text-white"
              }`}
            >
              {sessionActive ? "End Session" : "Start Session"}
            </button>
            <button
              onClick={() => {
                audioEnabledRef.current = true;
                raiseAlert("Manual override: scream test.", { force: true });
              }}
              className="rounded-full border border-[color:var(--ink)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--ink)]"
            >
              Test Scream
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_1.35fr]">
          <div className="flex flex-col gap-6 rounded-3xl bg-[color:var(--card)] p-6 shadow-[0_20px_60px_rgba(23,24,40,0.12)]">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
                Focus Parameters
              </p>
              <label className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted)]">
                Topic Anchor
              </label>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Neural nets backpropagation"
                className="w-full rounded-2xl border border-transparent bg-white px-4 py-3 text-base text-[color:var(--ink)] shadow-sm outline-none ring-2 ring-transparent focus:ring-[color:var(--accent)]"
              />
            </div>

            <div className="rounded-2xl border border-dashed border-[color:var(--accent)]/40 bg-white px-4 py-4 text-sm text-[color:var(--muted)]">
              The sentry only monitors this tab. It watches for topic drift in
              your notes and if you leave the page.
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted)]">
                Sensitivity: {sensitivity}/5
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={sensitivity}
                onChange={(event) => setSensitivity(Number(event.target.value))}
                className="accent-[color:var(--accent)]"
              />
              <p className="text-xs text-[color:var(--muted)]">
                Higher sensitivity = faster scream when unrelated words appear.
              </p>
            </div>

            <div className="grid gap-4 rounded-2xl bg-[color:var(--ink)] p-4 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/70">
                  Focus Profile
                </p>
                <p className="text-2xl font-semibold">
                  {profile.focusMinutes.toFixed(1)} min
                </p>
              </div>
              <div className="flex items-center justify-between text-sm text-white/80">
                <span>Sessions</span>
                <span className="font-semibold text-white">
                  {profile.sessions}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-white/80">
                <span>Distractions</span>
                <span className="font-semibold text-white">
                  {profile.distractions}
                </span>
              </div>
              <button
                onClick={resetProfile}
                className="rounded-full border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide"
              >
                Reset Profile
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_rgba(23,24,40,0.12)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
                    Focus Notes
                  </p>
                  <p className="text-sm text-[color:var(--muted)]">
                    Keep this aligned with your topic anchor.
                  </p>
                </div>
                <span
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                    sessionActive
                      ? "bg-[color:var(--accent)] text-white"
                      : "bg-[#f1f1f1] text-[color:var(--muted)]"
                  }`}
                  style={
                    sessionActive ? { animation: "glow 4s ease infinite" } : {}
                  }
                >
                  {sessionActive ? "Monitoring" : "Paused"}
                </span>
              </div>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Write your study notes here. The sentry learns the words you use."
                className="min-h-[260px] w-full rounded-2xl border border-transparent bg-[#f8f4eb] px-4 py-4 text-sm text-[color:var(--ink)] shadow-inner outline-none ring-2 ring-transparent focus:ring-[color:var(--accent)]"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
                <span>
                  Topic keywords: {topicKeywords.length || "Add a topic above"}
                </span>
                <button
                  onClick={() => setNotes("")}
                  className="rounded-full border border-[color:var(--ink)]/30 px-4 py-2 text-[color:var(--ink)]"
                >
                  Clear Notes
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-[color:var(--ink)]/10 bg-[color:var(--card)] p-6 text-sm text-[color:var(--muted)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
                Portfolio Hook
              </p>
              <p className="mt-2 text-[color:var(--ink)]">
                This MVP stores a lightweight focus profile locally. Later we can
                plug in a learning model that adapts thresholds, predicts drift,
                and suggests optimized study loops.
              </p>
            </div>
          </div>
        </section>
      </main>

      {screamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-black shadow-2xl">
            <div className="absolute left-6 top-6 z-10 max-w-xs rounded-2xl bg-white/90 p-4 text-sm text-[color:var(--ink)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Sentry Triggered
              </p>
              <p className="mt-2 text-base font-semibold">{lastReason}</p>
            </div>
            <video
              ref={videoRef}
              className="h-[420px] w-full object-cover"
              src="/scream.mp4"
              loop
              muted
              playsInline
              preload="none"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 bg-black px-6 py-4 text-white">
              <span className="text-xs uppercase tracking-[0.2em] text-white/70">
                Replace /public/scream.mp4 with your own clip
              </span>
              <button
                onClick={() => setScreamOpen(false)}
                className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-wide text-black"
              >
                I&apos;m Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
