import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeVideo,
  maskedEmail,
  sessionAlive,
  IDLE_MS,
  LOGIN_MS,
} from "../src/lib/policy";
import { token, hash, otpHash, matches } from "../src/lib/tokens";

test("accepts only supported YouTube IDs and exact HTTPS hostnames", () => {
  const id = "Abc_def-123";
  for (const input of [
    id,
    `https://youtu.be/${id}`,
    `https://www.youtube.com/watch?v=${id}&t=2`,
    `https://youtube.com/embed/${id}`,
    `https://m.youtube.com/shorts/${id}`,
  ])
    assert.equal(normalizeVideo(input), id);
  for (const input of [
    "short",
    `${id}long`,
    `http://youtube.com/watch?v=${id}`,
    `https://youtube.com.attacker.test/watch?v=${id}`,
    `https://attacker.test/${id}`,
    `javascript:${id}`,
    `https://youtu.be/${id}/extra`,
  ])
    assert.throws(() => normalizeVideo(input));
});
test("login idle and absolute deadlines are enforced independently, including boundary", () => {
  const now = Date.now();
  assert.equal(
    sessionAlive(new Date(now - 60_000), new Date(now - 10_000), now),
    true,
  );
  assert.equal(
    sessionAlive(new Date(now - 60_000), new Date(now - IDLE_MS), now),
    false,
  );
  assert.equal(
    sessionAlive(new Date(now - LOGIN_MS), new Date(now), now),
    false,
  );
});
test("viewer identity is masked and does not reveal the full address", () => {
  assert.equal(maskedEmail("student@example.com"), "s•••@example.com");
});
test("credentials are random and OTP digests bind the challenge and server secret", () => {
  assert.notEqual(token(), token());
  assert.equal(hash("credential").length, 64);
  const digest = otpHash("123456", "challenge-1", "test-secret");
  assert.equal(
    matches(digest, otpHash("123456", "challenge-1", "test-secret")),
    true,
  );
  assert.equal(
    matches(digest, otpHash("123456", "challenge-2", "test-secret")),
    false,
  );
  assert.equal(
    matches(digest, otpHash("123456", "challenge-1", "another-secret")),
    false,
  );
  assert.equal(matches("short", digest), false);
});

test("auth route allowlist preserves recovery callbacks and blocks unused endpoints", async () => {
  const { allowedAuthRoute } = await import("../src/lib/auth-routes");
  assert.equal(
    allowedAuthRoute("GET", "reset-password/abcdefghijklmnopqrstuvwx"),
    true,
  );
  assert.equal(allowedAuthRoute("POST", "reset-password"), true);
  assert.equal(allowedAuthRoute("GET", "verify-email"), true);
  for (const path of [
    "sign-up/email",
    "get-session",
    "list-sessions",
    "admin/create-user",
  ]) {
    assert.equal(allowedAuthRoute("GET", path), false);
    assert.equal(allowedAuthRoute("POST", path), false);
  }
  assert.equal(
    allowedAuthRoute("POST", "reset-password/abcdefghijklmnopqrstuvwx"),
    false,
  );
  assert.equal(
    allowedAuthRoute("GET", "reset-password/../sign-up/email"),
    false,
  );
});
