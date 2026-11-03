"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Play,
  ShieldCheck,
  Square,
  Share2,
  Check,
  Clock,
  Lock,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { request } from "./client-api";
import { HEARTBEAT_MS } from "@/lib/policy";
import { ViewerWatermark } from "./viewer-watermark";
import type { PlaybackDescriptor, ProviderType } from "@/lib/providers";

type LaunchResponse = {
  playbackSessionId: string;
  expiresAt: string;
} & PlaybackDescriptor;

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

let ytPromise: Promise<YouTube> | undefined;
function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return (ytPromise ??= new Promise<YouTube>((resolve, reject) => {
    const timer = setTimeout(() => {
      ytPromise = undefined;
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
      ytPromise = undefined;
      script.remove();
      reject(new Error("Unable to load YouTube. Check your connection."));
    };
    script.nonce =
      document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ?? "";
    document.head.appendChild(script);
  }));
}

export function UnifiedVideoPlayer({
  lessonId,
  origin,
  viewer,
  initialProvider = "youtube",
  initialVisibility = "free",
}: {
  lessonId: string;
  origin: string;
  viewer: string;
  initialProvider?: ProviderType;
  initialVisibility?: "free" | "paid";
}) {
  const [session, setSession] = useState<LaunchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [embedData, setEmbedData] = useState<{
    embedUrl: string;
    iframeHtml: string;
    expiresInSeconds: number;
  } | null>(null);
  const [embedBusy, setEmbedBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const container = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Playback Lease & Player Mount Lifecycle
  useEffect(() => {
    if (!session) return;
    const mount = container.current;
    let active = true;
    let ytPlayer: Player | undefined;
    let inFlight = false;
    let deadline = new Date(session.expiresAt).getTime();

    const end = (message: string) => {
      if (!active) return;
      setError(message);
      setSession(null);
    };

    // YouTube Provider Initialization
    if (session.provider === "youtube") {
      loadYouTube()
        .then((api) => {
          if (!active || !mount) return;
          const element = document.createElement("div");
          mount.appendChild(element);
          ytPlayer = new api.Player(element, {
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
                if (ytPlayer)
                  ytPlayer.getIframe().referrerPolicy =
                    "strict-origin-when-cross-origin";
              },
              onError: () =>
                end(
                  "YouTube cannot play this video. It may be unavailable or embedding may be disabled.",
                ),
            },
          });
        })
        .catch((e) => end(e.message));
    }

    // Expiry check interval
    const expiry = setInterval(() => {
      if (Date.now() >= deadline)
        end(
          "Playback authorization expired. Click start lesson to renew your lease.",
        );
    }, 500);

    // Heartbeat pulse interval to maintain lease
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

    // Release playback session on tab unload
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
      ytPlayer?.destroy();
      mount?.replaceChildren();
      release();
    };
  }, [session, origin]);

  async function launch() {
    setError("");
    setBusy(true);
    try {
      const data = await request<LaunchResponse>(
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

  async function generateEmbed() {
    setEmbedBusy(true);
    setShowEmbedModal(true);
    try {
      const res = await fetch("/api/embed/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create embed link");
      setEmbedData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not generate embed code.");
    } finally {
      setEmbedBusy(false);
    }
  }

  function copyEmbedHtml() {
    if (!embedData) return;
    navigator.clipboard.writeText(embedData.iframeHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const currentProvider = session?.provider ?? initialProvider;
  const currentVisibility = session?.visibility ?? initialVisibility;

  return (
    <section className="player-section">
      <div
        className="player-surface"
        onContextMenu={(e) => e.preventDefault()}
        style={{ position: "relative", overflow: "hidden", background: "#0c1310" }}
      >
        {session ? (
          <>
            {session.provider === "youtube" ? (
              <div className="youtube-mount" ref={container} />
            ) : (
              <video
                ref={videoRef}
                controls
                autoPlay
                playsInline
                src={session.playbackUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  background: "#000",
                }}
              />
            )}
            <ViewerWatermark
              viewer={viewer}
              sessionId={session.playbackSessionId}
            />
          </>
        ) : (
          <div className="player-placeholder">
            <span className="large-play">
              <Play size={28} strokeWidth={1.5} />
            </span>
            <h2>Ready when you are.</h2>
            <p>
              {currentVisibility === "paid"
                ? "Protected course playback · Active entitlement and browser verification required."
                : "Free lesson · Ready to stream securely."}
            </p>
            <button className="button light" onClick={launch} disabled={busy}>
              {busy ? "Verifying lease…" : "Start lesson"}
              <Play size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Control & Viewer Bar */}
      <div className="viewer-bar">
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <ShieldCheck size={17} /> Authorized viewer: {viewer}
        </span>

        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {currentProvider === "mux" ? (
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                background: "#eef4ff",
                color: "#2980b9",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Lock size={12} /> Mux DRM Signed
            </span>
          ) : currentProvider === "cloudflare" ? (
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                background: "#fff4e5",
                color: "#d35400",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Sparkles size={12} /> Cloudflare Stream
            </span>
          ) : (
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                background: "#ffeeec",
                color: "#c0392b",
                fontWeight: 600,
              }}
            >
              YouTube Embed
            </span>
          )}

          {session ? (
            <small style={{ color: "#7a8278" }}>
              Lease #{session.playbackSessionId.slice(0, 8).toUpperCase()}
            </small>
          ) : (
            <small style={{ color: "#7a8278" }}>Awaiting lease</small>
          )}
        </span>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {session?.externalUrl && (
            <a
              href={session.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-button"
              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              Watch on YouTube <ExternalLink size={12} />
            </a>
          )}
          <button
            className="text-button"
            onClick={generateEmbed}
            title="Embed this lesson"
          >
            <Share2 size={13} /> Ephemeral Embed
          </button>
          {session && (
            <button className="text-button" onClick={() => setSession(null)}>
              <Square size={12} /> End playback
            </button>
          )}
        </div>
      </div>

      {showEmbedModal && (
        <div
          className="notice"
          style={{
            marginTop: "16px",
            background: "#18201d",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <h4
              style={{
                margin: 0,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Clock size={16} /> Ephemeral Embed Gateway
            </h4>
            <button
              className="text-button"
              onClick={() => setShowEmbedModal(false)}
            >
              Close
            </button>
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "#9ca7a1",
              margin: "0 0 12px 0",
            }}
          >
            This embed snippet is bound to a{" "}
            <strong>single-use ephemeral token</strong>. If copied and opened in
            another browser or incognito, it automatically expires upon
            copy-paste or after 3 minutes.
          </p>

          {embedBusy ? (
            <p style={{ fontSize: "13px", color: "#e4edb7" }}>
              Generating signed token…
            </p>
          ) : embedData ? (
            <div>
              <textarea
                readOnly
                value={embedData.iframeHtml}
                rows={3}
                style={{
                  width: "100%",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  padding: "8px",
                  background: "#101613",
                  color: "#d1d5db",
                  border: "1px solid #2e3a33",
                  borderRadius: "6px",
                  resize: "none",
                }}
              />
              <button
                className="button small"
                onClick={copyEmbedHtml}
                style={{
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {copied ? <Check size={14} /> : <Share2 size={14} />}
                {copied ? "Copied Embed Code!" : "Copy Embed IFrame"}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {error && (
        <div className="notice error" role="alert">
          {error} <Link href="/account">Manage sessions →</Link>
        </div>
      )}

      {session?.warning && (
        <div
          className="notice"
          style={{
            marginTop: "12px",
            background: "rgba(186, 110, 78, 0.08)",
            border: "1px solid #ba6e4e",
            color: "#e6b098",
            fontSize: "13px",
          }}
        >
          {session.warning}
        </div>
      )}

      <p className="playback-disclosure">
        {currentProvider === "mux" ? (
          <>
            Delivered via Mux Signed Streaming with hardware DRM and forensic
            watermarking. Unauthorized copying or token re-use is blocked.{" "}
            <Link href="/privacy">Security policy</Link>
          </>
        ) : currentProvider === "cloudflare" ? (
          <>
            Delivered via Cloudflare Stream with signed token authorization.{" "}
            <Link href="/privacy">Security policy</Link>
          </>
        ) : (
          <>
            Delivered by YouTube. Application access is managed by your
            institution; unlisted YouTube links can still be shared if the raw
            ID is discovered. <Link href="/privacy">Playback information</Link>
          </>
        )}
      </p>
    </section>
  );
}
