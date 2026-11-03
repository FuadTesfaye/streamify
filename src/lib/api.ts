import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomInt, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { db, rows, tx } from "./db";
import { getAuth } from "./auth";
import { requireViewer, lockAccount, type Viewer } from "./authorization";
import { assert, AppError } from "./errors";
import { jsonBody } from "./http";
import { config } from "./config";
import { audit, rateLimit, requestIp } from "./security";
import { sendMail } from "./mail";
import {
  token,
  hash,
  otpHash,
  matches,
  deviceCookie,
  cookieOptions,
} from "./tokens";
import { normalizeVideo, MAX_BROWSERS } from "./policy";
import { launchPlayback, heartbeat, releasePlayback } from "./playback";
const emailSchema = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
const idSchema = z.string().min(1).max(128);
const titleSchema = z.string().trim().min(1).max(180);
const ok = () => NextResponse.json({ ok: true });

async function acceptInvitation(request: Request) {
  await rateLimit("registration", requestIp(request), 10, 300);
  const body = z
    .object({
      token: z.string().min(32).max(128),
      name: z.string().trim().min(2).max(100),
      email: emailSchema,
      password: z.string().min(12).max(128),
    })
    .parse(await jsonBody(request));
  await rateLimit("registration-email", body.email, 4, 3600);
  const password = await hashPassword(body.password);
  await tx(async (client) => {
    const [invite] = await rows<{ id: string; course_id: string | null }>(
      "SELECT id,course_id FROM invitations WHERE token_hash=$1 AND email=$2 AND accepted_at IS NULL AND expires_at>now() FOR UPDATE",
      [hash(body.token), body.email],
      client,
    );
    assert(
      invite,
      403,
      "INVITATION_INVALID",
      "This invitation is invalid, expired, or belongs to another email.",
    );
    const id = randomUUID();
    await client.query(
      'INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt",role,status,"twoFactorEnabled") VALUES($1,$2,$3,false,now(),now(),\'student\',\'active\',false)',
      [id, body.name, body.email],
    );
    await client.query(
      'INSERT INTO account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2,\'credential\',$2,$3,now(),now())',
      [randomUUID(), id, password],
    );
    if (invite.course_id)
      await client.query(
        "INSERT INTO enrollments(user_id,course_id) VALUES($1,$2)",
        [id, invite.course_id],
      );
    await client.query("UPDATE invitations SET accepted_at=now() WHERE id=$1", [
      invite.id,
    ]);
    await audit("invitation_accepted", id, invite.id, client);
  });
  // If mail fails the account is safely created; login can resend verification.
  let verificationEmailSent = true;
  try {
    await getAuth().api.sendVerificationEmail({
      body: { email: body.email, callbackURL: "/login?verified=1" },
    });
  } catch {
    verificationEmailSent = false;
    await audit("verification_delivery_failed");
  }
  return NextResponse.json(
    { ok: true, verificationEmailSent },
    { status: 201 },
  );
}
async function challengeBrowser(user: Viewer) {
  await rateLimit("browser-email", user.id, 3, 600);
  const id = randomUUID(),
    code = String(randomInt(100000, 1000000));
  await tx(async (client) => {
    await lockAccount(client, user.id);
    await client.query(
      "UPDATE browser_challenges SET used_at=now() WHERE session_id=$1 AND used_at IS NULL",
      [user.sessionId],
    );
    await client.query(
      "INSERT INTO browser_challenges(id,user_id,session_id,code_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '10 minutes')",
      [
        id,
        user.id,
        user.sessionId,
        otpHash(code, id, config().BETTER_AUTH_SECRET),
      ],
    );
    await audit("browser_challenged", user.id, undefined, client);
  });
  await sendMail(
    user.email,
    "Verify this Streamify browser",
    `Your verification code is ${code}. It expires in 10 minutes. If this was not you, change your password and revoke your sessions.`,
  );
  return NextResponse.json({ challengeId: id });
}
async function verifyBrowser(request: Request, user: Viewer) {
  await rateLimit("browser-verify", user.id, 20, 600);
  const body = z
    .object({
      challengeId: z.uuid(),
      code: z.string().regex(/^\d{6}$/),
      label: z.string().trim().min(1).max(80),
    })
    .parse(await jsonBody(request));
  const credential = token();
  const result = await tx(async (client) => {
    await lockAccount(client, user.id);
    const [challenge] = await rows<{ code_hash: string; attempts: number }>(
      "SELECT code_hash,attempts FROM browser_challenges WHERE id=$1 AND user_id=$2 AND session_id=$3 AND used_at IS NULL AND expires_at>now() FOR UPDATE",
      [body.challengeId, user.id, user.sessionId],
      client,
    );
    if (!challenge || challenge.attempts >= 5) return "INVALID_CODE";
    await client.query(
      "UPDATE browser_challenges SET attempts=attempts+1 WHERE id=$1",
      [body.challengeId],
    );
    if (
      !matches(
        challenge.code_hash,
        otpHash(body.code, body.challengeId, config().BETTER_AUTH_SECRET),
      )
    )
      return "INVALID_CODE";
    const [count] = await rows<{ count: number }>(
      "SELECT count(*)::int AS count FROM trusted_browsers WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now()",
      [user.id],
      client,
    );
    if (count.count >= MAX_BROWSERS) return "BROWSER_LIMIT";
    await client.query(
      "INSERT INTO trusted_browsers(user_id,token_hash,label,expires_at) VALUES($1,$2,$3,now()+interval '30 days')",
      [user.id, hash(credential), body.label],
    );
    await client.query(
      "UPDATE browser_challenges SET used_at=now() WHERE id=$1",
      [body.challengeId],
    );
    await audit("browser_trusted", user.id, undefined, client);
    return "OK";
  });
  assert(
    result === "OK",
    result === "BROWSER_LIMIT" ? 409 : 403,
    result,
    result === "BROWSER_LIMIT"
      ? "Two browsers are already registered. Revoke one below and retry."
      : "The verification code is invalid or expired.",
  );
  (await cookies()).set(deviceCookie, credential, cookieOptions);
  return ok();
}
async function accountSnapshot(user: Viewer) {
  const [browsers, playbacks, sessions] = await Promise.all([
    rows(
      "SELECT id,label,created_at,expires_at FROM trusted_browsers WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC",
      [user.id],
    ),
    rows(
      "SELECT p.id,l.title,p.expires_at FROM playback_sessions p JOIN lessons l ON l.id=p.lesson_id WHERE p.user_id=$1 AND p.revoked_at IS NULL AND p.expires_at>now()",
      [user.id],
    ),
    rows(
      'SELECT id,"createdAt" AS created_at,"expiresAt" AS expires_at FROM session WHERE "userId"=$1 AND "expiresAt">now() ORDER BY "createdAt" DESC',
      [user.id],
    ),
  ]);
  return NextResponse.json({
    browsers,
    playbacks,
    sessions,
    currentSessionId: user.sessionId,
    mfaEnabled: user.twoFactorEnabled,
    isAdmin: user.role === "admin",
  });
}
async function revokeResource(user: Viewer, type: string, id: string) {
  await tx(async (client) => {
    await lockAccount(client, user.id);
    if (type === "browsers") {
      await client.query(
        "UPDATE trusted_browsers SET revoked_at=now() WHERE id=$1 AND user_id=$2",
        [id, user.id],
      );
      await client.query(
        "UPDATE playback_sessions SET revoked_at=now() WHERE browser_id=$1 AND user_id=$2",
        [id, user.id],
      );
    } else if (type === "playbacks")
      await client.query(
        "UPDATE playback_sessions SET revoked_at=now() WHERE id=$1 AND user_id=$2",
        [id, user.id],
      );
    else if (type === "sessions")
      await client.query('DELETE FROM session WHERE id=$1 AND "userId"=$2', [
        id,
        user.id,
      ]);
    else throw new AppError(404, "NOT_FOUND");
    await audit(`${type}_revoked`, user.id, undefined, client);
  });
  return ok();
}
const courseSchema = z.object({
  title: titleSchema,
  description: z.string().max(10000),
  category: z.string().trim().min(1).max(80),
  published: z.boolean(),
  price: z.number().int().min(0).default(0),
  isPremium: z.boolean().default(false),
  currency: z.string().trim().min(3).max(5).default("usd"),
});
const lessonSchema = z.object({
  courseId: idSchema,
  title: titleSchema,
  description: z.string().max(10000),
  position: z.number().int().min(1).max(10000),
  video: z.string().max(500),
  published: z.boolean(),
  provider: z.enum(["youtube", "mux", "cloudflare"]).default("youtube"),
  visibility: z.enum(["free", "paid"]).default("free"),
  playbackPolicy: z.enum(["public", "signed", "drm"]).default("public"),
});
async function adminMutation(request: Request, path: string[], user: Viewer) {
  await rateLimit("admin", user.id, 60);

  if (request.method === "DELETE" && path[1] === "courses" && path[2]) {
    await tx(async (client) => {
      await client.query("DELETE FROM enrollments WHERE course_id=$1", [path[2]]);
      await client.query(
        "DELETE FROM playback_sessions WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id=$1)",
        [path[2]],
      );
      await client.query("DELETE FROM lessons WHERE course_id=$1", [path[2]]);
      await client.query("DELETE FROM courses WHERE id=$1", [path[2]]);
      await audit("course_deleted", user.id, path[2], client);
    });
    return ok();
  }

  if (request.method === "DELETE" && path[1] === "lessons" && path[2]) {
    await tx(async (client) => {
      await client.query("DELETE FROM playback_sessions WHERE lesson_id=$1", [path[2]]);
      await client.query("DELETE FROM lessons WHERE id=$1", [path[2]]);
      await audit("lesson_deleted", user.id, path[2], client);
    });
    return ok();
  }

  if (path[1] === "playbacks" && path[2]) {
    await tx(async (client) => {
      await client.query(
        "UPDATE playback_sessions SET revoked_at=now() WHERE id=$1",
        [path[2]],
      );
      await audit("playback_terminated_by_admin", user.id, path[2], client);
    });
    return ok();
  }

  if (path[1] === "prune") {
    await tx(async (client) => {
      await client.query(
        "DELETE FROM security_events WHERE created_at < now() - interval '30 days'",
      );
      await audit("events_pruned", user.id, undefined, client);
    });
    return ok();
  }

  const body = await jsonBody(request);

  if (path[1] === "invitations" && path[2] === "link") {
    const data = z
      .object({ email: emailSchema, courseId: idSchema.optional() })
      .parse(body);
    const credential = token();
    const existing = await rows('SELECT id FROM "user" WHERE email=$1', [
      data.email,
    ]);
    assert(
      !existing.length,
      409,
      "ALREADY_REGISTERED",
      "This student already has an account. Use enrollment management.",
    );
    await db.query(
      "INSERT INTO invitations(email,token_hash,course_id,expires_at) VALUES($1,$2,$3,now()+interval '7 days')",
      [data.email, hash(credential), data.courseId ?? null],
    );
    await audit("invitation_link_created", user.id);
    return NextResponse.json({
      ok: true,
      email: data.email,
      inviteUrl: `${config().APP_ORIGIN}/invite#${credential}`,
    });
  }

  if (path[1] === "courses") {
    const data = courseSchema.parse(body);
    if (path[2])
      await db.query(
        "UPDATE courses SET title=$1,description=$2,category=$3,published=$4,price=$5,is_premium=$6,currency=$7 WHERE id=$8",
        [
          data.title,
          data.description,
          data.category,
          data.published,
          data.price,
          data.isPremium,
          data.currency,
          path[2],
        ],
      );
    else
      await db.query(
        "INSERT INTO courses(title,description,category,published,price,is_premium,currency) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          data.title,
          data.description,
          data.category,
          data.published,
          data.price,
          data.isPremium,
          data.currency,
        ],
      );
    await audit("course_updated", user.id);
    return ok();
  }
  if (path[1] === "lessons") {
    const data = lessonSchema.parse(body);
    let video: string;
    if (data.provider === "youtube") {
      try {
        video = normalizeVideo(data.video);
      } catch {
        throw new AppError(
          400,
          "INVALID_VIDEO",
          "Enter a supported YouTube URL or video ID.",
        );
      }
    } else {
      video = data.video.trim();
      assert(
        video.length >= 4,
        400,
        "INVALID_VIDEO",
        "Enter a valid stream playback ID or asset identifier.",
      );
    }

    if (path[2])
      await db.query(
        "UPDATE lessons SET title=$1,description=$2,position=$3,video_id=$4,published=$5,provider=$6,visibility=$7,playback_policy=$8 WHERE id=$9 AND course_id=$10",
        [
          data.title,
          data.description,
          data.position,
          video,
          data.published,
          data.provider,
          data.visibility,
          data.playbackPolicy,
          path[2],
          data.courseId,
        ],
      );
    else
      await db.query(
        "INSERT INTO lessons(course_id,title,description,position,video_id,published,provider,visibility,playback_policy) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          data.courseId,
          data.title,
          data.description,
          data.position,
          video,
          data.published,
          data.provider,
          data.visibility,
          data.playbackPolicy,
        ],
      );
    await audit("lesson_updated", user.id);
    return ok();
  }
  if (path[1] === "entitlements") {
    if (request.method === "DELETE") {
      const data = z
        .object({ userId: idSchema, courseId: idSchema })
        .parse(body);
      await tx(async (client) => {
        await lockAccount(client, data.userId);
        await client.query(
          "UPDATE enrollments SET active=false WHERE user_id=$1 AND course_id=$2",
          [data.userId, data.courseId],
        );
        await client.query(
          "UPDATE playback_sessions SET revoked_at=now() WHERE user_id=$1 AND lesson_id IN (SELECT id FROM lessons WHERE course_id=$2)",
          [data.userId, data.courseId],
        );
        await audit(
          "entitlement_revoked_by_admin",
          user.id,
          `${data.userId}:${data.courseId}`,
          client,
        );
      });
      return ok();
    }

    const data = z
      .object({
        email: emailSchema,
        courseId: idSchema,
        durationMonths: z.number().int().min(0).max(120).nullable().optional(),
      })
      .parse(body);

    const [targetUser] = await rows<{ id: string }>(
      'SELECT id FROM "user" WHERE LOWER(email) = LOWER($1)',
      [data.email],
    );
    assert(
      targetUser,
      404,
      "USER_NOT_FOUND",
      "No student found with this email address.",
    );

    let expiresAt: Date | null = null;
    if (data.durationMonths && data.durationMonths > 0) {
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + data.durationMonths);
    }

    await tx(async (client) => {
      await lockAccount(client, targetUser.id);
      await client.query(
        `INSERT INTO enrollments(user_id, course_id, active, expires_at)
         VALUES ($1, $2, true, $3)
         ON CONFLICT (user_id, course_id)
         DO UPDATE SET active=true, expires_at=EXCLUDED.expires_at`,
        [targetUser.id, data.courseId, expiresAt],
      );
      await audit(
        "entitlement_granted_by_admin",
        user.id,
        `${targetUser.id}:${data.courseId}`,
        client,
      );
    });

    return NextResponse.json({
      ok: true,
      userId: targetUser.id,
      courseId: data.courseId,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    });
  }
  if (path[1] === "invitations") {
    const data = z
      .object({ email: emailSchema, courseId: idSchema.optional() })
      .parse(body);
    const credential = token();
    const existing = await rows('SELECT id FROM "user" WHERE email=$1', [
      data.email,
    ]);
    assert(
      !existing.length,
      409,
      "ALREADY_REGISTERED",
      "This student already has an account. Use enrollment management.",
    );
    await db.query(
      "INSERT INTO invitations(email,token_hash,course_id,expires_at) VALUES($1,$2,$3,now()+interval '7 days')",
      [data.email, hash(credential), data.courseId ?? null],
    );
    await sendMail(
      data.email,
      "Your invitation to Streamify",
      `You have been invited to Streamify. Create your account within seven days:\n${config().APP_ORIGIN}/invite#${credential}\nUse this email address to register.`,
    );
    await audit("invitation_sent", user.id);
    return ok();
  }
  if (path[1] === "enrollments") {
    const data = z
      .object({ userId: idSchema, courseId: idSchema, active: z.boolean() })
      .parse(body);
    await tx(async (client) => {
      await lockAccount(client, data.userId);
      await client.query(
        "INSERT INTO enrollments(user_id,course_id,active) VALUES($1,$2,$3) ON CONFLICT(user_id,course_id) DO UPDATE SET active=$3",
        [data.userId, data.courseId, data.active],
      );
      if (!data.active)
        await client.query(
          "UPDATE playback_sessions SET revoked_at=now() WHERE user_id=$1 AND lesson_id IN(SELECT id FROM lessons WHERE course_id=$2)",
          [data.userId, data.courseId],
        );
      await audit("enrollment_updated", user.id, data.userId, client);
    });
    return ok();
  }
  if (path[1] === "users" && path[2]) {
    const data = z
      .object({ action: z.enum(["suspend", "activate", "revoke"]) })
      .parse(body);
    assert(path[2] !== user.id, 400, "CANNOT_TARGET_SELF");
    await tx(async (client) => {
      await lockAccount(client, path[2]);
      if (data.action !== "revoke")
        await client.query('UPDATE "user" SET status=$1 WHERE id=$2', [
          data.action === "suspend" ? "suspended" : "active",
          path[2],
        ]);
      if (data.action !== "activate") {
        await client.query('DELETE FROM session WHERE "userId"=$1', [path[2]]);
        await client.query(
          "UPDATE trusted_browsers SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
          [path[2]],
        );
        await client.query(
          "UPDATE playback_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
          [path[2]],
        );
      }
      await audit(`account_${data.action}`, user.id, path[2], client);
    });
    return ok();
  }
  throw new AppError(404, "NOT_FOUND");
}
export async function api(request: Request) {
  const path = new URL(request.url).pathname.replace("/api/", "").split("/");
  if (request.method === "POST" && path.join("/") === "invitations/accept")
    return acceptInvitation(request);
  const user = await requireViewer({
    allowMfaSetup: path[0] === "account" || path[0] === "browsers",
  });
  if (path[0] === "account" && request.method === "GET")
    return accountSnapshot(user);
  if (path.join("/") === "browsers/challenge" && request.method === "POST")
    return challengeBrowser(user);
  if (path.join("/") === "browsers/verify" && request.method === "POST")
    return verifyBrowser(request, user);
  if (path[0] === "account" && request.method === "DELETE" && path[2])
    return revokeResource(user, path[1], idSchema.parse(path[2]));
  if (path[0] === "admin" && ["POST", "DELETE"].includes(request.method)) {
    const admin = await requireViewer({ admin: true, trusted: true });
    return adminMutation(request, path, admin);
  }
  if (
    request.method === "POST" &&
    path[0] === "lessons" &&
    path[2] === "playback"
  ) {
    const viewer = await requireViewer({ trusted: true });
    await rateLimit("launch", viewer.id, 10);
    return NextResponse.json(
      await launchPlayback(viewer, idSchema.parse(path[1])),
    );
  }
  if (path[0] === "playback" && path[1] && request.method === "POST") {
    const viewer = await requireViewer({ trusted: true });
    await rateLimit("heartbeat", viewer.id, 10);
    if (path[2] === "heartbeat")
      return NextResponse.json(
        await heartbeat(viewer, idSchema.parse(path[1])),
      );
    if (path[2] === "release") {
      await releasePlayback(viewer, idSchema.parse(path[1]));
      return ok();
    }
  }
  throw new AppError(404, "NOT_FOUND");
}
