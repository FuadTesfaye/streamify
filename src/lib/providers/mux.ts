import { createHmac } from "node:crypto";
import { config } from "../config";
import type { PlaybackDescriptor, ProviderContext, StreamingProvider } from "./types";

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function signMuxPlaybackToken(
  playbackId: string,
  secret: string,
  signingKeyId: string,
  expiresInSeconds = 300,
  extraClaims: Record<string, unknown> = {},
): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
    kid: signingKeyId,
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: playbackId,
    aud: "v",
    exp: now + expiresInSeconds,
    iat: now,
    ...extraClaims,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = createHmac("sha256", secret)
    .update(signatureInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signatureInput}.${signature}`;
}

export class MuxProvider implements StreamingProvider {
  name = "mux" as const;

  launch(
    lesson: {
      id: string;
      title: string;
      videoId: string;
      provider: "youtube" | "mux" | "cloudflare";
      visibility: "free" | "paid";
      playbackPolicy: "public" | "signed" | "drm";
    },
    context: ProviderContext,
  ): PlaybackDescriptor {
    const playbackId = lesson.videoId;
    const isSigned = lesson.playbackPolicy === "signed" || lesson.playbackPolicy === "drm";
    const appSecret = config().BETTER_AUTH_SECRET || "streamify-mux-fallback-secret-2026";
    const keyId = "mux-streamify-k1";

    let playbackToken: string | undefined;
    let playbackUrl: string;

    if (isSigned) {
      // 5-minute renewable token matched to lease window
      playbackToken = signMuxPlaybackToken(playbackId, appSecret, keyId, 300, {
        user_id: context.userId,
        email: context.userEmail,
        viewer: context.userEmail,
      });
      playbackUrl = `https://stream.mux.com/${encodeURIComponent(playbackId)}.m3u8?token=${playbackToken}`;
    } else {
      playbackUrl = `https://stream.mux.com/${encodeURIComponent(playbackId)}.m3u8`;
    }

    return {
      provider: "mux",
      videoId: playbackId,
      playbackId,
      title: lesson.title,
      playbackUrl,
      playbackToken,
      visibility: lesson.visibility,
      playbackPolicy: lesson.playbackPolicy,
      drmEnabled: lesson.playbackPolicy === "drm",
    };
  }
}

export const muxProvider = new MuxProvider();
