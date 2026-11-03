import { createHmac } from "node:crypto";
import { config } from "../config";
import type { PlaybackDescriptor, ProviderContext, StreamingProvider } from "./types";

export function signCloudflareStreamToken(
  streamUid: string,
  keyPemOrSecret: string,
  expiresInSeconds = 300,
  extraClaims: Record<string, unknown> = {},
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: streamUid,
    kid: "cf-stream-k1",
    exp: now + expiresInSeconds,
    nbf: now - 10,
    ...extraClaims,
  };

  const toB64Url = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const unsigned = `${toB64Url(header)}.${toB64Url(payload)}`;
  const sig = createHmac("sha256", keyPemOrSecret)
    .update(unsigned)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${unsigned}.${sig}`;
}

export class CloudflareStreamProvider implements StreamingProvider {
  name = "cloudflare" as const;

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
    const streamUid = lesson.videoId;
    const isSigned = lesson.playbackPolicy === "signed" || lesson.playbackPolicy === "drm";
    const appSecret = config().BETTER_AUTH_SECRET || "cf-stream-fallback-secret-2026";

    let playbackToken: string | undefined;
    let playbackUrl: string;

    if (isSigned) {
      playbackToken = signCloudflareStreamToken(streamUid, appSecret, 300, {
        user_id: context.userId,
        email: context.userEmail,
      });
      playbackUrl = `https://videodelivery.net/${encodeURIComponent(playbackToken)}/manifest/video.m3u8`;
    } else {
      playbackUrl = `https://videodelivery.net/${encodeURIComponent(streamUid)}/manifest/video.m3u8`;
    }

    return {
      provider: "cloudflare",
      videoId: streamUid,
      playbackId: streamUid,
      title: lesson.title,
      playbackUrl,
      playbackToken,
      visibility: lesson.visibility,
      playbackPolicy: lesson.playbackPolicy,
      drmEnabled: lesson.playbackPolicy === "drm",
    };
  }
}

export const cloudflareProvider = new CloudflareStreamProvider();
