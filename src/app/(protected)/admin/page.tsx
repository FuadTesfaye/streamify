import { pageViewer } from "@/lib/page-auth";
import { rows } from "@/lib/db";
import { securityAlerts } from "@/lib/alerts";
import {
  AdminPanel,
  type AdminCourse,
  type AdminLesson,
  type AdminUser,
  type AdminEnrollment,
  type AdminInvitation,
  type AdminPlayback,
} from "@/components/admin-panel";

export default async function Admin() {
  await pageViewer({ trusted: true, admin: true });
  const [courses, lessons, users, events, browsers, playbacks, enrollments, invitations, clock] =
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
        user_email: string;
        lesson_title: string;
        course_title: string;
        created_at: Date;
        expires_at: Date;
      }>(
        `SELECT p.id, p.user_id, u.email as user_email, l.title AS lesson_title, c.title as course_title, p.created_at, p.expires_at
         FROM playback_sessions p
         JOIN lessons l ON l.id = p.lesson_id
         JOIN courses c ON c.id = l.course_id
         JOIN "user" u ON u.id = p.user_id
         WHERE p.revoked_at IS NULL AND p.expires_at > now()
         ORDER BY p.created_at DESC`,
      ),
      rows<AdminEnrollment>(
        `SELECT e.id, e.user_id, e.course_id, e.active, c.title as course_title, u.email as user_email
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         JOIN "user" u ON u.id = e.user_id
         ORDER BY c.title ASC`,
      ),
      rows<{
        id: string;
        email: string;
        course_id: string | null;
        course_title: string | null;
        accepted_at: Date | null;
        expires_at: Date;
        created_at: Date;
      }>(
        `SELECT i.id, i.email, i.course_id, c.title as course_title, i.accepted_at, i.expires_at, i.created_at
         FROM invitations i
         LEFT JOIN courses c ON c.id = i.course_id
         ORDER BY i.created_at DESC LIMIT 20`,
      ),
      rows<{ now: Date }>("SELECT now() AS now"),
    ]);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Gateway Command Center</span>
          <h1>
            Administration & Video Gateway<span className="accent">.</span>
          </h1>
          <p>
            Manage private courses, student enrollments, live playback leases, and ephemeral embed tokens.
          </p>
        </div>
      </div>
      <AdminPanel
        alerts={securityAlerts(events, clock[0].now.getTime())}
        courses={courses}
        lessons={lessons}
        users={users}
        enrollments={enrollments}
        invitations={invitations.map((i) => ({
          ...i,
          accepted_at: i.accepted_at ? i.accepted_at.toISOString() : null,
          expires_at: i.expires_at.toISOString(),
          created_at: i.created_at.toISOString(),
        }))}
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
          created_at: p.created_at.toISOString(),
          expires_at: p.expires_at.toISOString(),
        }))}
      />
    </>
  );
}
