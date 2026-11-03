import type { PoolClient } from "pg";
import { config } from "./config";
import { rows, db } from "./db";
import { AppError, assert } from "./errors";
import { hash } from "./tokens";
import { redisCommand } from "./redis";
export async function audit(
  kind: string,
  userId?: string,
  reference?: string,
  client: PoolClient | typeof db = db,
) {
  await client.query(
    "INSERT INTO security_events (kind, user_id, reference) VALUES ($1,$2,$3)",
    [kind, userId ?? null, reference ?? null],
  );
}
export function sameOrigin(request: Request) {
  assert(
    request.headers.get("origin") === config().APP_ORIGIN,
    403,
    "INVALID_ORIGIN",
  );
  const site = request.headers.get("sec-fetch-site");
  assert(
    !site || ["same-origin", "none"].includes(site),
    403,
    "CROSS_SITE_REQUEST",
  );
}
export async function rateLimit(
  scope: string,
  identifier: string,
  maximum: number,
  windowSeconds = 60,
) {
  try {
    const count = await redisCommand(config().REDIS_URL, [
      "EVAL",
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
      "1",
      `streamify:limit:${scope}:${hash(identifier)}`,
      String(windowSeconds),
    ]);
    if (typeof count !== "number") throw new Error("Invalid limiter response");
    if (count > maximum) {
      await audit("rate_limit_exceeded", undefined, scope);
      throw new AppError(
        429,
        "RATE_LIMITED",
        "Too many attempts. Please try again later.",
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      503,
      "LIMITER_UNAVAILABLE",
      "Security services are temporarily unavailable.",
    );
  }
}
export function requestIp(request: Request) {
  return config().TRUST_PROXY
    ? (request.headers.get("x-real-ip") ?? "unknown")
    : "shared";
}
export async function pruneEvents() {
  return rows(
    "DELETE FROM security_events WHERE created_at < now() - interval '90 days' RETURNING id",
  );
}
