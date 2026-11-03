"use client";

import { useEffect, useState } from "react";

interface ViewerWatermarkProps {
  viewer: string;
  sessionId?: string;
}

const POSITIONS = [
  { top: "12%", left: "10%" },
  { top: "18%", right: "12%" },
  { bottom: "16%", left: "14%" },
  { bottom: "20%", right: "10%" },
  { top: "45%", left: "30%" },
  { top: "55%", right: "25%" },
];

function maskEmail(email: string) {
  if (!email || !email.includes("@")) return email || "Authorized Viewer";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function ViewerWatermark({ viewer, sessionId }: ViewerWatermarkProps) {
  const [posIndex, setPosIndex] = useState(0);
  const [timestamp, setTimestamp] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimestamp(
        `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)} UTC`,
      );
    };
    updateTime();

    // Shift watermark position every 14 seconds to deter screen cropping
    const posTimer = setInterval(() => {
      setPosIndex((prev) => (prev + 1) % POSITIONS.length);
      updateTime();
    }, 14000);

    return () => clearInterval(posTimer);
  }, []);

  const maskedViewer = maskEmail(viewer);
  const sessionSnippet = sessionId ? sessionId.slice(0, 8).toUpperCase() : "";
  const currentPos = POSITIONS[posIndex];

  return (
    <div
      className="viewer-watermark-overlay"
      style={{
        position: "absolute",
        zIndex: 20,
        pointerEvents: "none",
        userSelect: "none",
        transition: "all 1.2s ease-in-out",
        opacity: 0.22,
        fontFamily: "monospace",
        fontSize: "0.75rem",
        color: "#ffffff",
        textShadow: "0 0 4px rgba(0,0,0,0.8)",
        letterSpacing: "0.05em",
        ...currentPos,
      }}
      aria-hidden="true"
    >
      <div>{maskedViewer}</div>
      {sessionSnippet && <div>SES: {sessionSnippet}</div>}
      {timestamp && <div>{timestamp}</div>}
    </div>
  );
}
