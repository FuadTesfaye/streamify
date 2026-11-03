"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { request } from "./client-api";
import { Brand } from "./brand";
type Mode = "login" | "invite" | "forgot" | "reset" | "mfa";
const copy: Record<
  Mode,
  { eyebrow: string; title: string; description: string; button: string }
> = {
  login: {
    eyebrow: "Welcome back",
    title: "Your next chapter awaits.",
    description: "Sign in to return to your learning space.",
    button: "Sign in",
  },
  invite: {
    eyebrow: "You’re invited",
    title: "Make yourself at home.",
    description:
      "Create an account using the email address your invitation was sent to.",
    button: "Create your account",
  },
  forgot: {
    eyebrow: "A fresh start",
    title: "Let’s get you back in.",
    description:
      "We’ll send a password reset link if an account exists for this email.",
    button: "Send reset link",
  },
  reset: {
    eyebrow: "Account recovery",
    title: "Choose a new password.",
    description:
      "Use at least 12 characters, and choose a password unique to this account.",
    button: "Reset password",
  },
  mfa: {
    eyebrow: "One more step",
    title: "Verify it’s you.",
    description:
      "Enter the code from your authenticator app or use a recovery code.",
    button: "Verify and continue",
  },
};
export function AuthForm({ mode }: { mode: Mode }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [backup, setBackup] = useState(false);
  const inviteToken = useRef("");
  const c = copy[mode];
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    try {
      if (mode === "login") {
        const data = await request<{ twoFactorRedirect?: boolean }>(
          "/api/auth/sign-in/email",
          { email, password },
        );
        window.location.assign(
          data.twoFactorRedirect ? "/two-factor" : "/courses",
        );
      }
      if (mode === "invite") {
        inviteToken.current ||= window.location.hash.slice(1);
        window.history.replaceState(null, "", "/invite");
        const result = await request<{ verificationEmailSent: boolean }>(
          "/api/invitations/accept",
          {
            token: inviteToken.current,
            email,
            password,
            name: String(form.get("name")),
          },
        );
        setSuccess(
          result.verificationEmailSent
            ? "Account created. Check your email to verify it, then sign in."
            : "Account created, but the verification email could not be delivered. Return to sign in and request a new verification email.",
        );
      }
      if (mode === "forgot") {
        await request("/api/auth/request-password-reset", {
          email,
          redirectTo: "/reset-password",
        });
        setSuccess("If this account exists, a reset link has been sent.");
      }
      if (mode === "reset") {
        const token = new URLSearchParams(window.location.search).get("token");
        await request("/api/auth/reset-password", {
          newPassword: password,
          token,
        });
        setSuccess("Password updated. Sign in with your new password.");
      }
      if (mode === "mfa") {
        await request(
          `/api/auth/two-factor/${backup ? "verify-backup-code" : "verify-totp"}`,
          { code: String(form.get("code")), trustDevice: false },
        );
        window.location.assign("/courses");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <aside className="auth-story">
        <Brand light />
        <div>
          <span className="eyebrow">A space to learn</span>
          <h1>
            Great things
            <br />
            begin with
            <br />
            <em>curiosity.</em>
          </h1>
          <p>
            Take your time. Find your focus.
            <br />
            Keep moving forward.
          </p>
        </div>
        <span className="auth-story-footer">
          YOUR LEARNING JOURNEY, ONE LESSON AT A TIME.
        </span>
      </aside>
      <section className="auth-main">
        <Link href="/" className="back-link">
          ← Back to Streamify
        </Link>
        <div className="auth-card">
          <span className="auth-icon">
            <LockKeyhole size={23} />
          </span>
          <span className="eyebrow">{c.eyebrow}</span>
          <h2>{c.title}</h2>
          <p>{c.description}</p>
          <form onSubmit={submit}>
            {mode === "invite" && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </label>
            )}
            {["login", "invite", "forgot"].includes(mode) && (
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </label>
            )}
            {["login", "invite", "reset"].includes(mode) && (
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={mode === "login" ? 1 : 12}
                  maxLength={128}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder={
                    mode === "login"
                      ? "Enter your password"
                      : "At least 12 characters"
                  }
                />
              </label>
            )}
            {mode === "mfa" && (
              <label>
                {backup ? "Recovery code" : "Authenticator code"}
                <input
                  name="code"
                  autoComplete="one-time-code"
                  inputMode={backup ? "text" : "numeric"}
                  required
                />
              </label>
            )}
            {mode === "login" && (
              <Link className="form-link" href="/forgot-password">
                Forgot your password?
              </Link>
            )}
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
            {success && (
              <div className="notice success" role="status">
                {success}
              </div>
            )}
            <button className="button full" disabled={busy}>
              {busy ? "Please wait…" : c.button}
              <ArrowRight size={17} />
            </button>
          </form>
          {mode === "mfa" && (
            <button className="text-button" onClick={() => setBackup(!backup)}>
              {backup ? "Use an authenticator code" : "Use a recovery code"}
            </button>
          )}
          {mode !== "login" && (
            <p className="auth-note">
              <Link href="/login">Return to sign in</Link>
            </p>
          )}
          {mode === "login" && (
            <p className="auth-note">
              New here? Ask your institution for an invitation.
              <br />
              <button
                className="text-button inline"
                onClick={async () => {
                  const email = window.prompt(
                    "Enter your account email to resend verification:",
                  );
                  if (!email) return;
                  setError("");
                  try {
                    await request("/api/auth/send-verification-email", {
                      email,
                      callbackURL: "/login?verified=1",
                    });
                    setSuccess(
                      "If eligible, a verification email has been sent.",
                    );
                  } catch {
                    setError(
                      "Unable to send verification. Please retry later.",
                    );
                  }
                }}
              >
                Resend verification email
              </button>
            </p>
          )}
          <div className="auth-privacy">
            <LockKeyhole size={13} /> Your institution’s invitation-only
            learning space.<Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
