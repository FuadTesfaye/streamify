import { test } from "node:test";
import assert from "node:assert/strict";
import { createEmbedToken, verifyEmbedToken } from "../src/lib/embed-token";

test("creates and verifies a valid ephemeral embed token", () => {
  const token = createEmbedToken({
    lessonId: "lesson-abc-123",
    userId: "user-xyz-456",
    viewer: "student@example.com",
  }, 180);

  const payload = verifyEmbedToken(token);
  assert.equal(payload.lessonId, "lesson-abc-123");
  assert.equal(payload.userId, "user-xyz-456");
  assert.equal(payload.viewer, "student@example.com");
  assert.ok(payload.exp > Math.floor(Date.now() / 1000));
  assert.ok(typeof payload.nonce === "string" && payload.nonce.length > 0);
});

test("rejects an expired embed token", () => {
  // Create token with -10 seconds validity (already expired)
  const token = createEmbedToken({
    lessonId: "lesson-1",
    userId: "user-1",
    viewer: "expired@example.com",
  }, -10);

  assert.throws(
    () => verifyEmbedToken(token),
    (err: any) => err.code === "TOKEN_EXPIRED",
  );
});

test("detects and rejects a tampered embed token payload", () => {
  const token = createEmbedToken({
    lessonId: "lesson-original",
    userId: "user-original",
    viewer: "orig@example.com",
  }, 300);

  const [serialized, signature] = token.split(".");
  // Tamper with serialized payload
  const tamperedPayload = Buffer.from(
    JSON.stringify({ lessonId: "lesson-hacked", userId: "attacker" }),
  ).toString("base64url");

  const tamperedToken = `${tamperedPayload}.${signature}`;

  assert.throws(
    () => verifyEmbedToken(tamperedToken),
    (err: any) => err.code === "TAMPERED_TOKEN",
  );
});

test("rejects malformed token strings", () => {
  assert.throws(
    () => verifyEmbedToken("not-a-token"),
    (err: any) => err.code === "INVALID_TOKEN",
  );
  assert.throws(
    () => verifyEmbedToken("part1.part2.part3"),
    (err: any) => err.code === "INVALID_TOKEN",
  );
});
