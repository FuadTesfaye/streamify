"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Play, ShieldCheck, Square } from "lucide-react";
import { request } from "./client-api";
import { HEARTBEAT_MS } from "@/lib/policy";
type Launch = {
  playbackSessionId: string;
  provider: "youtube";
  videoId: string;
  expiresAt: string;
};
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
      reject(new Error("YouTube did not respond. Please retry."));
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
      reject(new Error("Unable to load YouTube. Check your connection."));
    };
    script.nonce =
      document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ?? "";
    document.head.appendChild(script);
  }));
}
export function YouTubePlayer({
  lessonId,
  origin,
  viewer,
}: {
  lessonId: string;
  origin: string;
  viewer: string;
}) {
  const [session, setSession] = useState<Launch | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null),
    mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!session) return;
    const mount = container.current;
    let active = true,
      player: Player | undefined,
      inFlight = false;
    let deadline = new Date(session.expiresAt).getTime();
    const end = (message: string) => {
      if (!active) return;
      setError(message);
      setSession(null);
    };
    loadYouTube()
      .then((api) => {
        if (!active || !mount) return;
        const element = document.createElement("div");
        mount.appendChild(element);
        player = new api.Player(element, {
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
              if (player)
                player.getIframe().referrerPolicy =
                  "strict-origin-when-cross-origin";
            },
            onError: () =>
              end(
                "YouTube cannot play this video. It may be unavailable or embedding may be disabled. Contact your institution.",
              ),
          },
        });
      })
      .catch((e) => end(e.message));
    const expiry = setInterval(() => {
      if (Date.now() >= deadline)
        end(
          "Playback authorization expired. Start again to check your access.",
        );
    }, 500);
    const pulse = setInterval(async () => {
      if (inFlight || !active) return;
      inFlight = true;
      try {
        const data = await request<{ expiresAt: string }>(
          `/api/playback/${session.playbackSessionId}/heartbeat`,
          {},
        );
        if (active && Date.now() < deadline)
          deadline = new Date(data.expiresAt).getTime();
      } catch (e) {
        end(e instanceof Error ? e.message : "Access could not be verified.");
      } finally {
        inFlight = false;
      }
    }, HEARTBEAT_MS);
    const release = () => {
      void fetch(`/api/playback/${session.playbackSessionId}/release`, {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }).catch(() => {});
    };
    window.addEventListener("pagehide", release);
    return () => {
      active = false;
      clearInterval(expiry);
      clearInterval(pulse);
      window.removeEventListener("pagehide", release);
      player?.destroy();
      mount?.replaceChildren();
      release();
    };
  }, [session, origin]);
  async function launch() {
    setError("");
    setBusy(true);
    try {
      const data = await request<Launch>(
        `/api/lessons/${lessonId}/playback`,
        {},
      );
      if (mounted.current) setSession(data);
      else
        void request(
          `/api/playback/${data.playbackSessionId}/release`,
          {},
        ).catch(() => {});
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to authorize playback.",
      );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section className="player-section">
      <div className="player-surface">
        {session ? (
          <div className="youtube-mount" ref={container} />
        ) : (
          <div className="player-placeholder">
            <span className="large-play">
              <Play size={28} strokeWidth={1.5} />
            </span>
            <h2>Ready when you are.</h2>
            <p>Your access is checked before each playback.</p>
            <button className="button light" onClick={launch} disabled={busy}>
              {busy ? "Checking access…" : "Start lesson"}
              <Play size={16} />
            </button>
          </div>
        )}
      </div>
      <div className="viewer-bar">
        <span>
          <ShieldCheck size={17} /> Authorized viewer: {viewer}
        </span>
        <span>
          {session
            ? `Session ${session.playbackSessionId.slice(0, 8).toUpperCase()}`
            : "Awaiting authorization"}
        </span>
        {session && (
          <button className="text-button" onClick={() => setSession(null)}>
            <Square size={12} /> End playback
          </button>
        )}
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error} <Link href="/account">Manage sessions →</Link>
        </div>
      )}
      <p className="playback-disclosure">
        Delivered by YouTube. Application access is managed by your institution;
        unlisted YouTube links can still be shared.{" "}
        <Link href="/privacy">Playback information</Link>
      </p>
    </section>
  );
}
