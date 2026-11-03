"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ArrowRight, Check } from "lucide-react";

export function SegmentedCounter() {
  return (
    <svg
      width="170"
      height="38"
      viewBox="0 0 170 38"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-label="50,000+"
      style={{ display: "block", marginBottom: "14px" }}
    >
      {/* 5 */}
      <path d="M 21 4 H 4 V 18 H 21 V 34 H 4" />
      {/* 0 */}
      <rect x="29" y="4" width="20" height="30" rx="2" />
      <line x1="47" y1="6" x2="31" y2="32" />
      {/* , */}
      <line x1="55" y1="32" x2="53" y2="38" strokeWidth="2.4" />
      {/* 0 */}
      <rect x="61" y="4" width="20" height="30" rx="2" />
      <line x1="79" y1="6" x2="63" y2="32" />
      {/* 0 */}
      <rect x="87" y="4" width="20" height="30" rx="2" />
      <line x1="105" y1="6" x2="89" y2="32" />
      {/* 0 */}
      <rect x="113" y="4" width="20" height="30" rx="2" />
      <line x1="131" y1="6" x2="115" y2="32" />
      {/* + */}
      <line x1="143" y1="19" x2="159" y2="19" strokeWidth="2.8" />
      <line x1="151" y1="11" x2="151" y2="27" strokeWidth="2.8" />
    </svg>
  );
}

export function StreamifyHero() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setTimeout(() => {
      router.push(`/login?email=${encodeURIComponent(email)}`);
    }, 800);
  }

  return (
    <div className="farce-outer-wrapper">
      <div className="farce-card-frame">
        {/* Background Image Layer with Pixel Art Forest & Campfire */}
        <div className="farce-bg-layer" />
        <div className="farce-vignette-overlay" />

        {/* Top Header / Navigation Bar */}
        <header className="farce-header">
          {/* Logo: Streamify brand + mark */}
          <Link href="/" className="farce-brand">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "#22c55e",
                color: "#0f1712",
                fontWeight: 800,
                fontSize: "14px",
              }}
            >
              S
            </span>
            <span className="farce-logo-text">
              streamify<span style={{ color: "#22c55e" }}>.</span>
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "2px 7px",
                borderRadius: "9999px",
                background: "rgba(34, 197, 94, 0.15)",
                color: "#4ade80",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                marginLeft: "4px",
              }}
            >
              GATEWAY
            </span>
          </Link>

          {/* Navigation Items (Right Side) */}
          <div className="farce-nav-right">
            {/* Frosted Glass Pill Menu */}
            <nav className="farce-nav-pill">
              <a href="#architecture" className="farce-nav-link">
                Architecture
              </a>
              <a href="#security" className="farce-nav-link">
                Zero-Trust Model
              </a>
              <div className="farce-dropdown-container">
                <button
                  type="button"
                  className="farce-nav-link farce-dropdown-trigger"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  Features <ChevronDown size={14} className={dropdownOpen ? "rotate-180" : ""} />
                </button>
                {dropdownOpen && (
                  <div className="farce-dropdown-menu">
                    <a href="#architecture" onClick={() => setDropdownOpen(false)}>
                      Ephemeral Playback Leases
                    </a>
                    <a href="#architecture" onClick={() => setDropdownOpen(false)}>
                      Single-Stream Lock
                    </a>
                    <a href="#architecture" onClick={() => setDropdownOpen(false)}>
                      Expiring Embed Links
                    </a>
                    <a href="#architecture" onClick={() => setDropdownOpen(false)}>
                      Forensic Watermarking
                    </a>
                  </div>
                )}
              </div>
              <Link href="/courses" className="farce-nav-link">
                Courses
              </Link>
            </nav>

            {/* Top Right 'Sign In' button */}
            <Link href="/login" className="farce-top-cta">
              Sign In
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <main className="farce-hero-body">
          {/* Bottom Left Column: Headline + Email Pill */}
          <div className="farce-hero-left">
            <h1 className="farce-headline">
              Stream private video<br />
              with zero-trust access
            </h1>

            <form className="farce-email-pill" onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder={submitted ? "Redirecting to portal…" : "Enter your student email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitted}
              />
              <button type="submit" disabled={submitted}>
                {submitted ? (
                  <>
                    <Check size={14} /> Opening…
                  </>
                ) : (
                  <>
                    Enter Gateway <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Bottom Right Columns: Stats Card + Testimonial Card */}
          <div className="farce-hero-right">
            {/* Stats Glass Card */}
            <div className="farce-glass-card farce-stats-card">
              <SegmentedCounter />
              <p className="farce-card-desc">
                Video playback leases protected across courses without public URL leakage.
              </p>
            </div>

            {/* Testimonial Glass Card */}
            <div className="farce-glass-card farce-testimonial-card">
              <div className="farce-company-header">
                <span className="farce-company-icon">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <rect x="8" y="8" width="8" height="8" fill="#ffffff" />
                  </svg>
                </span>
                <span className="farce-company-name">Paradigm Institute</span>
              </div>

              <p className="farce-quote">
                “With Streamify, our private YouTube lessons are protected by expiring leases and forensic watermarks.”
              </p>

              <div className="farce-author-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/eric-avatar.png"
                  alt="Dr. Eric Smith"
                  className="farce-avatar-img"
                  width={34}
                  height={34}
                />
                <div className="farce-author-info">
                  <span className="farce-author-name">Dr. Eric Smith</span>
                  <span className="farce-author-role">Director of Learning Technology</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
