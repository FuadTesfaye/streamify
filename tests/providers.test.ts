import { test } from "node:test";
import assert from "node:assert/strict";
import {
  YouTubeProvider,
  MuxProvider,
  CloudflareStreamProvider,
  signMuxPlaybackToken,
  signCloudflareStreamToken,
  launchProviderPlayback,
} from "../src/lib/providers";

test("YouTubeProvider generates secure embed URL and external watch link for free content", async () => {
  const provider = new YouTubeProvider();
  const descriptor = await provider.launch(
    {
      id: "lesson-1",
      title: "Arabic Alphabet Basics",
      videoId: "dQw4w9WgXcQ",
      provider: "youtube",
      visibility: "free",
      playbackPolicy: "public",
    },
    {
      userId: "user-1",
      userEmail: "student@example.com",
      appOrigin: "https://streamify.example.com",
    },
  );

  assert.equal(descriptor.provider, "youtube");
  assert.equal(descriptor.videoId, "dQw4w9WgXcQ");
  assert.ok(descriptor.iframeEmbedUrl?.includes("https://www.youtube.com/embed/dQw4w9WgXcQ"));
  assert.ok(descriptor.iframeEmbedUrl?.includes("enablejsapi=1"));
  assert.ok(descriptor.iframeEmbedUrl?.includes("rel=0"));
  assert.equal(descriptor.externalUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(descriptor.warning, undefined);
});

test("YouTubeProvider emits architectural warning when used for paid content", async () => {
  const provider = new YouTubeProvider();
  const descriptor = await provider.launch(
    {
      id: "lesson-2",
      title: "Paid Course Lesson",
      videoId: "dQw4w9WgXcQ",
      provider: "youtube",
      visibility: "paid",
      playbackPolicy: "public",
    },
    {
      userId: "user-2",
      userEmail: "student@example.com",
      appOrigin: "https://streamify.example.com",
    },
  );

  assert.equal(descriptor.visibility, "paid");
  assert.equal(descriptor.externalUrl, undefined);
  assert.ok(descriptor.warning?.includes("Notice: YouTube Unlisted content cannot be fully paywalled"));
});

test("signMuxPlaybackToken generates valid verifiable JWT token with correct claims", () => {
  const secret = "test-mux-secret-key-1234567890";
  const playbackId = "00DSv4W00gKgq00";
  const token = signMuxPlaybackToken(playbackId, secret, "mux-k1", 300, {
    custom_watermark: "viewer@streamify.com",
  });

  const parts = token.split(".");
  assert.equal(parts.length, 3);

  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  assert.equal(header.alg, "HS256");
  assert.equal(header.kid, "mux-k1");

  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  assert.equal(payload.sub, playbackId);
  assert.equal(payload.aud, "v");
  assert.equal(payload.custom_watermark, "viewer@streamify.com");
  assert.ok(payload.exp > Math.floor(Date.now() / 1000));
});

test("MuxProvider attaches signed playback tokens when playbackPolicy is signed or drm", async () => {
  const provider = new MuxProvider();
  const descriptor = await provider.launch(
    {
      id: "lesson-mux-1",
      title: "Advanced Grammar Masterclass",
      videoId: "00DSv4W00gKgq00",
      provider: "mux",
      visibility: "paid",
      playbackPolicy: "drm",
    },
    {
      userId: "user-premium",
      userEmail: "premium@student.com",
      appOrigin: "https://streamify.example.com",
    },
  );

  assert.equal(descriptor.provider, "mux");
  assert.equal(descriptor.playbackId, "00DSv4W00gKgq00");
  assert.equal(descriptor.drmEnabled, true);
  assert.ok(descriptor.playbackToken && descriptor.playbackToken.split(".").length === 3);
  assert.ok(descriptor.playbackUrl?.includes("https://stream.mux.com/00DSv4W00gKgq00.m3u8?token="));
});

test("CloudflareStreamProvider attaches signed manifest URL", async () => {
  const provider = new CloudflareStreamProvider();
  const descriptor = await provider.launch(
    {
      id: "lesson-cf-1",
      title: "Cloudflare Stream Lesson",
      videoId: "ea95132c15732412d22c1476fa83f27a",
      provider: "cloudflare",
      visibility: "paid",
      playbackPolicy: "signed",
    },
    {
      userId: "user-cf",
      userEmail: "cf@student.com",
      appOrigin: "https://streamify.example.com",
    },
  );

  assert.equal(descriptor.provider, "cloudflare");
  assert.ok(descriptor.playbackUrl?.includes("https://videodelivery.net/"));
  assert.ok(descriptor.playbackUrl?.includes("/manifest/video.m3u8"));
});

test("launchProviderPlayback correctly dispatches to selected provider", async () => {
  const yt = await launchProviderPlayback(
    {
      id: "l1",
      title: "Y",
      videoId: "12345678901",
      provider: "youtube",
      visibility: "free",
      playbackPolicy: "public",
    },
    { userId: "u1", userEmail: "a@b.com", appOrigin: "https://app.com" },
  );
  assert.equal(yt.provider, "youtube");

  const mux = await launchProviderPlayback(
    {
      id: "l2",
      title: "M",
      videoId: "muxAssetId123",
      provider: "mux",
      visibility: "paid",
      playbackPolicy: "signed",
    },
    { userId: "u1", userEmail: "a@b.com", appOrigin: "https://app.com" },
  );
  assert.equal(mux.provider, "mux");
});
