import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { hash } from "../../src/lib/tokens";
const enabled = process.env.FULL_E2E === "1";
test("invitation, email verification, browser verification, authorized player, and revocation", async ({
  page,
  request,
  baseURL,
}, testInfo) => {
  test.setTimeout(150_000);
  test.skip(
    !enabled || testInfo.project.name !== "desktop",
    "Requires disposable PostgreSQL, Redis, Mailpit, and FULL_E2E=1.",
  );
  expect(process.env.DATABASE_URL).toContain("streamify_test");
  const db = new Pool({ connectionString: process.env.DATABASE_URL });
  const id = randomUUID(),
    email = `student-${id}@example.test`,
    credential = randomUUID() + randomUUID(),
    courseId = `course-${id}`,
    lessonId = `lesson-${id}`,
    password = `Test-password-${id}`;
  const origin = baseURL!,
    mailpit = process.env.MAILPIT_ORIGIN ?? "http://127.0.0.1:8025";
  async function latestMail(subject: string) {
    const query = `to:${email} subject:"${subject}"`;
    let text = "";
    await expect
      .poll(async () => {
        const result = await request.get(`${mailpit}/view/latest.txt`, {
          params: { query },
        });
        text = result.ok() ? await result.text() : "";
        return text;
      })
      .not.toBe("");
    return text;
  }
  try {
    await db.query(
      "INSERT INTO courses(id,title,published) VALUES($1,'A course for testing',true)",
      [courseId],
    );
    await db.query(
      "INSERT INTO lessons(id,course_id,title,position,video_id,published) VALUES($1,$2,'A focused lesson',1,'Abc_def-123',true)",
      [lessonId, courseId],
    );
    await db.query(
      "INSERT INTO invitations(email,token_hash,course_id,expires_at) VALUES($1,$2,$3,now()+interval '1 day')",
      [email, hash(credential), courseId],
    );
    await page.goto(`/invite#${credential}`);
    await page.getByLabel("Full name").fill("Test student");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create your account" }).click();
    await expect(page.getByRole("status")).toContainText("Account created");
    const verification = await latestMail("Verify your Streamify email");
    const link = verification.match(/https?:\/\/\S+/)?.[0];
    expect(link).toBeTruthy();
    await page.goto(link!);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account/);
    await page.getByRole("button", { name: "Send verification code" }).click();
    const otp = (await latestMail("Verify this Streamify browser")).match(
      /\b\d{6}\b/,
    )?.[0];
    expect(otp).toBeTruthy();
    await page.getByLabel("Browser name").fill("Test laptop");
    await page.getByLabel("Email verification code").fill(otp!);
    await page
      .getByRole("button", { name: "Verify browser", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("browser is verified");
    // Supply a mock official API at the network boundary; no real YouTube content is fetched by tests.
    await page.route("https://www.youtube.com/iframe_api", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `window.YT={Player:class{constructor(node,opts){this.iframe=document.createElement('iframe');this.iframe.title='Mock official YouTube player';this.iframe.dataset.video=opts.videoId;node.replaceWith(this.iframe);queueMicrotask(()=>opts.events.onReady());}getIframe(){return this.iframe}destroy(){this.iframe.remove()}}};window.onYouTubeIframeAPIReady();`,
      }),
    );
    await page.goto(`/courses/${courseId}/lessons/${lessonId}`);
    await expect(
      page.getByRole("heading", { name: "A focused lesson" }),
    ).toBeVisible();
    expect(await page.content()).not.toContain("Abc_def-123");
    await page.getByRole("button", { name: "Start lesson" }).click();
    await expect(page.locator("iframe")).toHaveCount(1);
    await expect(page.locator("iframe")).toHaveAttribute(
      "data-video",
      "Abc_def-123",
    );
    const second = await page.request.post(
      `/api/lessons/${lessonId}/playback`,
      { headers: { Origin: origin }, data: {} },
    );
    expect(second.status()).toBe(409);
    const adminAttempt = await page.request.post("/api/admin/courses", {
      headers: { Origin: origin },
      data: { title: "Unauthorized" },
    });
    expect(adminAttempt.status()).toBe(403);
    await db.query("UPDATE enrollments SET active=false WHERE course_id=$1", [
      courseId,
    ]);
    await expect(page.locator("iframe")).toHaveCount(0, { timeout: 40_000 });
    await expect(page.getByRole("alert")).toContainText("lesson access denied");
    await db.query("UPDATE enrollments SET active=true WHERE course_id=$1", [
      courseId,
    ]);
    const [user] = (
      await db.query('SELECT id FROM "user" WHERE email=$1', [email])
    ).rows;
    await db.query("UPDATE \"user\" SET status='suspended' WHERE id=$1", [
      user.id,
    ]);
    const denied = await page.request.post(
      `/api/lessons/${lessonId}/playback`,
      { headers: { Origin: origin }, data: {} },
    );
    expect(denied.status()).toBe(403);
    expect(await denied.text()).not.toContain("Abc_def-123");
  } finally {
    await db.query('DELETE FROM "user" WHERE email=$1', [email]);
    await db.query("DELETE FROM invitations WHERE email=$1", [email]);
    await db.query("DELETE FROM courses WHERE id=$1", [courseId]);
    await db.end();
  }
});
