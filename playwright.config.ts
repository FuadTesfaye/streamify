import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.E2E_ORIGIN ?? "http://127.0.0.1:3000";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer:
    process.env.E2E_EXTERNAL === "1"
      ? undefined
      : {
          command: "pnpm dev --hostname 127.0.0.1",
          url: baseURL,
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            APP_ORIGIN: baseURL,
            BETTER_AUTH_SECRET:
              process.env.BETTER_AUTH_SECRET ??
              "e2e-test-only-secret-at-least-32-chars",
            DATABASE_URL:
              process.env.DATABASE_URL ??
              "postgresql://streamify:test@127.0.0.1:5432/streamify_test",
            REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
            SMTP_HOST: "127.0.0.1",
            SMTP_PORT: "1025",
            SMTP_SECURE: "false",
            MAIL_FROM: "Streamify <test@example.test>",
            NEXT_TELEMETRY_DISABLED: "1",
          },
        },
});
