import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Play,
  ArrowRight,
  Share2,
  Clock,
  EyeOff,
  Radio,
  FileCheck2,
  Layers,
  Sparkles,
} from "lucide-react";
import { StreamifyHero } from "@/components/streamify-hero";

export default function Home() {
  return (
    <div style={{ background: "#0e1110", color: "#f8f8f3", minHeight: "100vh" }}>
      {/* 1. Hero Experience (Cloned from Image 2 with Forest Art & Streamify Content) */}
      <StreamifyHero />

      {/* 2. Security Architecture (The 5-Layer Private Streaming Model) */}
      <section
        id="architecture"
        style={{
          maxWidth: "1360px",
          margin: "0 auto",
          padding: "64px 24px 80px 24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "780px", margin: "0 auto 48px auto" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#4ade80",
              display: "inline-block",
              marginBottom: "8px",
            }}
          >
            ZERO-TRUST ARCHITECTURE
          </span>
          <h2 style={{ fontSize: "clamp(2rem, 3.5vw, 2.8rem)", fontWeight: 700, color: "#ffffff", margin: "0 0 16px 0", letterSpacing: "-0.02em" }}>
            The 5-Layer Private Video Streaming Model
          </h2>
          <p style={{ color: "#9ca7a1", fontSize: "16px", lineHeight: 1.6, margin: 0 }}>
            YouTube hosts and delivers the video stream globally. Our application acts as a zero-trust
            access control gateway, enforcing strict authentication, concurrency limits, and ephemeral leases.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              background: "rgba(22, 28, 25, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "28px",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", color: "#4ade80" }}>
              <EyeOff size={22} />
              <h3 style={{ fontSize: "18px", margin: 0, color: "#ffffff" }}>1. Concealed Video IDs</h3>
            </div>
            <p style={{ fontSize: "14px", color: "#9ba7a1", lineHeight: 1.65, margin: 0 }}>
              YouTube video IDs and source links are never rendered in client HTML, public routes, or unauthenticated APIs.
              Public pages reference only internal database slugs (`/courses/[courseId]/lessons/[lessonId]`).
            </p>
          </div>

          {/* Card 2 */}
          <div
            style={{
              background: "rgba(22, 28, 25, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "28px",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", color: "#4ade80" }}>
              <Clock size={22} />
              <h3 style={{ fontSize: "18px", margin: 0, color: "#ffffff" }}>2. Ephemeral Playback Leases</h3>
            </div>
            <p style={{ fontSize: "14px", color: "#9ba7a1", lineHeight: 1.65, margin: 0 }}>
              When an authorized student clicks Play, the server issues a 90-second playback lease.
              The client player must send a cryptographic heartbeat every 30 seconds to maintain access. If abandoned, the lease expires immediately.
            </p>
          </div>

          {/* Card 3 */}
          <div
            style={{
              background: "rgba(22, 28, 25, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "28px",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", color: "#4ade80" }}>
              <Radio size={22} />
              <h3 style={{ fontSize: "18px", margin: 0, color: "#ffffff" }}>3. Concurrency Lock</h3>
            </div>
            <p style={{ fontSize: "14px", color: "#9ba7a1", lineHeight: 1.65, margin: 0 }}>
              PostgreSQL account-row locking guarantees that a user account can only stream a single lesson at any moment.
              Attempting to watch in multiple tabs, another browser, or an Incognito window locks playback until the previous lease concludes.
            </p>
          </div>

          {/* Card 4 */}
          <div
            style={{
              background: "rgba(22, 28, 25, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "28px",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", color: "#4ade80" }}>
              <Share2 size={22} />
              <h3 style={{ fontSize: "18px", margin: 0, color: "#ffffff" }}>4. Ephemeral Embed Links</h3>
            </div>
            <p style={{ fontSize: "14px", color: "#9ba7a1", lineHeight: 1.65, margin: 0 }}>
              Generate signed embed snippets for external portals. Tokens expire within 3 minutes and are tied to the active viewer session.
              Copying and sharing the link to another person or incognito tab causes it to immediately expire.
            </p>
          </div>

          {/* Card 5 */}
          <div
            style={{
              background: "rgba(22, 28, 25, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "28px",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", color: "#4ade80" }}>
              <FileCheck2 size={22} />
              <h3 style={{ fontSize: "18px", margin: 0, color: "#ffffff" }}>5. Forensic Watermarking</h3>
            </div>
            <p style={{ fontSize: "14px", color: "#9ba7a1", lineHeight: 1.65, margin: 0 }}>
              A dynamic, subtle watermark displaying the masked viewer email, active session ID, and UTC timestamp floats across the video.
              It shifts coordinates periodically across 6 zones to deter screen recording and leak distribution.
            </p>
          </div>

          {/* Card 6 */}
          <div
            style={{
              background: "rgba(22, 28, 25, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "28px",
              backdropFilter: "blur(12px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", color: "#f97316" }}>
              <ShieldCheck size={22} />
              <h3 style={{ fontSize: "18px", margin: 0, color: "#ffffff" }}>Transparent Security Scope</h3>
            </div>
            <p style={{ fontSize: "14px", color: "#9ba7a1", lineHeight: 1.65, margin: 0 }}>
              We protect your application with complete rigor. However, YouTube serves the underlying stream;
              if an authorized viewer extracts a raw unlisted YouTube ID via browser devtools, YouTube itself allows that unlisted ID to play.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Honest Security & Architecture Section */}
      <section
        id="security"
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "linear-gradient(to bottom, #111513 0%, #0d100f 100%)",
          padding: "80px 24px",
        }}
      >
        <div style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "9999px",
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.25)",
              color: "#4ade80",
              fontSize: "12px",
              fontWeight: 600,
              marginBottom: "16px",
            }}
          >
            <Lock size={13} /> AUTHENTICATION INTEGRITY
          </div>

          <h2 style={{ fontSize: "clamp(2rem, 3.2vw, 2.6rem)", fontWeight: 700, color: "#ffffff", marginBottom: "20px", letterSpacing: "-0.02em" }}>
            Application Gateway vs. Platform DRM
          </h2>
          <p style={{ color: "#9ca7a1", fontSize: "16px", lineHeight: 1.7, maxWidth: "760px", margin: "0 auto 36px auto" }}>
            Streamify gives you strict institutional access control, session lifecycle limits, and leak deterrence.
            We ensure unauthorized visitors cannot enter your courses, scrape your syllabus, or steal embed links.
            For full DRM or encrypted stream delivery, we offer a modular provider architecture ready for Cloudflare Stream or Mux.
          </p>

          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#22c55e",
                color: "#0f1712",
                fontWeight: 600,
                fontSize: "14px",
                padding: "12px 28px",
                borderRadius: "9999px",
                textDecoration: "none",
                transition: "background 0.15s ease",
              }}
            >
              Sign In with Authenticator MFA <ArrowRight size={16} />
            </Link>
            <Link
              href="/courses"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                color: "#ffffff",
                fontWeight: 500,
                fontSize: "14px",
                padding: "12px 28px",
                borderRadius: "9999px",
                textDecoration: "none",
              }}
            >
              Explore Course Catalog
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "36px 42px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          fontSize: "13px",
          color: "#717d76",
        }}
      >
        <span>© {new Date().getFullYear()} Streamify Private Video Gateway</span>
        <div style={{ display: "flex", gap: "24px" }}>
          <Link href="/privacy" style={{ color: "#9ca7a1", textDecoration: "none" }}>
            Privacy & Playback Security Disclosure
          </Link>
          <Link href="/admin" style={{ color: "#9ca7a1", textDecoration: "none" }}>
            Gateway Command Center
          </Link>
        </div>
      </footer>
    </div>
  );
}
