import Link from "next/link";
import {
  ArrowUpRight,
  ShieldCheck,
  Lock,
  Play,
  ArrowRight,
  Share2,
  Clock,
  EyeOff,
  Radio,
  FileCheck2,
} from "lucide-react";
import { Brand } from "@/components/brand";

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-header">
        <Brand />
        <nav>
          <a href="#architecture">Architecture</a>
          <a href="#security">Zero-Trust Model</a>
          <Link href="/privacy">Privacy</Link>
          <Link className="button small" href="/login">
            Sign In <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div>
          <span className="eyebrow">
            <span className="tiny-dot" /> Private Video Streaming Gateway
          </span>
          <h1>
            YouTube Delivery.
            <br />
            <em>Zero-Trust</em> Access.
          </h1>
          <p>
            Use YouTube as your high-performance global hosting and video delivery infrastructure,
            while your application enforces strict per-user authorization, expiring playback leases,
            copy-paste embed expiry, and dynamic forensic watermarking.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", margin: "24px 0" }}>
            <Link className="button" href="/courses">
              Access Course Library <ArrowRight size={18} />
            </Link>
            <a className="button secondary" href="#architecture">
              How the Gateway Works
            </a>
          </div>
          <div className="hero-footnote">
            <ShieldCheck size={16} /> Heartbeat-renewed leases • Single-stream lock • Forensic watermarking
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-card" style={{ padding: "28px 24px" }}>
            <span className="eyebrow" style={{ color: "#ba6e4e" }}>
              Active Gateway Protection
            </span>
            <div style={{ margin: "20px 0" }}>
              <div
                style={{
                  background: "#121a16",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "14px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  color: "#d1dbd5",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#e4edb7" }}>
                  <Lock size={13} /> SECURE_LEASE: ACTIVE
                </div>
                <div style={{ marginTop: "6px", color: "#8a9690" }}>
                  Lease Pulse: 30s Heartbeat
                </div>
                <div style={{ color: "#8a9690" }}>
                  Video ID: Concealed in DB
                </div>
                <div style={{ color: "#8a9690" }}>
                  Watermark: Masked Viewer Hash
                </div>
              </div>
            </div>
            <h2 style={{ fontSize: "20px", margin: "10px 0" }}>
              Controlled Playback.
              <br />
              Protected Stream.
            </h2>
            <span className="art-play">
              <Play size={18} fill="currentColor" />
            </span>
          </div>
          <span className="floating-note">Ephemeral Embeds ↗</span>
        </div>
      </section>

      {/* Security Architecture Flow */}
      <section id="architecture" className="landing-bottom" style={{ borderTop: "1px solid var(--line)", padding: "64px 0" }}>
        <div style={{ maxWidth: "1040px", margin: "0 auto", padding: "0 24px" }}>
          <span className="eyebrow" style={{ display: "block", marginBottom: "8px" }}>
            HOW ACCESS WORKS
          </span>
          <h2 style={{ fontSize: "32px", color: "var(--ink)", marginBottom: "16px" }}>
            The 5-Layer Private Streaming Security Model
          </h2>
          <p style={{ maxWidth: "720px", color: "var(--muted)", marginBottom: "40px", fontSize: "16px" }}>
            We bridge the gap between open video platforms and private educational environments
            without relying on superficial JavaScript tricks that fail inspection.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
            }}
          >
            <div className="card" style={{ background: "var(--white)", padding: "24px", borderRadius: "12px", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--forest)" }}>
                <EyeOff size={22} />
                <h3 style={{ fontSize: "18px", margin: 0 }}>1. Concealed Video IDs</h3>
              </div>
              <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6 }}>
                YouTube video IDs and source links are never rendered in HTML, public routes, or unauthenticated APIs.
                Public pages reference only internal database slugs (`/courses/[courseId]/lessons/[lessonId]`).
              </p>
            </div>

            <div className="card" style={{ background: "var(--white)", padding: "24px", borderRadius: "12px", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--forest)" }}>
                <Clock size={22} />
                <h3 style={{ fontSize: "18px", margin: 0 }}>2. Ephemeral Playback Leases</h3>
              </div>
              <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6 }}>
                When an enrolled student clicks Play, the server issues a 90-second playback lease.
                The player must send a cryptographic heartbeat every 30 seconds to maintain access. If abandoned, the lease expires immediately.
              </p>
            </div>

            <div className="card" style={{ background: "var(--white)", padding: "24px", borderRadius: "12px", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--forest)" }}>
                <Radio size={22} />
                <h3 style={{ fontSize: "18px", margin: 0 }}>3. Concurrency Lock</h3>
              </div>
              <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6 }}>
                PostgreSQL account-row locking guarantees that a user account can only stream a single lesson at any moment.
                Attempting to watch in multiple tabs, another browser, or an Incognito window locks playback until the previous lease concludes.
              </p>
            </div>

            <div className="card" style={{ background: "var(--white)", padding: "24px", borderRadius: "12px", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--forest)" }}>
                <Share2 size={22} />
                <h3 style={{ fontSize: "18px", margin: 0 }}>4. Ephemeral Embed Links</h3>
              </div>
              <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6 }}>
                Generate signed embed snippets for external portals. Tokens expire within 3 minutes and are tied to the active viewer session.
                Copying and sharing the link to another person or incognito tab causes it to immediately expire.
              </p>
            </div>

            <div className="card" style={{ background: "var(--white)", padding: "24px", borderRadius: "12px", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--forest)" }}>
                <FileCheck2 size={22} />
                <h3 style={{ fontSize: "18px", margin: 0 }}>5. Forensic Watermarking</h3>
              </div>
              <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6 }}>
                A dynamic, subtle watermark displaying the masked viewer email, active session ID, and UTC timestamp floats across the video.
                It changes coordinates periodically to deter screen recording and leak distribution.
              </p>
            </div>

            <div className="card" style={{ background: "var(--white)", padding: "24px", borderRadius: "12px", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--orange)" }}>
                <ShieldCheck size={22} />
                <h3 style={{ fontSize: "18px", margin: 0 }}>Transparent Security Scope</h3>
              </div>
              <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.6 }}>
                We protect your application with complete rigor. However, YouTube serves the underlying stream;
                if an authorized viewer extracts a raw unlisted YouTube ID via devtools, YouTube itself allows that unlisted ID to play.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Disclosure */}
      <section id="security" style={{ background: "#21362d", color: "#f8f8f3", padding: "60px 24px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "28px", color: "#fff", marginBottom: "16px" }}>
            Honest Security: Application Gateway vs. Platform DRM
          </h2>
          <p style={{ color: "#c1cfc7", fontSize: "15px", lineHeight: 1.7, marginBottom: "28px" }}>
            Streamify gives you strict institutional access control, session lifecycle limits, and leak deterrence.
            We ensure unauthorized visitors cannot enter your courses, scrape your syllabus, or steal embed links.
            For full DRM or encrypted stream delivery, we offer a modular provider architecture ready for Cloudflare Stream or Mux.
          </p>
          <Link className="button light" href="/login">
            Sign In with Authenticator MFA <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="public-footer">
        <span>© {new Date().getFullYear()} Streamify Private Video Gateway</span>
        <Link href="/privacy">Privacy & Playback Security Disclosure</Link>
      </footer>
    </main>
  );
}
