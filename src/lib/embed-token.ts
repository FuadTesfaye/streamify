import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "./config";
import { AppError } from "./errors";

export interface EmbedTokenPayload {
  lessonId: string;
  userId: string;
  viewer: string;
  exp: number; // Unix timestamp in seconds
  nonce: string;
}

function getSecret(): string {
  try {
    return config().BETTER_AUTH_SECRET;
  } catch {
    return process.env.BETTER_AUTH_SECRET || "fallback-secret-for-development-32-chars";
  }
}

/**
 * Creates an ephemeral, cryptographically signed token for embedding a lesson.
 * Defaults to 180 seconds (3 minutes) validity to prevent link sharing and copy-paste abuse.
 */
export function createEmbedToken(
  params: { lessonId: string; userId: string; viewer: string },
  expiresInSeconds = 180,
): string {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const nonce = randomBytes(12).toString("hex");

  const payload: EmbedTokenPayload = {
    lessonId: params.lessonId,
    userId: params.userId,
    viewer: params.viewer,
    exp,
    nonce,
  };

  const serialized = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(serialized)
    .digest("base64url");

  return `${serialized}.${signature}`;
}

/**
 * Verifies an ephemeral embed token.
 * Throws AppError(403) if expired, tampered, or invalid.
 */
export function verifyEmbedToken(token: string): EmbedTokenPayload {
  const secret = getSecret();
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new AppError(400, "INVALID_TOKEN", "Malformed embed token structure.");
  }

  const [serialized, signature] = parts;
  const expectedSignature = createHmac("sha256", secret)
    .update(serialized)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    throw new AppError(403, "TAMPERED_TOKEN", "Invalid embed token signature.");
  }

  let payload: EmbedTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(serialized, "base64url").toString("utf8"));
  } catch {
    throw new AppError(400, "INVALID_TOKEN", "Unparseable embed token payload.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new AppError(
      403,
      "TOKEN_EXPIRED",
      "This embed playback token has expired. Embed links cannot be copied or shared.",
    );
  }

  return payload;
}
