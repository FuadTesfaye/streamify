"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  BookOpen,
  Users,
  Activity,
  Mail,
  Pencil,
  Trash2,
  Radio,
  StopCircle,
  Share2,
  Copy,
  Check,
  Search,
  ExternalLink,
  ShieldAlert,
  Clock,
  Sparkles,
} from "lucide-react";
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

export type AdminEnrollment = {
  id: string;
  user_id: string;
  course_id: string;
  active: boolean;
  course_title: string;
  user_email: string;
};

export type AdminInvitation = {
  id: string;
  email: string;
  course_id: string | null;
  course_title: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

export type AdminPlayback = {
  id: string;
  user_id: string;
  user_email: string;
  lesson_title: string;
  course_title: string;
  created_at: string;
  expires_at: string;
};

type Props = {
  alerts: string[];
  courses: AdminCourse[];
  lessons: AdminLesson[];
  users: AdminUser[];
  enrollments: AdminEnrollment[];
  invitations: AdminInvitation[];
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
  playbacks: AdminPlayback[];
};

export function AdminPanel({
  alerts,
  courses,
  lessons,
  users,
  enrollments,
  invitations,
  events,
  browsers,
  playbacks,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState("gateway");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit states
  const [course, setCourse] = useState<AdminCourse | null>(null);
  const [lesson, setLesson] = useState<AdminLesson | null>(null);
  const [courseKey, setCourseKey] = useState(0);
  const [lessonKey, setLessonKey] = useState(0);

  // Student search
  const [studentSearch, setStudentSearch] = useState("");

  // Direct invite link state
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);

  // Embed sandbox state
  const [sandboxLessonId, setSandboxLessonId] = useState(lessons[0]?.id || "");
  const [sandboxEmbed, setSandboxEmbed] = useState<{
    embedUrl: string;
    iframeHtml: string;
    token: string;
  } | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCourse(id: string) {
    if (!confirm("Are you sure you want to delete this course and all its lessons?")) return;
    await run(async () => {
      const res = await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete course.");
      setSuccess("Course deleted.");
      if (course?.id === id) setCourse(null);
    });
  }

  async function deleteLesson(id: string) {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    await run(async () => {
      const res = await fetch(`/api/admin/lessons/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete lesson.");
      setSuccess("Lesson deleted.");
      if (lesson?.id === id) setLesson(null);
    });
  }

  async function terminatePlayback(playbackId: string) {
    if (!confirm("Terminate this student's active playback lease immediately?")) return;
    await run(async () => {
      await request(`/api/admin/playbacks/${playbackId}`, {});
      setSuccess("Playback lease terminated.");
    });
  }

  async function generateSandboxEmbed() {
    if (!sandboxLessonId) return;
    await run(async () => {
      const res = await fetch("/api/embed/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: sandboxLessonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate embed token.");
      setSandboxEmbed(data);
      setSuccess("Ephemeral embed token generated.");
    });
  }

  async function generateInstantInvite(email: string, courseId?: string) {
    await run(async () => {
      const data = await request<{ inviteUrl: string; email: string }>(
        "/api/admin/invitations/link",
        { email, courseId: courseId || undefined },
      );
      setGeneratedInviteUrl(data.inviteUrl);
      setSuccess(`Direct invitation link generated for ${data.email}`);
    });
  }

  async function pruneOldEvents() {
    if (!confirm("Prune security audit events older than 30 days?")) return;
    await run(async () => {
      await request("/api/admin/prune", {});
      setSuccess("Old security events pruned.");
    });
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(studentSearch.toLowerCase()),
  );

  return (
    <>
      <div className="admin-tabs" role="tablist" aria-label="Administration">
        {[
          ["gateway", "Gateway & Leases", Radio],
          ["content", "Course library", BookOpen],
          ["people", "Students & access", Users],
          ["activity", "Security activity", Activity],
        ].map(([value, label, Icon]) => {
          const I = Icon as typeof Radio;
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

      {/* TAB 1: GATEWAY & LEASES */}
      {tab === "gateway" && (
        <>
          {/* Quick Metrics Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div className="panel" style={{ padding: "18px 20px" }}>
              <span className="eyebrow" style={{ color: "#ba6e4e" }}>
                Active Streams
              </span>
              <h2 style={{ fontSize: "28px", margin: "4px 0 0 0" }}>{playbacks.length}</h2>
              <small className="muted">Live heartbeat leases</small>
            </div>
            <div className="panel" style={{ padding: "18px 20px" }}>
              <span className="eyebrow">Published Courses</span>
              <h2 style={{ fontSize: "28px", margin: "4px 0 0 0" }}>
                {courses.filter((c) => c.published).length} / {courses.length}
              </h2>
              <small className="muted">{lessons.filter((l) => l.published).length} published lessons</small>
            </div>
            <div className="panel" style={{ padding: "18px 20px" }}>
              <span className="eyebrow">Active Students</span>
              <h2 style={{ fontSize: "28px", margin: "4px 0 0 0" }}>
                {users.filter((u) => u.status === "active").length}
              </h2>
              <small className="muted">{enrollments.filter((e) => e.active).length} total enrollments</small>
            </div>
            <div className="panel" style={{ padding: "18px 20px" }}>
              <span className="eyebrow">Security Status</span>
              <h2 style={{ fontSize: "20px", margin: "8px 0 0 0", color: alerts.length ? "#e58787" : "#8db670" }}>
                {alerts.length ? `${alerts.length} Alert(s)` : "Normal"}
              </h2>
              <small className="muted">Rate limiters & MFA active</small>
            </div>
          </div>

          <div className="account-grid">
            {/* Live Playback Sessions Manager */}
            <section className="panel">
              <div className="section-heading compact">
                <h2>
                  <Radio size={18} style={{ verticalAlign: "middle", marginRight: "6px" }} />
                  Live Playback Sessions ({playbacks.length})
                </h2>
                <button className="text-button" onClick={() => router.refresh()}>
                  Refresh ↻
                </button>
              </div>
              <p className="muted">
                Each stream holds a 90-second lease renewed every 30 seconds. Terminating a lease removes the player iframe instantly.
              </p>

              {playbacks.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
                  {playbacks.map((p) => {
                    const remainingSec = Math.max(
                      0,
                      Math.round((new Date(p.expires_at).getTime() - Date.now()) / 1000),
                    );
                    return (
                      <div
                        key={p.id}
                        className="resource-row"
                        style={{
                          background: "rgba(0,0,0,0.02)",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          border: "1px solid var(--line)",
                        }}
                      >
                        <div>
                          <strong>{p.lesson_title}</strong>
                          <small style={{ display: "block" }}>
                            Student: <strong>{p.user_email}</strong> · {p.course_title}
                          </small>
                          <small style={{ color: "#7a8278" }}>
                            Lease ID: {p.id.slice(0, 8).toUpperCase()} · Pulse: {remainingSec}s remaining
                          </small>
                        </div>
                        <button
                          className="button secondary small"
                          disabled={busy}
                          onClick={() => terminatePlayback(p.id)}
                          style={{ color: "#ba6e4e", borderColor: "#ba6e4e" }}
                        >
                          <StopCircle size={14} /> Terminate Lease
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="muted" style={{ padding: "24px 0", textAlign: "center" }}>
                  No active playback leases at this moment.
                </p>
              )}
            </section>

            {/* Ephemeral Embed Sandbox & Token Generator */}
            <section className="panel">
              <div className="panel-title">
                <Share2 size={20} />
                <h2>Ephemeral Embed Sandbox</h2>
              </div>
              <p className="muted">
                Generate and test signed embed links. Tokens expire automatically upon copy-pasting to another browser or after 3 minutes.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                <label>
                  Select lesson to embed
                  <select
                    value={sandboxLessonId}
                    onChange={(e) => setSandboxLessonId(e.target.value)}
                  >
                    {lessons.map((l) => (
                      <option value={l.id} key={l.id}>
                        {courses.find((c) => c.id === l.course_id)?.title} → {l.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="button"
                  onClick={generateSandboxEmbed}
                  disabled={busy || !sandboxLessonId}
                >
                  <Sparkles size={16} /> Generate Signed Embed Snippet
                </button>
              </div>

              {sandboxEmbed && (
                <div
                  style={{
                    marginTop: "16px",
                    background: "#18201d",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "16px",
                    color: "#f8f8f3",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <small style={{ color: "#e4edb7" }}>
                      <Clock size={12} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                      Signed Token (Single-Use • 3m Expiry)
                    </small>
                    <a
                      href={sandboxEmbed.embedUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: "12px", color: "#e4edb7", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      Open Player <ExternalLink size={12} />
                    </a>
                  </div>
                  <textarea
                    readOnly
                    rows={3}
                    value={sandboxEmbed.iframeHtml}
                    style={{
                      width: "100%",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      background: "#0f1412",
                      color: "#b0b9b3",
                      border: "1px solid #2b3831",
                      borderRadius: "6px",
                      padding: "8px",
                      resize: "none",
                    }}
                  />
                  <button
                    className="button small light"
                    style={{ marginTop: "10px" }}
                    onClick={() => {
                      navigator.clipboard.writeText(sandboxEmbed.iframeHtml);
                      setEmbedCopied(true);
                      setTimeout(() => setEmbedCopied(false), 2000);
                    }}
                  >
                    {embedCopied ? <Check size={14} /> : <Copy size={14} />}
                    {embedCopied ? "Copied Snippet!" : "Copy IFrame Snippet"}
                  </button>
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {/* TAB 2: CONTENT (COURSE LIBRARY) */}
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
                      placeholder="e.g. dQw4w9WgXcQ or https://..."
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

          <section className="panel" style={{ marginTop: "24px" }}>
            <h2>Your Course Library</h2>
            {courses.map((c) => (
              <div className="admin-course" key={c.id}>
                <div className="resource-row">
                  <div>
                    <strong>{c.title}</strong>
                    <small>
                      {c.category} · {c.published ? "Published" : "Draft"}
                    </small>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="button secondary small"
                      onClick={() => {
                        setCourse(c);
                        setCourseKey((v) => v + 1);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      className="button secondary small"
                      onClick={() => deleteCourse(c.id)}
                      style={{ color: "#ba6e4e" }}
                      title="Delete course"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {lessons
                  .filter((l) => l.course_id === c.id)
                  .map((l) => (
                    <div className="admin-lesson" key={l.id}>
                      <span>
                        {l.position}. {l.title}
                        <small>{l.published ? "Published" : "Draft"}</small>
                        <small style={{ color: "#7a8278", marginLeft: "8px" }}>
                          ID: {l.video_id.slice(0, 6)}…
                        </small>
                      </span>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <button
                          className="text-button"
                          onClick={() => {
                            setLesson(l);
                            setLessonKey((v) => v + 1);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Edit ↗
                        </button>
                        <button
                          className="text-button danger-text"
                          onClick={() => deleteLesson(l.id)}
                        >
                          Delete
                        </button>
                      </div>
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

      {/* TAB 3: STUDENTS & ACCESS */}
      {tab === "people" && (
        <>
          <div className="account-grid">
            {/* Student Invitation Section */}
            <section className="panel">
              <div className="panel-title">
                <Mail size={20} />
                <h2>Invite a Student</h2>
              </div>
              <p className="muted">
                Invitations expire in 7 days. You can also generate an instant copyable link below.
              </p>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const element = event.currentTarget;
                  const f = new FormData(element);
                  const email = String(f.get("email"));
                  const courseId = String(f.get("courseId"));

                  if (event.nativeEvent && (event.nativeEvent as unknown as { submitter?: { name?: string } }).submitter?.name === "direct") {
                    void generateInstantInvite(email, courseId);
                  } else {
                    void run(async () => {
                      await request("/api/admin/invitations", {
                        email,
                        courseId: courseId || undefined,
                      });
                      element.reset();
                      setSuccess("Invitation email sent.");
                    });
                  }
                }}
              >
                <label>
                  Email address
                  <input name="email" type="email" required />
                </label>
                <label>
                  Initial course enrollment
                  <select name="courseId">
                    <option value="">No initial enrollment</option>
                    {courses.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                  <button className="button" disabled={busy} name="email">
                    Send Invitation Email <Mail size={16} />
                  </button>
                  <button className="button secondary" disabled={busy} name="direct" type="submit">
                    Generate Direct Link <Copy size={16} />
                  </button>
                </div>
              </form>

              {generatedInviteUrl && (
                <div
                  style={{
                    marginTop: "16px",
                    background: "rgba(41, 76, 60, 0.08)",
                    border: "1px solid var(--forest)",
                    borderRadius: "8px",
                    padding: "14px",
                  }}
                >
                  <strong style={{ fontSize: "13px", display: "block", marginBottom: "4px" }}>
                    Copyable Invitation Link:
                  </strong>
                  <input
                    readOnly
                    value={generatedInviteUrl}
                    style={{ fontSize: "12px", fontFamily: "monospace" }}
                  />
                  <button
                    className="button small"
                    style={{ marginTop: "8px" }}
                    onClick={() => {
                      navigator.clipboard.writeText(generatedInviteUrl);
                      setInviteCopied(true);
                      setTimeout(() => setInviteCopied(false), 2000);
                    }}
                  >
                    {inviteCopied ? <Check size={14} /> : <Copy size={14} />}
                    {inviteCopied ? "Link Copied!" : "Copy Link"}
                  </button>
                </div>
              )}
            </section>

            {/* Course Enrollment Manager */}
            <section className="panel">
              <h2>Manage Enrollment</h2>
              <p className="muted">
                Grant or revoke student access to specific courses immediately.
              </p>
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
                  Update Enrollment
                </button>
              </form>
            </section>
          </div>

          {/* Student Account Table with Instant Search */}
          <section className="panel" style={{ marginTop: "24px" }}>
            <div className="section-heading compact">
              <h2>Student Accounts ({filteredUsers.length})</h2>
              <div style={{ position: "relative", width: "260px" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "12px", color: "#8a9690" }} />
                <input
                  type="text"
                  placeholder="Search students…"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{ paddingLeft: "32px", fontSize: "13px" }}
                />
              </div>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Status</th>
                    <th>Browsers / Logins / Streams</th>
                    <th>Enrolled Courses</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const studentEnrollments = enrollments.filter(
                      (e) => e.user_id === u.id && e.active,
                    );
                    return (
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
                          {u.browser_count} / {u.session_count} / {u.playback_count}
                        </td>
                        <td>
                          {studentEnrollments.length ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {studentEnrollments.map((e) => (
                                <span
                                  key={e.id}
                                  style={{
                                    fontSize: "11px",
                                    padding: "2px 6px",
                                    background: "rgba(41, 76, 60, 0.1)",
                                    borderRadius: "4px",
                                    color: "var(--forest)",
                                  }}
                                >
                                  {e.course_title}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <small className="muted">None</small>
                          )}
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
                              Revoke All
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* TAB 4: SECURITY ACTIVITY & LOGS */}
      {tab === "activity" && (
        <>
          {alerts.map((alert) => (
            <div className="notice neutral" role="status" key={alert}>
              <ShieldAlert size={16} style={{ verticalAlign: "middle", marginRight: "6px" }} />
              {alert}
            </div>
          ))}

          <div className="account-grid">
            <section className="panel">
              <h2>Registered Browsers</h2>
              <p className="muted">Browser credentials with 30-day verification.</p>
              {browsers.map((b) => (
                <div className="resource-row" key={b.id}>
                  <div>
                    <strong>{b.label}</strong>
                    <small>
                      {users.find((u) => u.id === b.user_id)?.email ?? b.user_id}
                      <br />
                      Expires {new Date(b.expires_at).toLocaleDateString("en")}
                    </small>
                  </div>
                </div>
              ))}
              {!browsers.length && <p className="muted">No trusted browsers.</p>}
            </section>

            <section className="panel">
              <div className="section-heading compact">
                <h2>Pending Invitations</h2>
                <small className="muted">Last 20 invites</small>
              </div>
              {invitations.map((inv) => (
                <div className="resource-row" key={inv.id}>
                  <div>
                    <strong>{inv.email}</strong>
                    <small>
                      {inv.course_title ? `Course: ${inv.course_title}` : "Open enrollment"}
                      <br />
                      {inv.accepted_at
                        ? `Accepted: ${new Date(inv.accepted_at).toLocaleDateString()}`
                        : `Expires: ${new Date(inv.expires_at).toLocaleDateString()}`}
                    </small>
                  </div>
                  <span className={`badge ${inv.accepted_at ? "active" : ""}`}>
                    {inv.accepted_at ? "Claimed" : "Pending"}
                  </span>
                </div>
              ))}
              {!invitations.length && <p className="muted">No pending invitations.</p>}
            </section>
          </div>

          <section className="panel" style={{ marginTop: "24px" }}>
            <div className="section-heading compact">
              <div>
                <h2>Security Audit Logs</h2>
                <small className="muted">Latest 100 recorded operational events.</small>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="text-button" onClick={() => router.refresh()}>
                  Refresh ↻
                </button>
                <button
                  className="button secondary small"
                  onClick={pruneOldEvents}
                  disabled={busy}
                >
                  Prune Old Logs
                </button>
              </div>
            </div>

            <div className="table-scroll" style={{ marginTop: "14px" }}>
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Account / Reference</th>
                    <th>Time (Local)</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color: e.kind.includes("denied") || e.kind.includes("exceeded")
                              ? "#ba6e4e"
                              : "inherit",
                          }}
                        >
                          {e.kind.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>
                        {users.find((u) => u.id === e.user_id)?.email ??
                          e.user_id ??
                          "Unauthenticated"}
                        {e.reference && <small style={{ display: "block" }}>{e.reference}</small>}
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
