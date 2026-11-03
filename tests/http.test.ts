import { test, before } from "node:test";
import assert from "node:assert/strict";
import { sameOrigin } from "../src/lib/security";
import { endpoint, jsonBody } from "../src/lib/http";
import { config } from "../src/lib/config";
before(() => {
  Object.assign(process.env, {
    APP_ORIGIN: "http://localhost:3000",
    BETTER_AUTH_SECRET: "test-only-secret-32-characters-long",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    REDIS_URL: "redis://localhost:6379",
    SMTP_HOST: "localhost",
    SMTP_PORT: "1025",
    SMTP_SECURE: "false",
    MAIL_FROM: "test@example.test",
  });
});
test("mutations require the configured origin and reject cross-site fetches", () => {
  assert.doesNotThrow(() =>
    sameOrigin(
      new Request("http://localhost:3000/api/example", {
        headers: {
          origin: "http://localhost:3000",
          "sec-fetch-site": "same-origin",
        },
      }),
    ),
  );
  for (const headers of [
    {},
    { origin: "https://attacker.test" },
    { origin: "http://localhost:3000", "sec-fetch-site": "cross-site" },
  ] as Record<string, string>[])
    assert.throws(() =>
      sameOrigin(new Request("http://localhost:3000/api/example", { headers })),
    );
});
test("JSON validation reads real body size instead of trusting Content-Length", async () => {
  assert.deepEqual(
    await jsonBody(
      new Request("http://localhost/", {
        method: "POST",
        body: '{"hello":"world"}',
      }),
    ),
    { hello: "world" },
  );
  await assert.rejects(
    jsonBody(
      new Request("http://localhost/", {
        method: "POST",
        body: "x".repeat(32_769),
      }),
    ),
    /BODY_TOO_LARGE|body too large/,
  );
});
test("invalid JSON produces a safe non-cacheable error envelope", async () => {
  const handler = endpoint(async (request) => {
    await jsonBody(request);
    return Response.json({ ok: true });
  });
  const response = await handler(
    new Request("http://localhost:3000/api/example", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
      body: "invalid",
    }),
  );
  assert.equal(response.status, 400);
  assert.match(response.headers.get("cache-control")!, /no-store/);
  assert.equal((await response.json()).error.code, "INVALID_REQUEST");
});
test("production configuration refuses placeholder secrets, HTTP, and plaintext SMTP", () => {
  const original = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production" });
  assert.throws(() => config(), /HTTPS/);
  if (original === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
  else Object.assign(process.env, { NODE_ENV: original });
});
