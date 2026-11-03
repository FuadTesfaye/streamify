import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Play, BookOpen } from "lucide-react";
import { pageViewer } from "@/lib/page-auth";
import { rows } from "@/lib/db";
export default async function Course({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await pageViewer({ trusted: true });
  const { courseId } = await params;
  const [course] = await rows<{
    title: string;
    description: string;
    category: string;
  }>(
    `SELECT c.title,c.description,c.category FROM courses c JOIN enrollments e ON e.course_id=c.id WHERE c.id=$1 AND e.user_id=$2 AND e.active AND c.published`,
    [courseId, user.id],
  );
  if (!course) notFound();
  const lessons = await rows<{
    id: string;
    title: string;
    description: string;
    position: number;
  }>(
    "SELECT id,title,description,position FROM lessons WHERE course_id=$1 AND published ORDER BY position",
    [courseId],
  );
  return (
    <>
      <Link className="back-link" href="/courses">
        ← My courses
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{course.category}</span>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
        </div>
        <span className="heading-icon">
          <BookOpen size={34} />
        </span>
      </div>
      <div className="section-heading">
        <h2>Your lessons</h2>
        <span className="muted">{lessons.length} in this collection</span>
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
              <strong>{lesson.title}</strong>
              <small>{lesson.description}</small>
            </span>
            <span className="lesson-open">
              <Play size={16} /> Watch lesson <ArrowRight size={16} />
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
