import Link from "next/link";
import { pageViewer } from "@/lib/page-auth";
import { rows } from "@/lib/db";
import { AccountPanel } from "@/components/account-panel";
export default async function Account() {
  const user = await pageViewer({ allowMfaSetup: true });
  const [browsers, playbacks, sessions] = await Promise.all([
    rows<{ id: string; label: string; created_at: Date; expires_at: Date }>(
      "SELECT id,label,created_at,expires_at FROM trusted_browsers WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC",
      [user.id],
    ),
    rows<{ id: string; title: string; expires_at: Date }>(
      "SELECT p.id,l.title,p.expires_at FROM playback_sessions p JOIN lessons l ON l.id=p.lesson_id WHERE p.user_id=$1 AND p.revoked_at IS NULL AND p.expires_at>now()",
      [user.id],
    ),
    rows<{ id: string; created_at: Date; expires_at: Date }>(
      'SELECT id,"createdAt" AS created_at,"expiresAt" AS expires_at FROM session WHERE "userId"=$1 AND "expiresAt">now() ORDER BY "createdAt" DESC',
      [user.id],
    ),
  ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Your personal space</span>
          <h1>
            Account security<span className="accent">.</span>
          </h1>
          <p>
            Keep your learning space yours. Verify a browser, review activity,
            and manage access.
          </p>
        </div>
      </div>
      <div className="notice neutral">
        New here?{" "}
        {user.role === "admin"
          ? "Set up your authenticator and verify this browser before opening administration."
          : "Verify this browser to access your courses."}{" "}
        <Link href={user.role === "admin" ? "/admin" : "/courses"}>
          Continue to {user.role === "admin" ? "administration" : "courses"} →
        </Link>
      </div>
      <AccountPanel
        initial={{
          browsers: browsers.map((b) => ({
            ...b,
            created_at: b.created_at.toISOString(),
            expires_at: b.expires_at.toISOString(),
          })),
          playbacks: playbacks.map((p) => ({
            ...p,
            expires_at: p.expires_at.toISOString(),
          })),
          sessions: sessions.map((s) => ({
            ...s,
            created_at: s.created_at.toISOString(),
            expires_at: s.expires_at.toISOString(),
          })),
          currentSessionId: user.sessionId,
          mfaEnabled: user.twoFactorEnabled,
          isAdmin: user.role === "admin",
        }}
      />
    </>
  );
}
