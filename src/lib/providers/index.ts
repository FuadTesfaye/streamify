import type {
  PlaybackDescriptor,
  ProviderContext,
  ProviderType,
  StreamingProvider,
} from "./types";
import { youtubeProvider } from "./youtube";
import { muxProvider } from "./mux";
import { cloudflareProvider } from "./cloudflare";

export * from "./types";
export * from "./youtube";
export * from "./mux";
export * from "./cloudflare";

const providers: Record<ProviderType, StreamingProvider> = {
  youtube: youtubeProvider,
  mux: muxProvider,
  cloudflare: cloudflareProvider,
};

export function getProvider(type: ProviderType): StreamingProvider {
  const provider = providers[type];
  if (!provider) {
    throw new Error(`Unsupported streaming provider: ${type}`);
  }
  return provider;
}

export async function launchProviderPlayback(
  lesson: {
    id: string;
    title: string;
    videoId: string;
    provider: ProviderType;
    visibility: "free" | "paid";
    playbackPolicy: "public" | "signed" | "drm";
  },
  context: ProviderContext,
): Promise<PlaybackDescriptor> {
  const provider = getProvider(lesson.provider);
  return await provider.launch(lesson, context);
}
