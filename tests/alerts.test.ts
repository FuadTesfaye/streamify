import { test } from "node:test";
import assert from "node:assert/strict";
import { securityAlerts } from "../src/lib/alerts";
test("security alerts use bounded event windows and identify repeat browser challenges", () => {
  const now = Date.now();
  const event = (kind: string, age: number, user_id: string | null = null) => ({
    kind,
    created_at: new Date(now - age),
    user_id,
  });
  assert.deepEqual(
    securityAlerts(
      [event("login_denied", 601_000), event("playback_granted", 0)],
      now,
    ),
    [],
  );
  const events = [
    ...Array.from({ length: 5 }, () => event("access_denied", 100)),
    event("rate_limit_exceeded", 100),
    ...Array.from({ length: 3 }, () =>
      event("browser_challenged", 100, "student"),
    ),
  ];
  assert.equal(securityAlerts(events, now).length, 3);
});
