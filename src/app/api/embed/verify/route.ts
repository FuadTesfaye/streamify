import { NextResponse } from "next/server";
import { verifyEmbedToken } from "@/lib/embed-token";
import { rows, tx } from "@/lib/db";
import { LEASE_MS } from "@/lib/policy";
import { audit } from "@/lib/security";
import { config } from "@/lib/config";
import { launchProviderPlayback, type ProviderType } from "@/lib/providers";

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
        title: string;
        video_id: string;
        provider: ProviderType;
        visibility: "free" | "paid";
        playback_policy: "public" | "signed" | "drm";
        published: boolean;
      }>(
        "SELECT id, title, video_id, COALESCE(provider, 'youtube') as provider, COALESCE(visibility, 'free') as visibility, COALESCE(playback_policy, 'public') as playback_policy, published FROM lessons WHERE id = $1",
        [payload.lessonId],
        client,
      );

      if (!lesson || !lesson.published) {
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
        'SELECT status FROM "user" WHERE id = $1',
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
        "INSERT INTO playback_sessions (user_id, session_id, browser_id, lesson_id, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [payload.userId, "embed-session", "embed-browser", payload.lessonId, expiresAt],
        client,
      );

      await audit("embed_playback_granted", payload.userId, session.id, client);

      const descriptor = await launchProviderPlayback(
        {
          id: lesson.id,
          title: lesson.title,
          videoId: lesson.video_id,
          provider: lesson.provider,
          visibility: lesson.visibility,
          playbackPolicy: lesson.playback_policy,
        },
        {
          userId: payload.userId,
          userEmail: payload.viewer,
          appOrigin: config().APP_ORIGIN,
        },
      );

      return NextResponse.json({
        playbackSessionId: session.id,
        expiresAt: expiresAt.toISOString(),
        viewer: payload.viewer,
        ...descriptor,
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
