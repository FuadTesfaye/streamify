import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db, tx } from "../../src/lib/db";
import { launchPlayback, heartbeat } from "../../src/lib/playback";
import { type Viewer } from "../../src/lib/authorization";
const enabled = process.env.RUN_INTEGRATION === "1";
// Run only against an explicitly selected disposable database that has been migrated.
describe(
  "PostgreSQL playback authorization and concurrency",
  { skip: !enabled },
  () => {
    const prefix = randomUUID();
    const userId = `test-${prefix}`,
      sessionId = `session-${prefix}`,
      browserId = `browser-${prefix}`,
      courseId = `course-${prefix}`,
      lessonId = `lesson-${prefix}`;
    const user: Viewer = {
      id: userId,
      email: `${prefix}@example.test`,
      name: "Integration student",
      role: "student",
      status: "active",
      twoFactorEnabled: false,
      sessionId,
      browserId,
    };
    before(async () => {
      assert.ok(
        process.env.DATABASE_URL?.includes("streamify_test"),
        "Use a database whose name contains streamify_test",
      );
      await tx(async (c) => {
        await c.query(
          'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt",role,status,"twoFactorEnabled") VALUES($1,$2,$3,true,now(),now(),\'student\',\'active\',false)',
          [userId, user.name, user.email],
        );
        await c.query(
          'INSERT INTO session(id,token,"userId","expiresAt","createdAt","updatedAt") VALUES($1,$2,$3,now()+interval \'8 hours\',now(),now())',
          [sessionId, randomUUID(), userId],
        );
        await c.query("INSERT INTO login_activity(session_id) VALUES($1)", [
          sessionId,
        ]);
        await c.query(
          "INSERT INTO trusted_browsers(id,user_id,token_hash,label,expires_at) VALUES($1,$2,$3,'Test browser',now()+interval '30 days')",
          [browserId, userId, randomUUID()],
        );
        await c.query(
          "INSERT INTO courses(id,title,published) VALUES($1,'Test course',true)",
          [courseId],
        );
        await c.query(
          "INSERT INTO lessons(id,course_id,title,position,video_id,published) VALUES($1,$2,'Test lesson',1,'Abc_def-123',true)",
          [lessonId, courseId],
        );
        await c.query(
          "INSERT INTO enrollments(user_id,course_id) VALUES($1,$2)",
          [userId, courseId],
        );
      });
    });
    after(async () => {
      await db.query('DELETE FROM "user" WHERE id=$1', [userId]);
      await db.query("DELETE FROM courses WHERE id=$1", [courseId]);
      await db.end();
    });
    test("racing launches create exactly one active playback", async () => {
      const results = await Promise.allSettled([
        launchPlayback(user, lessonId),
        launchPlayback(user, lessonId),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      const rejected = results.find(
        (r) => r.status === "rejected",
      ) as PromiseRejectedResult;
      assert.equal(rejected.reason.code, "PLAYBACK_LIMIT");
      const session = (
        results.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<
          Awaited<ReturnType<typeof launchPlayback>>
        >
      ).value;
      assert.equal(session.videoId, "Abc_def-123");
      assert.equal(session.provider, "youtube");
      await heartbeat(user, session.playbackSessionId);
      await assert.rejects(
        heartbeat(
          { ...user, sessionId: "different-session" },
          session.playbackSessionId,
        ),
      );
      await db.query(
        "UPDATE playback_sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",
        [userId],
      );
      await assert.rejects(heartbeat(user, session.playbackSessionId), {
        code: "PLAYBACK_EXPIRED",
      });
    });
    test("revoked enrollment cannot launch or renew playback", async () => {
      const session = await launchPlayback(user, lessonId);
      await db.query("UPDATE enrollments SET active=false WHERE user_id=$1", [
        userId,
      ]);
      await assert.rejects(heartbeat(user, session.playbackSessionId), {
        code: "LESSON_ACCESS_DENIED",
      });
      await assert.rejects(launchPlayback(user, lessonId), {
        code: "LESSON_ACCESS_DENIED",
      });
      await db.query("UPDATE enrollments SET active=true WHERE user_id=$1", [
        userId,
      ]);
      await db.query(
        "UPDATE playback_sessions SET revoked_at=now() WHERE user_id=$1",
        [userId],
      );
    });
    test("draft lessons and courses never grant access", async () => {
      await db.query("UPDATE lessons SET published=false WHERE id=$1", [
        lessonId,
      ]);
      await assert.rejects(launchPlayback(user, lessonId), {
        code: "LESSON_ACCESS_DENIED",
      });
      await db.query("UPDATE lessons SET published=true WHERE id=$1", [
        lessonId,
      ]);
      await db.query("UPDATE courses SET published=false WHERE id=$1", [
        courseId,
      ]);
      await assert.rejects(launchPlayback(user, lessonId), {
        code: "LESSON_ACCESS_DENIED",
      });
      await db.query("UPDATE courses SET published=true WHERE id=$1", [
        courseId,
      ]);
    });
    test("suspended accounts and revoked browsers fail inside the locked transaction", async () => {
      await db.query("UPDATE \"user\" SET status='suspended' WHERE id=$1", [
        userId,
      ]);
      await assert.rejects(launchPlayback(user, lessonId), {
        code: "SESSION_REVOKED",
      });
      await db.query("UPDATE \"user\" SET status='active' WHERE id=$1", [
        userId,
      ]);
      await db.query(
        "UPDATE trusted_browsers SET revoked_at=now() WHERE id=$1",
        [browserId],
      );
      await assert.rejects(launchPlayback(user, lessonId), {
        code: "SESSION_REVOKED",
      });
      await db.query(
        "UPDATE trusted_browsers SET revoked_at=NULL WHERE id=$1",
        [browserId],
      );
    });
    test("MFA enabled on an account is insufficient without a verified login session", async () => {
      await db.query(
        'UPDATE "user" SET role=\'admin\',"twoFactorEnabled"=true WHERE id=$1',
        [userId],
      );
      await assert.rejects(launchPlayback(user, lessonId), {
        code: "SESSION_REVOKED",
      });
      await db.query("INSERT INTO session_mfa(session_id) VALUES($1)", [
        sessionId,
      ]);
      const session = await launchPlayback(user, lessonId);
      await heartbeat(user, session.playbackSessionId);
      await db.query(
        "UPDATE playback_sessions SET revoked_at=now() WHERE user_id=$1",
        [userId],
      );
      await db.query(
        'UPDATE "user" SET role=\'student\',"twoFactorEnabled"=false WHERE id=$1',
        [userId],
      );
    });
    test("idle and deleted login sessions fail inside the locked transaction", async () => {
      await db.query(
        "UPDATE login_activity SET last_seen=now()-interval '31 minutes' WHERE session_id=$1",
        [sessionId],
      );
      await assert.rejects(launchPlayback(user, lessonId), {
        code: "SESSION_REVOKED",
      });
      await db.query(
        "UPDATE login_activity SET last_seen=now() WHERE session_id=$1",
        [sessionId],
      );
      await db.query("DELETE FROM session WHERE id=$1", [sessionId]);
      await assert.rejects(launchPlayback(user, lessonId), {
        code: "SESSION_REVOKED",
      });
    });
  },
);
if (!enabled) await db.end();
