"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("");
    setLoading(true);

    const supabase = getSupabaseBrowserClient();

    if (mode === "sign-up") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setStatus(error.message);
        setLoading(false);
        return;
      }

      setStatus("Check your email to confirm your account.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="kicker">Study Sentry</p>
        <h1>{mode === "sign-in" ? "Welcome back" : "Create your account"}</h1>
        <p className="subtitle">
          {mode === "sign-in"
            ? "Sign in to continue your study session."
            : "Sign up to save your focus stats across devices."}
        </p>

        <div className="mode-toggle">
          <button
            type="button"
            onClick={() => setMode("sign-in")}
            className={mode === "sign-in" ? "active" : ""}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("sign-up")}
            className={mode === "sign-up" ? "active" : ""}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 characters"
              required
              minLength={6}
            />
          </label>

          {status && <p className="status">{status}</p>}

          <button type="submit" disabled={loading}>
            {loading
              ? "Working..."
              : mode === "sign-in"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        <p className="helper">
          <Link href="/">Back to dashboard</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: var(--background);
          color: var(--foreground);
        }

        .auth-card {
          width: min(420px, 92vw);
          background: white;
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
        }

        .kicker {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          font-size: 0.7rem;
          color: var(--muted);
        }

        h1 {
          margin: 8px 0;
          font-size: 2rem;
          color: var(--ink);
        }

        .subtitle {
          margin: 0 0 20px;
          color: var(--muted);
        }

        .mode-toggle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 16px;
        }

        .mode-toggle button {
          padding: 10px 12px;
          border-radius: 12px;
          border: 2px solid transparent;
          background: #f1ede2;
          font-weight: 600;
          cursor: pointer;
        }

        .mode-toggle button.active {
          border-color: var(--accent);
          background: #fff3eb;
        }

        .auth-form {
          display: grid;
          gap: 14px;
        }

        label {
          font-size: 0.85rem;
          color: var(--muted);
          display: grid;
          gap: 6px;
        }

        input {
          padding: 12px 14px;
          border-radius: 12px;
          border: 2px solid transparent;
          background: #f8f4eb;
          outline: none;
        }

        input:focus {
          border-color: var(--accent);
        }

        button[type="submit"] {
          margin-top: 6px;
          padding: 12px 16px;
          border: none;
          border-radius: 12px;
          background: var(--accent);
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .status {
          color: var(--accent);
          margin: 0;
          font-size: 0.85rem;
        }

        .helper {
          margin-top: 16px;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
