import type { PlaybackDescriptor, ProviderContext, StreamingProvider } from "./types";

export class YouTubeProvider implements StreamingProvider {
  name = "youtube" as const;

  launch(
    lesson: {
      id: string;
      title: string;
      videoId: string;
      provider: "youtube" | "mux" | "cloudflare";
      visibility: "free" | "paid";
      playbackPolicy: "public" | "signed" | "drm";
    },
    _context: ProviderContext,
  ): PlaybackDescriptor {
    const videoId = lesson.videoId;
    const isFree = lesson.visibility === "free";

    // Standard secure embed query params for YouTube player
    const params = new URLSearchParams({
      enablejsapi: "1",
      modestbranding: "1",
      rel: "0",
      iv_load_policy: "3",
      playsinline: "1",
    });

    const iframeEmbedUrl = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
    const externalUrl = isFree ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : undefined;

    return {
      provider: "youtube",
      videoId,
      title: lesson.title,
      visibility: lesson.visibility,
      playbackPolicy: lesson.playbackPolicy,
      iframeEmbedUrl,
      externalUrl,
      warning:
        lesson.visibility === "paid"
          ? "Notice: YouTube Unlisted content cannot be fully paywalled at the network level. Switch this lesson to Mux or Cloudflare Stream for hardware-enforced DRM and signed playback tokens."
          : undefined,
    };
  }
}

export const youtubeProvider = new YouTubeProvider();
