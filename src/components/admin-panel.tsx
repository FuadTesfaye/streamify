"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, BookOpen, Users, Activity, Mail, Pencil } from "lucide-react";
import { request } from "./client-api";
export type AdminCourse = {
  id: string;
  title: string;
  description: string;
  category: string;
  published: boolean;
};
export type AdminLesson = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  position: number;
  video_id: string;
  published: boolean;
};
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  browser_count: number;
  session_count: number;
  playback_count: number;
};
type Props = {
  alerts: string[];
  courses: AdminCourse[];
  lessons: AdminLesson[];
  users: AdminUser[];
  events: {
    id: string;
    kind: string;
    user_id: string | null;
    reference: string | null;
    created_at: string;
  }[];
  browsers: {
    id: string;
    user_id: string;
    label: string;
    expires_at: string;
  }[];
  playbacks: {
    id: string;
    user_id: string;
    lesson_title: string;
    expires_at: string;
  }[];
};
export function AdminPanel({
  alerts,
  courses,
  lessons,
  users,
  events,
  browsers,
  playbacks,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("content"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const [course, setCourse] = useState<AdminCourse | null>(null),
    [lesson, setLesson] = useState<AdminLesson | null>(null),
    [courseKey, setCourseKey] = useState(0),
    [lessonKey, setLessonKey] = useState(0);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-tabs" role="tablist" aria-label="Administration">
        {[
          ["content", "Course library", BookOpen],
          ["people", "Students & access", Users],
          ["activity", "Security activity", Activity],
        ].map(([value, label, Icon]) => {
          const I = Icon as typeof BookOpen;
          return (
            <button
              key={String(value)}
              role="tab"
              aria-selected={tab === value}
              className={tab === value ? "selected" : ""}
              onClick={() => setTab(String(value))}
            >
              <I size={16} />
              {String(label)}
            </button>
          );
        })}
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="notice success" role="status">
          {success}
        </div>
      )}
      {tab === "content" && (
        <>
          <div className="account-grid">
            <section className="panel">
              <div className="section-heading compact">
                <h2>{course ? "Edit course" : "Create a course"}</h2>
                {course && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setCourse(null);
                      setCourseKey((v) => v + 1);
                    }}
                  >
                    Cancel edit
                  </button>
                )}
              </div>
              <form
                key={`c${courseKey}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  const f = new FormData(event.currentTarget);
                  void run(async () => {
                    await request(
                      `/api/admin/courses${course ? "/" + course.id : ""}`,
                      {
                        title: String(f.get("title")),
                        description: String(f.get("description")),
                        category: String(f.get("category")),
                        published: f.has("published"),
                      },
                    );
                    setCourse(null);
                    setCourseKey((v) => v + 1);
                    setSuccess("Course saved.");
                  });
                }}
              >
                <label>
                  Course title
                  <input
                    name="title"
                    defaultValue={course?.title}
                    maxLength={180}
                    required
                  />
                </label>
                <label>
                  Description
                  <textarea
                    name="description"
                    defaultValue={course?.description}
                    maxLength={10000}
                    rows={3}
                  />
                </label>
                <label>
                  Category
                  <input
                    name="category"
                    defaultValue={course?.category ?? "General"}
                    maxLength={80}
                    required
                  />
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    name="published"
                    defaultChecked={course?.published}
                  />{" "}
                  Published and available to enrolled students
                </label>
                <button className="button" disabled={busy}>
                  <Plus size={16} />
                  {course ? "Save course" : "Create course"}
                </button>
              </form>
            </section>
            <section className="panel">
              <div className="section-heading compact">
                <h2>{lesson ? "Edit lesson" : "Add a lesson"}</h2>
                {lesson && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setLesson(null);
                      setLessonKey((v) => v + 1);
                    }}
                  >
                    Cancel edit
                  </button>
                )}
              </div>
              <form
                key={`l${lessonKey}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  const f = new FormData(event.currentTarget);
                  void run(async () => {
                    await request(
                      `/api/admin/lessons${lesson ? "/" + lesson.id : ""}`,
                      {
                        courseId: String(f.get("courseId")),
                        title: String(f.get("title")),
                        description: String(f.get("description")),
                        position: Number(f.get("position")),
                        video: String(f.get("video")),
                        published: f.has("published"),
                      },
                    );
                    setLesson(null);
                    setLessonKey((v) => v + 1);
                    setSuccess("Lesson saved.");
                  });
                }}
              >
                <label>
                  Course
                  <select
                    name="courseId"
                    defaultValue={lesson?.course_id}
                    required
                  >
                    {courses.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Lesson title
                  <input
                    name="title"
                    defaultValue={lesson?.title}
                    maxLength={180}
                    required
                  />
                </label>
                <div className="form-columns">
                  <label>
                    Position
                    <input
                      name="position"
                      type="number"
                      min={1}
                      max={10000}
                      defaultValue={lesson?.position ?? 1}
                      required
                    />
                  </label>
                  <label>
                    YouTube URL or ID
                    <input
                      name="video"
                      defaultValue={lesson?.video_id}
                      maxLength={500}
                      required
                    />
                  </label>
                </div>
                <label>
                  Description
                  <textarea
                    name="description"
                    defaultValue={lesson?.description}
                    maxLength={10000}
                    rows={2}
                  />
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    name="published"
                    defaultChecked={lesson?.published}
                  />{" "}
                  Published
                </label>
                <button className="button" disabled={busy || !courses.length}>
                  <Plus size={16} />
                  {lesson ? "Save lesson" : "Add lesson"}
                </button>
              </form>
            </section>
          </div>
          <section className="panel">
            <h2>Your course library</h2>
            {courses.map((c) => (
              <div className="admin-course" key={c.id}>
                <div className="resource-row">
                  <div>
                    <strong>{c.title}</strong>
                    <small>
                      {c.category} · {c.published ? "Published" : "Draft"}
                    </small>
                  </div>
                  <button
                    className="button secondary small"
                    onClick={() => {
                      setCourse(c);
                      setCourseKey((v) => v + 1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <Pencil size={14} /> Edit course
                  </button>
                </div>
                {lessons
                  .filter((l) => l.course_id === c.id)
                  .map((l) => (
                    <div className="admin-lesson" key={l.id}>
                      <span>
                        {l.position}. {l.title}
                        <small>{l.published ? "Published" : "Draft"}</small>
                      </span>
                      <button
                        className="text-button"
                        onClick={() => {
                          setLesson(l);
                          setLessonKey((v) => v + 1);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Edit lesson ↗
                      </button>
                    </div>
                  ))}
              </div>
            ))}
            {!courses.length && (
              <p className="muted">
                Create your first course to start building the library.
              </p>
            )}
          </section>
        </>
      )}
      {tab === "people" && (
        <>
          <div className="account-grid">
            <section className="panel">
              <div className="panel-title">
                <Mail size={20} />
                <h2>Invite a student</h2>
              </div>
              <p className="muted">
                Invitations expire after seven days. Existing students can be
                enrolled using the adjacent form.
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const element = event.currentTarget,
                    f = new FormData(element);
                  void run(async () => {
                    await request("/api/admin/invitations", {
                      email: String(f.get("email")),
                      courseId: String(f.get("courseId")) || undefined,
                    });
                    element.reset();
                    setSuccess("Invitation email sent.");
                  });
                }}
              >
                <label>
                  Email address
                  <input name="email" type="email" required />
                </label>
                <label>
                  Initial course
                  <select name="courseId">
                    <option value="">No initial enrollment</option>
                    {courses.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button" disabled={busy}>
                  Send invitation <Mail size={16} />
                </button>
              </form>
            </section>
            <section className="panel">
              <h2>Manage enrollment</h2>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const f = new FormData(event.currentTarget);
                  void run(async () => {
                    await request("/api/admin/enrollments", {
                      userId: String(f.get("userId")),
                      courseId: String(f.get("courseId")),
                      active: f.get("action") === "grant",
                    });
                    setSuccess("Enrollment updated.");
                  });
                }}
              >
                <label>
                  Student
                  <select name="userId" required>
                    {users.map((u) => (
                      <option value={u.id} key={u.id}>
                        {u.name} · {u.email}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Course
                  <select name="courseId" required>
                    {courses.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Action
                  <select name="action">
                    <option value="grant">Grant access</option>
                    <option value="revoke">Revoke access</option>
                  </select>
                </label>
                <button
                  className="button secondary"
                  disabled={busy || !users.length || !courses.length}
                >
                  Update enrollment
                </button>
              </form>
            </section>
          </div>
          <section className="panel">
            <h2>Accounts</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Status</th>
                    <th>Browsers / logins / playback</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name}</strong>
                        <small>
                          {u.email} · {u.role}
                        </small>
                      </td>
                      <td>
                        <span
                          className={`badge ${u.status === "active" ? "active" : ""}`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td>
                        {u.browser_count} / {u.session_count} /{" "}
                        {u.playback_count}
                      </td>
                      <td>
                        <div className="button-row">
                          <button
                            disabled={busy}
                            className="text-button"
                            onClick={() =>
                              run(async () => {
                                await request(`/api/admin/users/${u.id}`, {
                                  action:
                                    u.status === "active"
                                      ? "suspend"
                                      : "activate",
                                });
                                setSuccess("Account status updated.");
                              })
                            }
                          >
                            {u.status === "active" ? "Suspend" : "Activate"}
                          </button>
                          <button
                            disabled={busy}
                            className="text-button danger-text"
                            onClick={() =>
                              run(async () => {
                                await request(`/api/admin/users/${u.id}`, {
                                  action: "revoke",
                                });
                                setSuccess(
                                  "All sessions and browser registrations revoked.",
                                );
                              })
                            }
                          >
                            Revoke all access
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {tab === "activity" && (
        <>
          {alerts.map((alert) => (
            <div className="notice neutral" role="status" key={alert}>
              {alert}
            </div>
          ))}
          <div className="account-grid">
            <section className="panel">
              <h2>Registered browsers</h2>
              {browsers.map((b) => (
                <div className="resource-row" key={b.id}>
                  <div>
                    <strong>{b.label}</strong>
                    <small>
                      {users.find((u) => u.id === b.user_id)?.email ??
                        b.user_id}
                      <br />
                      Expires {new Date(b.expires_at).toLocaleDateString("en")}
                    </small>
                  </div>
                </div>
              ))}
              {!browsers.length && (
                <p className="muted">No trusted browsers.</p>
              )}
            </section>
            <section className="panel">
              <h2>Active playbacks</h2>
              {playbacks.map((p) => (
                <div className="resource-row" key={p.id}>
                  <div>
                    <strong>{p.lesson_title}</strong>
                    <small>
                      {users.find((u) => u.id === p.user_id)?.email ??
                        p.user_id}
                      <br />
                      Session {p.id.slice(0, 8).toUpperCase()}
                    </small>
                  </div>
                </div>
              ))}
              {!playbacks.length && (
                <p className="muted">No active playbacks.</p>
              )}
              <p className="muted">
                Use Students & access to revoke an account’s access.
              </p>
            </section>
          </div>
          <section className="panel">
            <div className="section-heading compact">
              <h2>Recent security events</h2>
              <button className="text-button" onClick={() => router.refresh()}>
                Refresh ↻
              </button>
            </div>
            <p className="muted">
              Latest 100 events. Repeated browser challenges, rate limits, or
              denials may warrant review; they do not prove sharing.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Account / reference</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td>{e.kind.replaceAll("_", " ")}</td>
                      <td>
                        {users.find((u) => u.id === e.user_id)?.email ??
                          e.user_id ??
                          "Unauthenticated"}
                        <small>{e.reference}</small>
                      </td>
                      <td>{new Date(e.created_at).toLocaleString("en")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
