export type ProviderType = "youtube" | "mux" | "cloudflare";
export type VisibilityType = "free" | "paid";
export type PlaybackPolicy = "public" | "signed" | "drm";

export interface PlaybackDescriptor {
  provider: ProviderType;
  videoId: string;
  title?: string;
  playbackId?: string;
  playbackUrl?: string;
  playbackToken?: string;
  visibility: VisibilityType;
  playbackPolicy: PlaybackPolicy;
  externalUrl?: string;
  iframeEmbedUrl?: string;
  warning?: string;
  drmEnabled?: boolean;
}

export interface ProviderContext {
  userId: string;
  userEmail: string;
  sessionId?: string;
  browserId?: string;
  appOrigin: string;
}

export interface StreamingProvider {
  name: ProviderType;
  launch(
    lesson: {
      id: string;
      title: string;
      videoId: string;
      provider: ProviderType;
      visibility: VisibilityType;
      playbackPolicy: PlaybackPolicy;
    },
    context: ProviderContext,
  ): Promise<PlaybackDescriptor> | PlaybackDescriptor;
}
