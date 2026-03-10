"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  validateInviteCode,
  createUser,
  getUserByUsername,
  updateUser,
} from "@/lib/supabase";

interface GeneratedAccess {
  code: string;
  route: "/" | "/contract";
}

function generateAccessCode(username: string): string {
  const slug = username.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 8) || "PLAYER";
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${slug}-${suffix}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedAccess, setGeneratedAccess] = useState<GeneratedAccess | null>(null);
  const [copied, setCopied] = useState(false);

  const persistUser = (id: string, storedUsername: string) => {
    localStorage.setItem(
      "focus-companion-user",
      JSON.stringify({
        id,
        username: storedUsername,
      })
    );
  };

  const finalizeGeneratedAccess = (
    id: string,
    storedUsername: string,
    code: string,
    route: "/" | "/contract"
  ) => {
    persistUser(id, storedUsername);
    setGeneratedAccess({ code, route });
    setCopied(false);
    setLoading(false);
  };

  const handleContinue = () => {
    if (!generatedAccess) return;
    router.push(generatedAccess.route);
  };

  const handleCopy = async () => {
    if (!generatedAccess?.code) return;
    await navigator.clipboard.writeText(generatedAccess.code);
    setCopied(true);
  };

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
      const existingUser = await getUserByUsername(trimmedUsername);

      if (existingUser) {
        if (existingUser.invite_code) {
          if (!trimmedCode) {
            setError("This account already has an access code. Enter it to continue.");
            setLoading(false);
            return;
          }

          if (existingUser.invite_code.toUpperCase() !== trimmedCode) {
            setError("Incorrect access code.");
            setLoading(false);
            return;
          }

          persistUser(existingUser.id, existingUser.username);
          router.push(existingUser.contract_signed_at ? "/" : "/contract");
          return;
        }

        if (trimmedCode) {
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

          persistUser(existingUser.id, existingUser.username);
          router.push(existingUser.contract_signed_at ? "/" : "/contract");
          return;
        }

        const generatedCode = generateAccessCode(existingUser.username);
        const updated = await updateUser(existingUser.id, { invite_code: generatedCode });
        if (!updated) {
          setError("Could not auto-generate an access code. Try again.");
          setLoading(false);
          return;
        }

        finalizeGeneratedAccess(
          existingUser.id,
          existingUser.username,
          generatedCode,
          existingUser.contract_signed_at ? "/" : "/contract"
        );
        return;
      }

      if (trimmedCode) {
        const isValid = await validateInviteCode(trimmedCode);
        if (!isValid) {
          setError("Invalid or already used invite code.");
          setLoading(false);
          return;
        }

        const user = await createUser(trimmedUsername, trimmedCode);
        if (!user) {
          setError("Username already exists or could not create account.");
          setLoading(false);
          return;
        }

        persistUser(user.id, user.username);
        router.push("/contract");
        return;
      }

      const generatedCode = generateAccessCode(trimmedUsername);
      const user = await createUser(trimmedUsername, generatedCode);
      if (!user) {
        const fallbackUser = await getUserByUsername(trimmedUsername);
        if (fallbackUser) {
          finalizeGeneratedAccess(
            fallbackUser.id,
            fallbackUser.username,
            fallbackUser.invite_code || generatedCode,
            fallbackUser.contract_signed_at ? "/" : "/contract"
          );
          return;
        }

        setError("Username already exists or could not create account.");
        setLoading(false);
        return;
      }

      finalizeGeneratedAccess(user.id, user.username, generatedCode, "/contract");
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  if (generatedAccess) {
    return (
      <div className="auth-page">
        <div className="cabinet-shell">
          <div className="cabinet-top">Access Unlocked</div>
          <div className="auth-card">
            <p className="kicker">Save This Code</p>
            <h1>New Access Key</h1>
            <p className="subtitle">
              This code is now tied to your username. You will need it the next time you
              log in.
            </p>

            <div className="code-box">{generatedAccess.code}</div>

            <div className="action-row">
              <button type="button" className="secondary-btn" onClick={handleCopy}>
                {copied ? "Copied" : "Copy Code"}
              </button>
              <button type="button" onClick={handleContinue}>
                Continue
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .auth-page {
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 18px 12px;
          }

          .cabinet-shell {
            width: min(560px, 100%);
            border: 4px solid var(--edge);
            box-shadow: 8px 8px 0 var(--shadow);
            background: linear-gradient(180deg, #3e1f73 0%, #231045 100%);
            padding: 14px;
          }

          .cabinet-top {
            padding: 12px 14px;
            margin-bottom: 14px;
            border: 4px solid var(--edge);
            background: var(--accent);
            color: #180f00;
            text-align: center;
            box-shadow: 4px 4px 0 var(--shadow);
          }

          .auth-card {
            border: 4px solid var(--edge);
            background:
              linear-gradient(180deg, rgba(10, 4, 20, 0.55) 0%, rgba(29, 15, 58, 0.82) 100%);
            box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.05);
            padding: 20px;
          }

          .kicker {
            margin: 0 0 10px;
            color: var(--accent);
            font-size: 0.74rem;
            line-height: 1.7;
          }

          h1 {
            margin: 0;
            font-size: clamp(1.5rem, 5vw, 2.6rem);
            line-height: 1.35;
            color: #fff6bf;
            text-shadow: 4px 4px 0 #231045;
          }

          .subtitle {
            margin: 12px 0 0;
            font-size: 1.45rem;
            line-height: 1.1;
            color: var(--foreground);
          }

          .code-box {
            margin-top: 18px;
            border: 4px solid var(--edge);
            box-shadow: 4px 4px 0 var(--shadow);
            background: #f2f0ff;
            color: #13091f;
            padding: 16px 14px;
            text-align: center;
            font-size: clamp(1.6rem, 4vw, 2.2rem);
            line-height: 1.1;
          }

          .action-row {
            margin-top: 16px;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }

          button {
            min-height: 54px;
            border: 4px solid var(--edge);
            box-shadow: 4px 4px 0 var(--shadow);
            background: var(--success);
            color: #10220e;
            cursor: pointer;
            padding: 12px 16px;
          }

          .secondary-btn {
            background: var(--accent-3);
            color: #091120;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="cabinet-shell">
        <div className="cabinet-top">Insert Focus</div>
        <div className="auth-card">
          <p className="kicker">Player Login</p>
          <h1>Press Start</h1>
          <p className="subtitle">
            Leave access code blank on first login and the app will generate one for you.
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Player tag"
                required
                minLength={2}
                maxLength={20}
                autoFocus
              />
            </label>

            <label>
              Access Code
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Leave blank to auto-generate"
              />
            </label>

            {error ? <p className="error">{error}</p> : null}

            <button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Start Game"}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 18px 12px;
        }

        .cabinet-shell {
          width: min(560px, 100%);
          border: 4px solid var(--edge);
          box-shadow: 8px 8px 0 var(--shadow);
          background: linear-gradient(180deg, #3e1f73 0%, #231045 100%);
          padding: 14px;
        }

        .cabinet-top {
          padding: 12px 14px;
          margin-bottom: 14px;
          border: 4px solid var(--edge);
          background: var(--accent);
          color: #180f00;
          text-align: center;
          box-shadow: 4px 4px 0 var(--shadow);
        }

        .auth-card {
          border: 4px solid var(--edge);
          background:
            linear-gradient(180deg, rgba(10, 4, 20, 0.55) 0%, rgba(29, 15, 58, 0.82) 100%);
          box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.05);
          padding: 20px;
        }

        .kicker {
          margin: 0 0 10px;
          color: var(--accent);
          font-size: 0.74rem;
          line-height: 1.7;
        }

        h1 {
          margin: 0;
          font-size: clamp(1.5rem, 5vw, 2.6rem);
          line-height: 1.35;
          color: #fff6bf;
          text-shadow: 4px 4px 0 #231045;
        }

        .subtitle,
        .error {
          margin: 12px 0 0;
          font-size: 1.45rem;
          line-height: 1.1;
          color: var(--foreground);
        }

        .auth-form {
          display: grid;
          gap: 14px;
          margin-top: 18px;
        }

        label {
          display: grid;
          gap: 8px;
          color: var(--accent-2);
          font-size: 0.76rem;
          line-height: 1.7;
        }

        input {
          width: 100%;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          background: #f2f0ff;
          color: #13091f;
          padding: 12px 14px;
          font-size: 1.6rem;
          line-height: 1.1;
        }

        button {
          min-height: 54px;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
          background: var(--success);
          color: #10220e;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error {
          color: #ffd6d6;
          background: rgba(255, 122, 122, 0.18);
          padding: 10px 12px;
          border: 4px solid var(--edge);
          box-shadow: 4px 4px 0 var(--shadow);
        }
      `}</style>
    </div>
  );
}
