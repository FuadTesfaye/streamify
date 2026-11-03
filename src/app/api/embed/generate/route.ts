import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/authorization";
import { authorizeLesson } from "@/lib/authorization";
import { createEmbedToken } from "@/lib/embed-token";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/security";

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const viewer = await requireViewer();
    const body = (await req.json()) as { lessonId?: string };

    if (!body.lessonId || typeof body.lessonId !== "string") {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "lessonId is required." },
        { status: 400 },
      );
    }

    // Authorize that viewer has active access to this lesson
    await authorizeLesson(viewer, body.lessonId, db);

    const expiresInSeconds = 180; // 3 minutes validity for new embed activation
    const token = createEmbedToken(
      {
        lessonId: body.lessonId,
        userId: viewer.id,
        viewer: viewer.email,
      },
      expiresInSeconds,
    );

    const appOrigin = config().APP_ORIGIN;
    const embedUrl = `${appOrigin}/embed/${token}`;
    const iframeHtml = `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

    return NextResponse.json({
      token,
      embedUrl,
      iframeHtml,
      expiresInSeconds,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to generate embed.";
    return NextResponse.json({ error: "FORBIDDEN", message }, { status: 403 });
  }
}
