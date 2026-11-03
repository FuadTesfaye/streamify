import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Play,
  Layers3,
  Compass,
  ShieldCheck,
} from "lucide-react";
import { pageViewer } from "@/lib/page-auth";
import { rows } from "@/lib/db";
export default async function Courses() {
  const user = await pageViewer({ trusted: true });
  const courses = await rows<{
    id: string;
    title: string;
    description: string;
    category: string;
    price: number;
    is_premium: boolean;
    currency: string;
    is_enrolled: boolean | null;
    expires_at: Date | null;
    lesson_count: number;
  }>(
    `SELECT c.id, c.title, c.description, c.category,
            COALESCE(c.price, 0) as price,
            COALESCE(c.is_premium, false) as is_premium,
            COALESCE(c.currency, 'usd') as currency,
            e.active as is_enrolled,
            e.expires_at,
            (SELECT count(*)::int FROM lessons l WHERE l.course_id=c.id AND l.published) AS lesson_count
     FROM courses c
     LEFT JOIN enrollments e ON e.course_id=c.id AND e.user_id=$1 AND e.active
     WHERE c.published
     ORDER BY e.active DESC NULLS LAST, c.created_at DESC`,
    [user.id],
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A good day to learn</span>
          <h1>
            Welcome back, {user.name.split(" ")[0]}
            <span className="accent">.</span>
          </h1>
          <p>
            A little curiosity can take you a long way. Pick up a course and
            settle in.
          </p>
        </div>
        <span className="heading-icon">
          <Compass size={36} strokeWidth={1} />
        </span>
      </div>
      <section className="dashboard-banner">
        <div>
          <span className="eyebrow">Your next chapter</span>
          <h2>
            Make space for
            <br />
            <em>something new.</em>
          </h2>
          <p>
            Thoughtfully selected courses.
            <br />A learning journey that’s yours.
          </p>
          <a className="button light" href="#library">
            Explore your library <ArrowUpRight size={17} />
          </a>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="ring ring-one" />
          <div className="ring ring-two" />
          <div className="banner-book">
            <BookOpen size={74} strokeWidth={1} />
            <span>STAY CURIOUS</span>
          </div>
          <span className="banner-star">✳</span>
        </div>
      </section>
      <div className="section-heading" id="library">
        <div>
          <span className="eyebrow">Your collection</span>
          <h2>
            My courses <span className="count">{courses.length}</span>
          </h2>
        </div>
        <span className="muted">
          <Layers3 size={16} /> Enrolled courses
        </span>
      </div>
      {courses.length ? (
        <div className="course-grid">
          {courses.map((course, index) => (
            <Link
              className="course-card"
              key={course.id}
              href={`/courses/${course.id}`}
            >
              <div className={`course-visual tone-${index % 4}`}>
                <span className="course-category">{course.category}</span>
                <BookOpen size={64} strokeWidth={1} />
                <span className="course-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="course-play">
                  <Play size={17} />
                </span>
              </div>
              <div className="course-copy">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span className="eyebrow" style={{ margin: 0 }}>
                    {course.lesson_count}{" "}
                    {course.lesson_count === 1 ? "lesson" : "lessons"}
                  </span>
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
                      : "Free · Open"}
                  </span>
                </div>
                <h3>{course.title}</h3>
                <p>{course.description}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                  <span className="course-link">
                    {course.is_enrolled ? "Open course" : "View course"}{" "}
                    <ArrowUpRight size={17} />
                  </span>
                  {course.is_enrolled && (
                    <span style={{ fontSize: "11px", color: "var(--forest)", fontWeight: 600 }}>
                      {course.expires_at ? "Enrolled" : "Lifetime Access"}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <BookOpen size={30} strokeWidth={1.3} />
          <h3>Your library is taking shape.</h3>
          <p>
            Your institution’s courses will appear here once you’re enrolled.
            <br />
            Contact your administrator if you expected to see a course.
          </p>
        </div>
      )}
      <div className="bottom-note">
        <ShieldCheck size={19} />
        <p>
          Your learning space is personal. Manage registered browsers and active
          sessions in <Link href="/account">Account security</Link>.
        </p>
      </div>
    </>
  );
}
