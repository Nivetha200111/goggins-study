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
      <div className="ember ember-1" />
      <div className="ember ember-2" />
      <div className="ember ember-3" />
      <div className="contract-wrapper">
        <div className={`sigil ${status === "signed" ? "lit" : ""}`}>
          <div className="sigil-horn left" />
          <div className="sigil-horn right" />
          <div className="sigil-core" />
        </div>
        <div className="scroll">
          <div className="scroll-header">
            <span className="scroll-kicker">Soul Contract</span>
            <h1>Sell Your Distractions</h1>
            <p className="scroll-subtitle">
              Have you heard the phrase &quot;sell your soul to the devil&quot;? While
              using this app, you do exactly that. You trade your distractions and
              your time for discipline, success, and future glory.
            </p>
          </div>

          <div className="scroll-body">
            <p className="inscribed">
              The mascot accepts your wandering focus as tribute. In return, it
              sharpens your mind, guards your minutes, and promises the success
              you crave.
            </p>
            <ul className="terms">
              <li>I surrender idle minutes to the sentinel.</li>
              <li>I allow the devil to shout when I drift.</li>
              <li>I trade distraction for discipline, fame, and future proof success.</li>
              <li>I honor the pact for every session I begin.</li>
            </ul>
          </div>

          <div className="signature-block">
            <div>
              <span className="label">Signed by</span>
              <div className="signature">{user?.username ?? "Your Name"}</div>
            </div>
            <div>
              <span className="label">Date</span>
              <div className="signature">{new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div className="seal-row">
            <div className="seal" />
            <div className="seal-text">
              The sigil burns once your vow is made.
            </div>
          </div>

          <div className="actions">
            <button
              className="sign-btn"
              onClick={handleSign}
              disabled={status !== "idle"}
            >
              {status === "idle"
                ? "Sign the contract"
                : status === "signing"
                  ? "Binding..."
                  : "Bound"}
            </button>
            <button className="decline-btn" onClick={handleDecline}>
              Decline and walk away
            </button>
            {error && <p className="error">{error}</p>}
          </div>
          <p className="audio-note">Tap the scroll to awaken the pact.</p>
        </div>
      </div>

      <style jsx>{`
        .contract-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 16px;
          background:
            radial-gradient(circle at 20% 10%, rgba(255, 80, 80, 0.25), transparent 55%),
            radial-gradient(circle at 80% 15%, rgba(255, 200, 120, 0.2), transparent 60%),
            radial-gradient(circle at 50% 80%, rgba(90, 20, 20, 0.45), transparent 55%),
            linear-gradient(180deg, #0c0b12 0%, #130c0b 100%);
          color: #f9ead1;
          position: relative;
          overflow: hidden;
        }
        .contract-wrapper {
          width: min(860px, 100%);
          position: relative;
          z-index: 2;
        }
        .sigil {
          width: 70px;
          height: 70px;
          margin: 0 auto 18px;
          position: relative;
        }
        .sigil.lit::after {
          content: "";
          position: absolute;
          inset: -8px;
          border-radius: 24px;
          background: radial-gradient(circle, rgba(255, 120, 80, 0.6), transparent 70%);
          filter: blur(6px);
          opacity: 0.9;
          animation: sigil-burn 1.4s ease-in-out infinite;
          pointer-events: none;
        }
        .sigil-core {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: radial-gradient(circle, #ff6b4a 0%, #7f1d1d 70%);
          margin: 12px auto 0;
          box-shadow: 0 0 40px rgba(255, 80, 70, 0.6);
        }
        .sigil.lit .sigil-core {
          box-shadow:
            0 0 30px rgba(255, 120, 80, 0.8),
            0 0 70px rgba(255, 80, 70, 0.9);
          animation: sigil-burn 1.4s ease-in-out infinite;
        }
        .sigil-horn {
          position: absolute;
          top: 4px;
          width: 18px;
          height: 24px;
          border-radius: 6px;
          background: linear-gradient(180deg, #ffb24a, #b91c1c);
        }
        .sigil.lit .sigil-horn {
          box-shadow: 0 0 14px rgba(255, 120, 80, 0.6);
        }
        .sigil-horn.left {
          left: 4px;
          transform: rotate(-18deg);
        }
        .sigil-horn.right {
          right: 4px;
          transform: rotate(18deg);
        }
        .scroll {
          position: relative;
          background:
            linear-gradient(135deg, #f9e7c6 0%, #e8cda0 40%, #f2d7aa 100%),
            radial-gradient(circle at 10% 20%, rgba(120, 72, 36, 0.12), transparent 35%),
            radial-gradient(circle at 80% 70%, rgba(120, 72, 36, 0.18), transparent 40%);
          border: 1px solid #d1b58a;
          border-radius: 18px;
          padding: 42px 42px 34px;
          color: #3a2415;
          box-shadow:
            0 40px 80px rgba(0, 0, 0, 0.45),
            inset 0 0 40px rgba(255, 255, 255, 0.4);
          overflow: hidden;
        }
        .scroll::before,
        .scroll::after {
          content: "";
          position: absolute;
          left: -8px;
          right: -8px;
          height: 24px;
          background: radial-gradient(circle at center, #b08259 0%, #6a3f22 70%);
          opacity: 0.25;
        }
        .scroll::before {
          top: -12px;
          border-radius: 50%;
        }
        .scroll::after {
          bottom: -12px;
          border-radius: 50%;
        }
        .scroll-header h1 {
          font-size: clamp(2.2rem, 4vw, 3rem);
          margin: 8px 0 12px;
          color: #2c1a10;
          text-shadow: 0 2px 0 rgba(255, 255, 255, 0.6);
        }
        .scroll-kicker {
          text-transform: uppercase;
          letter-spacing: 0.4em;
          font-size: 0.7rem;
          color: #7a4d2a;
          font-weight: 700;
        }
        .scroll-subtitle {
          margin: 0 0 20px;
          color: #5b3a23;
          line-height: 1.6;
        }
        .scroll-body {
          display: grid;
          gap: 16px;
          font-size: 0.98rem;
          line-height: 1.7;
        }
        .inscribed {
          font-family: var(--font-plex-mono), monospace;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.8rem;
          color: #2a1b13;
        }
        .terms {
          margin: 0;
          padding-left: 18px;
          color: #3a2415;
        }
        .terms li {
          margin-bottom: 8px;
        }
        .signature-block {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }
        .label {
          text-transform: uppercase;
          font-size: 0.65rem;
          letter-spacing: 0.3em;
          color: #7a4d2a;
          font-weight: 700;
        }
        .signature {
          margin-top: 8px;
          padding: 10px 0;
          border-bottom: 2px solid rgba(122, 77, 42, 0.6);
          font-size: 1.1rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .seal-row {
          margin-top: 26px;
          display: grid;
          grid-template-columns: 60px 1fr;
          gap: 16px;
          align-items: center;
        }
        .seal {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffb4a0, #991b1b 70%);
          box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        .seal-text {
          font-size: 0.85rem;
          color: #5b3a23;
        }
        .actions {
          margin-top: 28px;
          display: grid;
          gap: 12px;
        }
        .sign-btn {
          padding: 14px 18px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(120deg, #b91c1c, #ff6b4a);
          color: #fff5e8;
          font-size: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          cursor: pointer;
          box-shadow: 0 16px 32px rgba(185, 28, 28, 0.35);
        }
        .sign-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .decline-btn {
          background: transparent;
          border: 1px solid rgba(90, 60, 40, 0.6);
          color: #5b3a23;
          padding: 12px 18px;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .audio-note {
          margin-top: 12px;
          font-size: 0.75rem;
          color: #7a4d2a;
          text-align: center;
        }
        .error {
          margin: 0;
          color: #b91c1c;
          font-weight: 600;
        }
        .ember {
          position: absolute;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.35;
          animation: floaty 10s ease-in-out infinite;
        }
        .ember-1 {
          top: -60px;
          left: -60px;
          background: rgba(255, 90, 80, 0.6);
        }
        .ember-2 {
          bottom: -80px;
          right: -60px;
          background: rgba(255, 200, 130, 0.5);
          animation-delay: 2s;
        }
        .ember-3 {
          top: 45%;
          right: 20%;
          background: rgba(140, 30, 30, 0.4);
          animation-delay: 4s;
        }
        @keyframes sigil-burn {
          0%, 100% {
            opacity: 0.85;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }

        @media (max-width: 640px) {
          .scroll {
            padding: 32px 24px;
          }
          .signature {
            letter-spacing: 0.12em;
          }
        }
      `}</style>
    </div>
  );
}
