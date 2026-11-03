"use client";
import { useState } from "react";
import { Monitor, ShieldCheck, KeyRound, Mail, X } from "lucide-react";
import { request } from "./client-api";
type Account = {
  browsers: {
    id: string;
    label: string;
    created_at: string;
    expires_at: string;
  }[];
  playbacks: { id: string; title: string; expires_at: string }[];
  sessions: { id: string; created_at: string; expires_at: string }[];
  currentSessionId: string;
  mfaEnabled: boolean;
  isAdmin: boolean;
};
export function AccountPanel({ initial }: { initial: Account }) {
  const [data, setData] = useState(initial),
    [challenge, setChallenge] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [setup, setSetup] = useState<{
      totpURI: string;
      backupCodes: string[];
    } | null>(null);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setData(await request<Account>("/api/account", undefined, "GET"));
  }
  const date = (v: string) =>
    new Date(v).toLocaleDateString("en", { dateStyle: "medium" });
  return (
    <>
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
      <div className="account-grid">
        <section className="panel">
          <div className="panel-title">
            <Monitor size={21} />
            <div>
              <h2>Verify this browser</h2>
              <p>Up to two registered browsers per account.</p>
            </div>
          </div>
          <p className="muted">
            A new browser needs a code sent to your account email. Registrations
            last 30 days.
          </p>
          {!challenge ? (
            <button
              disabled={busy}
              className="button secondary"
              onClick={() =>
                run(async () => {
                  const result = await request<{ challengeId: string }>(
                    "/api/browsers/challenge",
                    {},
                  );
                  setChallenge(result.challengeId);
                  setSuccess(
                    "A verification code has been sent to your email.",
                  );
                })
              }
            >
              <Mail size={16} /> Send verification code
            </button>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const f = new FormData(event.currentTarget);
                void run(async () => {
                  await request("/api/browsers/verify", {
                    challengeId: challenge,
                    code: String(f.get("code")),
                    label: String(f.get("label")),
                  });
                  setChallenge("");
                  await refresh();
                  setSuccess(
                    "This browser is verified. You can open your courses.",
                  );
                });
              }}
            >
              <label>
                Browser name
                <input
                  name="label"
                  placeholder="My laptop"
                  maxLength={80}
                  required
                />
              </label>
              <label>
                Email verification code
                <input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                />
              </label>
              <div className="button-row">
                <button className="button" disabled={busy}>
                  Verify browser
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setChallenge("")}
                >
                  Start over
                </button>
              </div>
            </form>
          )}
        </section>
        <section className="panel">
          <div className="panel-title">
            <KeyRound size={21} />
            <div>
              <h2>Two-factor authentication</h2>
              <p>
                {data.mfaEnabled
                  ? "Enabled on your account"
                  : data.isAdmin
                    ? "Required for administrators"
                    : "An extra layer of account protection"}
              </p>
            </div>
          </div>
          {setup ? (
            <>
              <p>
                Add this setup key to an authenticator app. Store the recovery
                codes somewhere safe.
              </p>
              <label>
                Authenticator setup URI
                <textarea readOnly value={setup.totpURI} rows={3} />
              </label>
              <details>
                <summary>Show recovery codes</summary>
                <pre className="recovery-codes">
                  {setup.backupCodes.join("\n")}
                </pre>
              </details>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const f = new FormData(event.currentTarget);
                  void run(async () => {
                    await request("/api/auth/two-factor/verify-totp", {
                      code: String(f.get("code")),
                    });
                    setSetup(null);
                    await refresh();
                    setSuccess("Authenticator verified. MFA is now enabled.");
                  });
                }}
              >
                <label>
                  Code from your authenticator
                  <input
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    required
                  />
                </label>
                <button className="button" disabled={busy}>
                  Confirm authenticator
                </button>
              </form>
            </>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const f = new FormData(event.currentTarget);
                void run(async () => {
                  if (data.mfaEnabled) {
                    await request("/api/auth/two-factor/disable", {
                      password: String(f.get("password")),
                    });
                    await refresh();
                    setSuccess("MFA disabled.");
                  } else {
                    setSetup(
                      await request("/api/auth/two-factor/enable", {
                        password: String(f.get("password")),
                        method: "totp",
                      }),
                    );
                  }
                });
              }}
            >
              {(!data.mfaEnabled || !data.isAdmin) && (
                <>
                  <label>
                    Current password
                    <input
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                  </label>
                  <button className="button secondary" disabled={busy}>
                    {data.mfaEnabled ? "Disable MFA" : "Set up authenticator"}
                  </button>
                </>
              )}
              {data.mfaEnabled && data.isAdmin && (
                <p className="secure-label">
                  <ShieldCheck size={18} /> MFA is required and enabled.
                </p>
              )}
            </form>
          )}
        </section>
      </div>
      <section className="panel">
        <div className="section-heading compact">
          <h2>
            Registered browsers{" "}
            <span className="count">{data.browsers.length}/2</span>
          </h2>
        </div>
        {data.browsers.map((browser) => (
          <div className="resource-row" key={browser.id}>
            <Monitor size={20} />
            <div>
              <strong>{browser.label}</strong>
              <small>
                Added {date(browser.created_at)} · Expires{" "}
                {date(browser.expires_at)}
              </small>
            </div>
            <button
              className="button danger small"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await request(
                    `/api/account/browsers/${browser.id}`,
                    undefined,
                    "DELETE",
                  );
                  await refresh();
                  setSuccess(
                    "Browser revoked. Any playback on it has been terminated.",
                  );
                })
              }
            >
              Revoke <X size={14} />
            </button>
          </div>
        ))}
        {!data.browsers.length && (
          <p className="muted">No registered browsers yet.</p>
        )}
      </section>
      <section className="panel">
        <h2>Active playback</h2>
        {data.playbacks.map((p) => (
          <div className="resource-row" key={p.id}>
            <div>
              <strong>{p.title}</strong>
              <small>Session {p.id.slice(0, 8).toUpperCase()}</small>
            </div>
            <button
              className="button danger small"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await request(
                    `/api/account/playbacks/${p.id}`,
                    undefined,
                    "DELETE",
                  );
                  await refresh();
                  setSuccess("Playback terminated.");
                })
              }
            >
              End playback
            </button>
          </div>
        ))}
        {!data.playbacks.length && (
          <p className="muted">No active playback sessions.</p>
        )}
      </section>
      <section className="panel">
        <h2>Signed-in sessions</h2>
        {data.sessions.map((s) => (
          <div className="resource-row" key={s.id}>
            <div>
              <strong>
                {s.id === data.currentSessionId
                  ? "This login session"
                  : "Another login session"}
              </strong>
              <small>
                Started {date(s.created_at)} · Expires {date(s.expires_at)}
              </small>
            </div>
            <button
              className="button danger small"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await request(
                    `/api/account/sessions/${s.id}`,
                    undefined,
                    "DELETE",
                  );
                  if (s.id === data.currentSessionId)
                    window.location.assign("/login");
                  else await refresh();
                })
              }
            >
              Sign out
            </button>
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>Change password</h2>
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            const element = event.currentTarget;
            const f = new FormData(element);
            void run(async () => {
              await request("/api/auth/change-password", {
                currentPassword: String(f.get("current")),
                newPassword: String(f.get("new")),
                revokeOtherSessions: true,
              });
              element.reset();
              await refresh();
              setSuccess(
                "Password changed. Other login sessions have been revoked.",
              );
            });
          }}
        >
          <label>
            Current password
            <input
              name="current"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            New password
            <input
              name="new"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <button className="button secondary" disabled={busy}>
            Update password
          </button>
        </form>
      </section>
    </>
  );
}
