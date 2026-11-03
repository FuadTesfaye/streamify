import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Play, BookOpen, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { pageViewer } from "@/lib/page-auth";
import { rows } from "@/lib/db";
import type { ProviderType } from "@/lib/providers";

export default async function Course({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await pageViewer({ trusted: true });
  const { courseId } = await params;
  const [course] = await rows<{
    id: string;
    title: string;
    description: string;
    category: string;
    price: number;
    is_premium: boolean;
    currency: string;
    is_enrolled: boolean | null;
    expires_at: Date | null;
  }>(
    `SELECT c.id, c.title, c.description, c.category,
            COALESCE(c.price, 0) as price,
            COALESCE(c.is_premium, false) as is_premium,
            COALESCE(c.currency, 'usd') as currency,
            e.active as is_enrolled,
            e.expires_at
     FROM courses c
     LEFT JOIN enrollments e ON e.course_id=c.id AND e.user_id=$2 AND e.active
     WHERE c.id=$1 AND c.published`,
    [courseId, user.id],
  );
  if (!course) notFound();

  const lessons = await rows<{
    id: string;
    title: string;
    description: string;
    position: number;
    provider: ProviderType;
    visibility: "free" | "paid";
    playback_policy: "public" | "signed" | "drm";
  }>(
    `SELECT id, title, description, position,
            COALESCE(provider, 'youtube') as provider,
            COALESCE(visibility, 'free') as visibility,
            COALESCE(playback_policy, 'public') as playback_policy
     FROM lessons
     WHERE course_id=$1 AND published
     ORDER BY position`,
    [courseId],
  );

  return (
    <>
      <Link className="back-link" href="/courses">
        ← My courses
      </Link>
      <div className="page-heading">
        <div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
            <span className="eyebrow" style={{ margin: 0 }}>{course.category}</span>
            <span
              className="badge"
              style={{
                fontSize: "11px",
                padding: "2px 7px",
                borderRadius: "4px",
                background: course.is_premium
                  ? "rgba(186, 110, 78, 0.15)"
                  : "rgba(41, 76, 60, 0.12)",
                color: course.is_premium ? "#ba6e4e" : "var(--forest)",
              }}
            >
              {course.is_premium
                ? `$${(course.price / 100).toFixed(2)} · Premium`
                : "Free Preview Collection"}
            </span>
            {course.is_enrolled && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--forest)",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <CheckCircle2 size={13} /> Enrolled
              </span>
            )}
          </div>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
        </div>
        <span className="heading-icon">
          <BookOpen size={34} />
        </span>
      </div>

      <div className="section-heading">
        <h2>Lessons in this course</h2>
        <span className="muted">{lessons.length} lessons available</span>
      </div>

      <div className="lesson-list">
        {lessons.map((lesson) => (
          <Link
            href={`/courses/${courseId}/lessons/${lesson.id}`}
            key={lesson.id}
            className="lesson-row"
          >
            <span className="lesson-number">
              {String(lesson.position).padStart(2, "0")}
            </span>
            <span className="lesson-title">
              <span style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <strong>{lesson.title}</strong>
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background:
                      lesson.provider === "mux"
                        ? "#eef4ff"
                        : lesson.provider === "cloudflare"
                          ? "#fff4e5"
                          : "#ffeeec",
                    color:
                      lesson.provider === "mux"
                        ? "#2980b9"
                        : lesson.provider === "cloudflare"
                          ? "#d35400"
                          : "#c0392b",
                    fontWeight: 600,
                  }}
                >
                  {lesson.provider === "mux"
                    ? "Mux DRM"
                    : lesson.provider === "cloudflare"
                      ? "Cloudflare Stream"
                      : "YouTube Free"}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    padding: "1px 5px",
                    borderRadius: "4px",
                    background:
                      lesson.visibility === "paid"
                        ? "rgba(186, 110, 78, 0.12)"
                        : "rgba(41, 76, 60, 0.1)",
                    color:
                      lesson.visibility === "paid" ? "#ba6e4e" : "var(--forest)",
                  }}
                >
                  {lesson.visibility === "paid" ? "Paid" : "Free Preview"}
                </span>
              </span>
              <small>{lesson.description}</small>
            </span>
            <span className="lesson-open">
              <Play size={16} /> Stream lesson <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </div>
      {!lessons.length && (
        <div className="empty-state">
          <h3>Lessons are on their way.</h3>
          <p>
            Your institution hasn’t published any lessons in this course yet.
          </p>
        </div>
      )}
    </>
  );
}
