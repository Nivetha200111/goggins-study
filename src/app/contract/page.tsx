"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, updateUser } from "@/lib/supabase";

interface User {
  id: string;
  username: string;
}

type AudioKit = {
  ctx: AudioContext;
  prime: () => void;
  quill: () => void;
  seal: () => void;
  chime: () => void;
};

function createAudioKit(): AudioKit {
  const ctx = new AudioContext();

  const prime = () => {
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
  };

  const noiseBurst = (duration: number, filterFreq: number, gain: number) => {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = filterFreq;
    filter.Q.value = 0.9;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    source.connect(filter).connect(gainNode).connect(ctx.destination);
    source.start();
  };

  const quill = () => noiseBurst(0.18, 1300, 0.18);

  const seal = () => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(130, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.25);
    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gainNode).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const chime = () => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gainNode).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  };

  return { ctx, prime, quill, seal, chime };
}

export default function ContractPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"idle" | "signing" | "signed">("idle");
  const [error, setError] = useState("");
  const audioRef = useRef<AudioKit | null>(null);
  const primedRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem("focus-companion-user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(stored) as User;
    let isMounted = true;
    const checkStatus = async () => {
      const profile = await getUser(parsed.id);
      if (!profile) {
        router.push("/login");
        return;
      }
      if (profile.contract_signed_at) {
        router.push("/");
        return;
      }
      if (isMounted) {
        setUser(parsed);
      }
    };
    void checkStatus();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const primeAudio = () => {
    if (primedRef.current) return;
    primedRef.current = true;
    if (!audioRef.current) {
      audioRef.current = createAudioKit();
    }
    audioRef.current.prime();
    audioRef.current.quill();
  };

  const handleSign = async () => {
    if (!user || status !== "idle") return;
    setStatus("signing");
    setError("");

    if (!audioRef.current) {
      audioRef.current = createAudioKit();
    }
    audioRef.current.prime();
    audioRef.current.quill();
    setTimeout(() => audioRef.current?.seal(), 140);
    setTimeout(() => audioRef.current?.chime(), 260);

    const signedAt = new Date().toISOString();
    const updated = await updateUser(user.id, { contract_signed_at: signedAt });
    if (!updated) {
      setStatus("idle");
      setError("The pact slipped. Try signing again.");
      return;
    }
    setStatus("signed");
    setTimeout(() => router.push("/"), 900);
  };

  const handleDecline = () => {
    localStorage.removeItem("focus-companion-user");
    router.push("/login");
  };

  return (
    <div className="contract-page" onPointerDown={primeAudio}>
      <div className="boss-sky" />
      <div className="boss-ground" />

      <div className="contract-wrapper">
        <div className="intro-panel pixel-panel">
          <p className="kicker">Boss Warning</p>
          <h1>Focus Contract</h1>
          <p className="subtitle">
            This is the old-school boss gate. Sign once, and the agent gets to call you
            out whenever your run slips before the timer is done.
          </p>
        </div>

        <div className="contract-grid">
          <section className="boss-card pixel-panel">
            <div className={`core ${status === "signed" ? "lit" : ""}`}>
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <path d="M24 22h18v18H24zM78 22h18v18H78zM42 40h36v18H42zM30 58h18v18H30zM72 58h18v18H72zM42 76h36v18H42z" />
              </svg>
            </div>
            <p className="boss-title">Sentinel Core</p>
            <p className="boss-copy">
              Tap anywhere to arm the sound. The core flashes when your signature lands.
            </p>
          </section>

          <section className="terms-card pixel-panel">
            <p className="kicker">Quest Rules</p>
            <ul className="terms">
              <li>I trade idle browsing for deliberate study time.</li>
              <li>I accept the pinned timer and local Chrome monitoring.</li>
              <li>I accept voice callouts when I wander before the run ends.</li>
              <li>I start each session only when I am ready to finish it.</li>
            </ul>

            <div className="signature-grid">
              <div className="signature-cell">
                <span className="cell-label">Player</span>
                <strong>{user?.username ?? "Loading"}</strong>
              </div>
              <div className="signature-cell">
                <span className="cell-label">Date</span>
                <strong>{new Date().toLocaleDateString()}</strong>
              </div>
            </div>

            <div className="actions">
              <button className="sign-btn" onClick={handleSign} disabled={status !== "idle"}>
                {status === "idle"
                  ? "Accept Quest"
                  : status === "signing"
                    ? "Saving..."
                    : "Bound"}
              </button>
              <button className="decline-btn" onClick={handleDecline}>
                Walk Away
              </button>
            </div>

            {error ? <p className="error">{error}</p> : null}
            <p className="audio-note">Tap the screen first if your browser blocks sound.</p>
          </section>
        </div>
      </div>

      <style jsx>{`
        .contract-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          padding: 18px 12px 56px;
        }

        .boss-sky,
        .boss-ground {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .boss-sky {
          background:
            radial-gradient(circle at 18% 20%, rgba(255, 216, 74, 0.2) 0 8%, transparent 8.5%),
            radial-gradient(circle at 80% 16%, rgba(255, 110, 159, 0.18) 0 10%, transparent 10.5%);
          opacity: 0.8;
        }

        .boss-ground {
          inset: auto 0 0;
          height: 180px;
          background:
            linear-gradient(
              135deg,
              transparent 0 10%,
              #10071b 10% 22%,
              transparent 22% 28%,
              #10071b 28% 42%,
              transparent 42% 50%,
              #10071b 50% 66%,
              transparent 66% 78%,
              #10071b 78% 100%
            );
        }

        .contract-wrapper {
          position: relative;
          z-index: 1;
          width: min(1080px, 100%);
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

        .contract-grid {
          display: grid;
          grid-template-columns: minmax(240px, 0.34fr) minmax(0, 0.66fr);
          gap: 16px;
        }

        .kicker,
        .cell-label {
          margin: 0 0 10px;
          color: var(--accent);
          font-size: 0.74rem;
          line-height: 1.7;
        }

        h1 {
          margin: 0;
          font-size: clamp(1.5rem, 4vw, 2.8rem);
          line-height: 1.35;
          color: #fff6bf;
          text-shadow: 4px 4px 0 #26124b;
        }

        .subtitle,
        .boss-copy,
        .audio-note,
        .error {
          margin: 12px 0 0;
          font-size: 1.42rem;
          line-height: 1.08;
          color: var(--foreground);
        }

        .boss-card {
          display: grid;
          align-content: start;
          gap: 14px;
          min-height: 100%;
        }

        .core {
          width: min(220px, 100%);
          aspect-ratio: 1;
          margin: 0 auto;
          display: grid;
          place-items: center;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          background:
            repeating-linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.08) 0 16px,
              transparent 16px 32px
            ),
            #1a0d31;
        }

        .core svg {
          width: 72%;
          fill: var(--accent-3);
          filter: drop-shadow(0 0 10px rgba(70, 216, 255, 0.35));
        }

        .core.lit {
          background:
            repeating-linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.08) 0 16px,
              transparent 16px 32px
            ),
            #38103e;
        }

        .core.lit svg {
          fill: var(--accent);
          filter: drop-shadow(0 0 18px rgba(255, 216, 74, 0.55));
        }

        .boss-title {
          margin: 0;
          color: #fff6bf;
          font-family: var(--font-pixel-heading), monospace;
          font-size: 0.86rem;
          line-height: 1.7;
          text-transform: uppercase;
        }

        .terms-card {
          display: grid;
          gap: 14px;
        }

        .terms {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 10px;
          font-size: 1.5rem;
          line-height: 1.08;
        }

        .signature-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .signature-cell {
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          background: rgba(10, 4, 20, 0.45);
          padding: 12px;
          display: grid;
          gap: 8px;
        }

        .signature-cell strong {
          font-size: 1.6rem;
          line-height: 1.05;
          color: #fff7dd;
        }

        .actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sign-btn,
        .decline-btn {
          min-height: 50px;
          padding: 12px 16px;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          cursor: pointer;
        }

        .sign-btn {
          background: var(--success);
          color: #0f200d;
        }

        .decline-btn {
          background: var(--danger);
          color: #220707;
        }

        .sign-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error {
          color: #ffd6d6;
          background: rgba(255, 122, 122, 0.16);
          padding: 10px 12px;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
        }

        @media (max-width: 780px) {
          .contract-grid,
          .signature-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
