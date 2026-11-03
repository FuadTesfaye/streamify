import Link from "next/link";
import { notFound } from "next/navigation";
import { pageViewer } from "@/lib/page-auth";
import { rows } from "@/lib/db";
import { UnifiedVideoPlayer } from "@/components/unified-video-player";
import { config } from "@/lib/config";
import { maskedEmail } from "@/lib/policy";
import type { ProviderType } from "@/lib/providers";

export default async function Lesson({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const user = await pageViewer({ trusted: true });
  const { courseId, lessonId } = await params;
  // Explicit projection: the page and its React payload never receive the raw video ID.
  const [lesson] = await rows<{
    title: string;
    description: string;
    course_title: string;
    position: number;
    provider: ProviderType;
    visibility: "free" | "paid";
  }>(
    `SELECT l.title, l.description, l.position, c.title AS course_title,
            COALESCE(l.provider, 'youtube') as provider,
            COALESCE(l.visibility, 'free') as visibility
     FROM lessons l
     JOIN courses c ON c.id=l.course_id
     JOIN enrollments e ON e.course_id=c.id
     WHERE l.id=$1 AND c.id=$2 AND e.user_id=$3 AND e.active AND c.published AND l.published`,
    [lessonId, courseId, user.id],
  );
  if (!lesson) notFound();
  return (
    <>
      <Link className="back-link" href={`/courses/${courseId}`}>
        ← {lesson.course_title}
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            Lesson {String(lesson.position).padStart(2, "0")}
          </span>
          <h1>{lesson.title}</h1>
          <p>{lesson.description}</p>
        </div>
      </div>
      <UnifiedVideoPlayer
        lessonId={lessonId}
        origin={config().APP_ORIGIN}
        viewer={maskedEmail(user.email)}
        initialProvider={lesson.provider}
        initialVisibility={lesson.visibility}
      />
      <div className="lesson-footer">
        <span>Take your time. There’s space to learn at your own pace.</span>
        <Link href={`/courses/${courseId}`}>All lessons ↗</Link>
      </div>
    </>
  );
}
