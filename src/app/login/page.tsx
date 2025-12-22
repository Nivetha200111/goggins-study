"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  validateInviteCode,
  createUser,
  getUserByUsername,
  updateUser,
} from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedUsername = username.trim();
    const trimmedCode = inviteCode.trim().toUpperCase();

    if (trimmedUsername.length < 2) {
      setError("Username must be at least 2 characters");
      setLoading(false);
      return;
    }

    if (trimmedUsername.length > 20) {
      setError("Username must be 20 characters or less");
      setLoading(false);
      return;
    }

    try {
      if (!trimmedCode) {
        setError("Invite code is required.");
        setLoading(false);
        return;
      }

      const existingUser = await getUserByUsername(trimmedUsername);
      if (existingUser) {
        if (!existingUser.invite_code) {
          const isValid = await validateInviteCode(trimmedCode);
          if (!isValid) {
            setError("Invalid or already used invite code.");
            setLoading(false);
            return;
          }
          const updated = await updateUser(existingUser.id, { invite_code: trimmedCode });
          if (!updated) {
            setError("Could not claim invite code. Try again.");
            setLoading(false);
            return;
          }
        } else if (existingUser.invite_code.toUpperCase() !== trimmedCode) {
          setError("Incorrect invite code.");
          setLoading(false);
          return;
        }

        localStorage.setItem(
          "focus-companion-user",
          JSON.stringify({
            id: existingUser.id,
            username: existingUser.username,
          })
        );
        router.push(existingUser.contract_signed_at ? "/" : "/contract");
        return;
      }

      const isValid = await validateInviteCode(trimmedCode);
      if (!isValid) {
        setError("Invalid or already used invite code.");
        setLoading(false);
        return;
      }

      const user = await createUser(trimmedUsername, trimmedCode);
      if (!user) {
        const fallbackUser = await getUserByUsername(trimmedUsername);
        if (fallbackUser) {
          localStorage.setItem(
            "focus-companion-user",
            JSON.stringify({
              id: fallbackUser.id,
              username: fallbackUser.username,
            })
          );
          router.push(fallbackUser.contract_signed_at ? "/" : "/contract");
          return;
        }
        setError("Username already exists or could not create account.");
        setLoading(false);
        return;
      }

      localStorage.setItem(
        "focus-companion-user",
        JSON.stringify({
          id: user.id,
          username: user.username,
        })
      );

      router.push("/contract");
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="kicker">Focus Companion</p>
        <h1>Join the grind</h1>
        <p className="subtitle">Use your invite code as your password to log in.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name"
              required
              minLength={2}
              maxLength={20}
              autoFocus
            />
          </label>
          <label>
            Invite Code
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Invite code (required every time)"
              required
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Joining..." : "Start Focusing"}
          </button>
        </form>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: var(--background);
        }
        .auth-card {
          width: min(400px, 92vw);
          background: white;
          border-radius: 24px;
          padding: 32px;
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
          margin: 0 0 24px;
          color: var(--muted);
        }
        .auth-form {
          display: grid;
          gap: 16px;
        }
        label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--ink);
          display: grid;
          gap: 8px;
        }
        input {
          padding: 14px 16px;
          border-radius: 12px;
          border: 2px solid transparent;
          background: #f8f4eb;
          font-size: 1rem;
          outline: none;
        }
        input:focus {
          border-color: var(--accent);
        }
        button[type="submit"] {
          margin-top: 8px;
          padding: 14px 16px;
          border: none;
          border-radius: 12px;
          background: var(--accent);
          color: white;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .error {
          color: #dc2626;
          margin: 0;
          font-size: 0.9rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
