import { NextResponse } from "next/server";
import { verifyEmbedToken } from "@/lib/embed-token";
import { rows, tx } from "@/lib/db";
import { LEASE_MS } from "@/lib/policy";
import { audit } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { token?: string };

    if (!body.token || typeof body.token !== "string") {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Embed token is required." },
        { status: 400 },
      );
    }

    // Verify token cryptographic signature and expiration
    const payload = verifyEmbedToken(body.token);

    return await tx(async (client) => {
      // Fetch lesson and verify publication
      const [lesson] = await rows<{
        id: string;
        video_id: string;
        is_published: boolean;
      }>(
        "SELECT id, video_id, is_published FROM lessons WHERE id = $1",
        [payload.lessonId],
        client,
      );

      if (!lesson || !lesson.is_published) {
        return NextResponse.json(
          {
            error: "LESSON_UNAVAILABLE",
            message: "Lesson is unpublished or not found.",
          },
          { status: 404 },
        );
      }

      // Check user account status
      const [user] = await rows<{ status: string }>(
        "SELECT status FROM users WHERE id = $1",
        [payload.userId],
        client,
      );

      if (!user || user.status !== "active") {
        return NextResponse.json(
          {
            error: "ACCOUNT_SUSPENDED",
            message: "Account is suspended or invalid.",
          },
          { status: 403 },
        );
      }

      const expiresAt = new Date(Date.now() + LEASE_MS);
      const [session] = await rows<{ id: string }>(
        "INSERT INTO playback_sessions (user_id, lesson_id, expires_at) VALUES ($1, $2, $3) RETURNING id",
        [payload.userId, payload.lessonId, expiresAt],
        client,
      );

      await audit("embed_playback_granted", payload.userId, session.id, client);

      return NextResponse.json({
        playbackSessionId: session.id,
        provider: "youtube",
        videoId: lesson.video_id,
        expiresAt: expiresAt.toISOString(),
        viewer: payload.viewer,
      });
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Embed authorization could not be verified.";
    return NextResponse.json(
      { error: "TOKEN_EXPIRED", message },
      { status: 403 },
    );
  }
}
