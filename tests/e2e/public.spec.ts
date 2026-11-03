import { test, expect } from "@playwright/test";
test("landing and sign-in are usable without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "possibility",
  );
  await page.getByRole("link", { name: "Student sign in" }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("copied lesson links require login in a fresh browser", async ({
  page,
}) => {
  await page.goto("/courses/example/lessons/example");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("iframe")).toHaveCount(0);
});
test("anonymous playback is denied without exposing provider data", async ({
  request,
  baseURL,
}) => {
  const result = await request.post("/api/lessons/example/playback", {
    headers: { Origin: baseURL! },
    data: {},
  });
  expect(result.status()).toBe(401);
  expect(result.headers()["cache-control"]).toContain("no-store");
  expect(await result.text()).not.toMatch(
    /videoId|youtubeVideoId|youtube\.com\/embed/,
  );
});
test("cross-origin mutations and native self-registration are rejected", async ({
  request,
  baseURL,
}) => {
  const csrf = await request.post("/api/lessons/example/playback", {
    headers: { Origin: "https://attacker.test" },
    data: {},
  });
  expect(csrf.status()).toBe(403);
  const signup = await request.post("/api/auth/sign-up/email", {
    headers: { Origin: baseURL! },
    data: {
      email: "nobody@example.test",
      password: "some-long-password",
      name: "Nobody",
    },
  });
  expect(signup.status()).toBe(404);
});
test("privacy page states the video protection boundary and supplies CSP", async ({
  page,
}) => {
  const response = await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "YouTube playback" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Ending a Streamify session does not revoke direct YouTube playback/,
    ),
  ).toBeVisible();
  expect(response?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(response?.headers()["content-security-policy"]).toMatch(
    /script-src[^;]*nonce-/,
  );
});
