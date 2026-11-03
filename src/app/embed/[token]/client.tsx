"use client";

import { useEffect, useRef, useState } from "react";
import { Play, ShieldCheck } from "lucide-react";
import { ViewerWatermark } from "@/components/viewer-watermark";

interface LaunchData {
  playbackSessionId: string;
  provider: "youtube";
  videoId: string;
  expiresAt: string;
  viewer: string;
}

type Player = { destroy: () => void; getIframe: () => HTMLIFrameElement };
type YouTube = {
  Player: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => Player;
};

declare global {
  interface Window {
    YT?: YouTube;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YouTube> | undefined;
function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return (apiPromise ??= new Promise<YouTube>((resolve, reject) => {
    const timer = setTimeout(() => {
      apiPromise = undefined;
      reject(new Error("YouTube API did not respond in time."));
    }, 15000);
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => {
      clearTimeout(timer);
      apiPromise = undefined;
      script.remove();
      reject(new Error("Failed to load YouTube player script."));
    };
    document.head.appendChild(script);
  }));
}

export function EmbedPlayerClient({
  token,
  origin,
  initialViewer,
}: {
  token: string;
  origin: string;
  initialViewer: string;
}) {
  const [session, setSession] = useState<LaunchData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    const mount = container.current;
    let active = true;
    let player: Player | undefined;
    let deadline = new Date(session.expiresAt).getTime();

    const terminate = (msg: string) => {
      if (!active) return;
      setError(msg);
      setSession(null);
    };

    loadYouTube()
      .then((api) => {
        if (!active || !mount) return;
        const elem = document.createElement("div");
        mount.appendChild(elem);
        player = new api.Player(elem, {
          videoId: session.videoId,
          width: "100%",
          height: "100%",
          host: "https://www.youtube.com",
          playerVars: {
            enablejsapi: 1,
            origin,
            playsinline: 1,
            rel: 0,
            controls: 1,
          },
          events: {
            onReady: () => {
              if (player) {
                player.getIframe().referrerPolicy =
                  "strict-origin-when-cross-origin";
              }
            },
            onError: () =>
              terminate(
                "Video is unavailable or embedding has been restricted.",
              ),
          },
        });
      })
      .catch((err) => terminate(err.message));

    const expiryCheck = setInterval(() => {
      if (Date.now() >= deadline) {
        terminate("Playback lease has expired. Re-open through your course.");
      }
    }, 500);

    return () => {
      active = false;
      clearInterval(expiryCheck);
      player?.destroy();
      mount?.replaceChildren();
    };
  }, [session, origin]);

  async function launch() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/embed/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to verify playback token.");
      }
      setSession(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Playback verification failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="embed-player-wrapper"
      onContextMenu={(e) => e.preventDefault()}
    >
      {session ? (
        <div className="embed-video-stage">
          <div className="youtube-mount" ref={container} />
          <ViewerWatermark
            viewer={session.viewer || initialViewer}
            sessionId={session.playbackSessionId}
          />
        </div>
      ) : (
        <div className="embed-launch-stage">
          {error ? (
            <div className="notice error">
              <p>{error}</p>
              <button
                className="button small"
                onClick={launch}
                disabled={busy}
                style={{ marginTop: "1rem" }}
              >
                Retry verification
              </button>
            </div>
          ) : (
            <div className="embed-ready-card">
              <span className="large-play">
                <Play size={32} />
              </span>
              <h3>Private Video Playback</h3>
              <p>
                Authorized for: <strong>{initialViewer}</strong>
              </p>
              <button
                className="button light"
                onClick={launch}
                disabled={busy}
              >
                {busy ? "Verifying lease…" : "Start Playback"}
                <Play size={16} />
              </button>
            </div>
          )}
        </div>
      )}
      <div className="embed-footer-bar">
        <span>
          <ShieldCheck size={14} /> Streamify Private Gateway
        </span>
        <span>
          {session
            ? `Lease ID: ${session.playbackSessionId.slice(0, 8).toUpperCase()}`
            : "Protected via Ephemeral Lease"}
        </span>
      </div>
    </div>
  );
}
