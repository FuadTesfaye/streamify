import { pageViewer } from "@/lib/page-auth";
import { rows } from "@/lib/db";
import { securityAlerts } from "@/lib/alerts";
import {
  AdminPanel,
  type AdminCourse,
  type AdminLesson,
  type AdminUser,
} from "@/components/admin-panel";
export default async function Admin() {
  await pageViewer({ trusted: true, admin: true });
  const [courses, lessons, users, events, browsers, playbacks, clock] =
    await Promise.all([
      rows<AdminCourse>(
        "SELECT id,title,description,category,published FROM courses ORDER BY created_at DESC",
      ),
      rows<AdminLesson>(
        "SELECT id,course_id,title,description,position,video_id,published FROM lessons ORDER BY course_id,position",
      ),
      rows<AdminUser>(
        `SELECT u.id,u.name,u.email,u.role,u.status,(SELECT count(*)::int FROM trusted_browsers b WHERE b.user_id=u.id AND b.revoked_at IS NULL AND b.expires_at>now()) AS browser_count,(SELECT count(*)::int FROM session s WHERE s."userId"=u.id AND s."expiresAt">now()) AS session_count,(SELECT count(*)::int FROM playback_sessions p WHERE p.user_id=u.id AND p.revoked_at IS NULL AND p.expires_at>now()) AS playback_count FROM "user" u ORDER BY u."createdAt" DESC`,
      ),
      rows<{
        id: string;
        kind: string;
        user_id: string | null;
        reference: string | null;
        created_at: Date;
      }>(
        "SELECT id::text,kind,user_id,reference,created_at FROM security_events ORDER BY created_at DESC LIMIT 100",
      ),
      rows<{ id: string; user_id: string; label: string; expires_at: Date }>(
        "SELECT id,user_id,label,expires_at FROM trusted_browsers WHERE revoked_at IS NULL AND expires_at>now()",
      ),
      rows<{
        id: string;
        user_id: string;
        lesson_title: string;
        expires_at: Date;
      }>(
        "SELECT p.id,p.user_id,l.title AS lesson_title,p.expires_at FROM playback_sessions p JOIN lessons l ON l.id=p.lesson_id WHERE p.revoked_at IS NULL AND p.expires_at>now()",
      ),
      rows<{ now: Date }>("SELECT now() AS now"),
    ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Institution workspace</span>
          <h1>
            A thoughtful place to manage<span className="accent">.</span>
          </h1>
          <p>
            Curate your courses, welcome students, and keep an eye on access.
          </p>
        </div>
      </div>
      <AdminPanel
        alerts={securityAlerts(events, clock[0].now.getTime())}
        courses={courses}
        lessons={lessons}
        users={users}
        events={events.map((e) => ({
          ...e,
          created_at: e.created_at.toISOString(),
        }))}
        browsers={browsers.map((b) => ({
          ...b,
          expires_at: b.expires_at.toISOString(),
        }))}
        playbacks={playbacks.map((p) => ({
          ...p,
          expires_at: p.expires_at.toISOString(),
        }))}
      />
    </>
  );
}
