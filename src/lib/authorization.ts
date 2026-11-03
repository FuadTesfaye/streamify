import { cookies, headers } from "next/headers";
import type { PoolClient } from "pg";
import { getAuth } from "./auth";
import { db, rows } from "./db";
import { assert } from "./errors";
import { deviceCookie, hash } from "./tokens";
import { audit } from "./security";
import { sessionAlive } from "./policy";
export type Viewer = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  twoFactorEnabled: boolean;
  sessionId: string;
  browserId?: string;
};
export async function requireViewer(
  options: { trusted?: boolean; admin?: boolean; allowMfaSetup?: boolean } = {},
): Promise<Viewer> {
  const session = await getAuth().api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
  assert(session, 401, "LOGIN_REQUIRED");
  const [user] = await rows<{
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    twoFactorEnabled: boolean;
  }>(
    'SELECT id,email,name,role,status,"twoFactorEnabled" FROM "user" WHERE id=$1',
    [session.user.id],
  );
  assert(
    user && user.status === "active" && session.user.emailVerified,
    403,
    "ACCOUNT_UNAVAILABLE",
  );
  const [activity] = await rows<{ last_seen: Date }>(
    "INSERT INTO login_activity (session_id,last_seen) VALUES ($1,$2) ON CONFLICT(session_id) DO UPDATE SET last_seen=login_activity.last_seen RETURNING last_seen",
    [session.session.id, session.session.createdAt],
  );
  if (!sessionAlive(new Date(session.session.createdAt), activity.last_seen)) {
    await db.query("DELETE FROM session WHERE id=$1", [session.session.id]);
    await audit("login_expired", user.id);
    assert(false, 401, "SESSION_EXPIRED");
  }
  await db.query(
    "UPDATE login_activity SET last_seen=now() WHERE session_id=$1",
    [session.session.id],
  );
  if (options.admin) assert(user.role === "admin", 403, "ADMIN_REQUIRED");
  if (user.role === "admin" && !options.allowMfaSetup)
    assert(user.twoFactorEnabled, 403, "MFA_SETUP_REQUIRED");
  if (user.twoFactorEnabled && !options.allowMfaSetup) {
    const [verified] = await rows(
      "SELECT session_id FROM session_mfa WHERE session_id=$1",
      [session.session.id],
    );
    assert(verified, 403, "MFA_VERIFICATION_REQUIRED");
  }
  const viewer: Viewer = { ...user, sessionId: session.session.id };
  if (options.trusted) {
    const credential = (await cookies()).get(deviceCookie)?.value;
    assert(credential, 403, "BROWSER_VERIFICATION_REQUIRED");
    const [browser] = await rows<{ id: string }>(
      "SELECT id FROM trusted_browsers WHERE user_id=$1 AND token_hash=$2 AND revoked_at IS NULL AND expires_at>now()",
      [user.id, hash(credential)],
    );
    assert(browser, 403, "BROWSER_VERIFICATION_REQUIRED");
    viewer.browserId = browser.id;
  }
  return viewer;
}
export interface AuthorizedLesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  video_id: string;
  provider: "youtube" | "mux" | "cloudflare";
  visibility: "free" | "paid";
  playback_policy: "public" | "signed" | "drm";
  is_premium: boolean;
  price: number;
  expires_at: Date | null;
}

export async function authorizeLesson(
  user: Viewer,
  lessonId: string,
  client: PoolClient | typeof db = db,
): Promise<AuthorizedLesson> {
  // Repeat mutable checks inside the account lock for playback operations.
  const [lesson] = await rows<AuthorizedLesson>(
    `SELECT l.id, l.course_id, l.title, l.description, l.video_id,
            COALESCE(l.provider, 'youtube') as provider,
            COALESCE(l.visibility, 'free') as visibility,
            COALESCE(l.playback_policy, 'public') as playback_policy,
            COALESCE(c.is_premium, false) as is_premium,
            COALESCE(c.price, 0) as price,
            e.expires_at
     FROM lessons l
     JOIN courses c ON c.id=l.course_id
     JOIN enrollments e ON e.course_id=c.id
     JOIN "user" u ON u.id=e.user_id
     WHERE l.id=$1 AND e.user_id=$2 AND e.active AND l.published AND c.published AND u.status='active'`,
    [lessonId, user.id],
    client,
  );
  assert(lesson, 403, "LESSON_ACCESS_DENIED");

  if (lesson.expires_at && new Date(lesson.expires_at).getTime() < Date.now()) {
    assert(
      false,
      403,
      "ENROLLMENT_EXPIRED",
      "Your course access has expired. Please renew your enrollment.",
    );
  }

  return lesson;
}
export async function lockAccount(client: PoolClient, userId: string) {
  await client.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [userId]);
}
export async function checkLockedSession(client: PoolClient, user: Viewer) {
  const [valid] = await rows(
    `SELECT s.id FROM session s JOIN "user" u ON u.id=s."userId" JOIN trusted_browsers b ON b.user_id=u.id JOIN login_activity a ON a.session_id=s.id WHERE s.id=$1 AND u.id=$2 AND b.id=$3 AND u.status='active' AND s."expiresAt">now() AND s."createdAt">now()-interval '8 hours' AND a.last_seen>now()-interval '30 minutes' AND b.revoked_at IS NULL AND b.expires_at>now() AND (u.role<>'admin' OR u."twoFactorEnabled") AND (NOT u."twoFactorEnabled" OR EXISTS(SELECT 1 FROM session_mfa m WHERE m.session_id=s.id))`,
    [user.sessionId, user.id, user.browserId],
    client,
  );
  assert(valid, 403, "SESSION_REVOKED");
}
