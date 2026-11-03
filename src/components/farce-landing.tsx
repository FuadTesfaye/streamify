"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Check } from "lucide-react";

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

export function FarceLanding() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3500);
  }

  return (
    <div className="farce-outer-wrapper">
      <div className="farce-card-frame">
        {/* Background Image Layer */}
        <div className="farce-bg-layer" />
        <div className="farce-vignette-overlay" />

        {/* Top Header / Navigation Bar */}
        <header className="farce-header">
          {/* Logo: Green leaf + farce */}
          <Link href="/" className="farce-brand">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 3C21 3 14 3.2 9 8.2C5 12.2 4.2 17.5 4.2 19.8C4.2 20.3 4.7 20.8 5.2 20.8C7.5 20.8 12.8 20 16.8 16C21.8 11 21 3 21 3Z"
                fill="#22c55e"
              />
              <path
                d="M9.5 14.5L15 9"
                stroke="#0e1511"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
            <span className="farce-logo-text">farce</span>
          </Link>

          {/* Navigation Items (Right Side) */}
          <div className="farce-nav-right">
            {/* Frosted Glass Pill Menu */}
            <nav className="farce-nav-pill">
              <Link href="/courses" className="farce-nav-link">
                Features
              </Link>
              <Link href="/courses" className="farce-nav-link">
                Customers
              </Link>
              <div className="farce-dropdown-container">
                <button
                  type="button"
                  className="farce-nav-link farce-dropdown-trigger"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  Use Cases <ChevronDown size={14} className={dropdownOpen ? "rotate-180" : ""} />
                </button>
                {dropdownOpen && (
                  <div className="farce-dropdown-menu">
                    <Link href="/courses" onClick={() => setDropdownOpen(false)}>
                      Automated Video Streaming
                    </Link>
                    <Link href="/courses" onClick={() => setDropdownOpen(false)}>
                      Zero-Trust Access Control
                    </Link>
                    <Link href="/courses" onClick={() => setDropdownOpen(false)}>
                      Institutional Training
                    </Link>
                  </div>
                )}
              </div>
              <Link href="/courses" className="farce-nav-link">
                Pricing
              </Link>
            </nav>

            {/* Top Right 'Try for free' button */}
            <Link href="/login" className="farce-top-cta">
              Try for free
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <main className="farce-hero-body">
          {/* Bottom Left Column: Headline + Email Pill */}
          <div className="farce-hero-left">
            <h1 className="farce-headline">
              Build AI agents that<br />
              work while you sleep
            </h1>

            <form className="farce-email-pill" onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder={submitted ? "Thanks for signing up!" : "Enter your email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitted}
              />
              <button type="submit" disabled={submitted}>
                {submitted ? (
                  <>
                    <Check size={14} /> Joined
                  </>
                ) : (
                  "Try for free"
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
                Users use Farce to automate repetitive admin tasks.
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
                <span className="farce-company-name">Paradigm</span>
              </div>

              <p className="farce-quote">
                “With Farce we went from juggling endless repetitive tasks to having an AI team that does it all.”
              </p>

              <div className="farce-author-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/eric-avatar.png"
                  alt="Eric Smith"
                  className="farce-avatar-img"
                  width={34}
                  height={34}
                />
                <div className="farce-author-info">
                  <span className="farce-author-name">Eric Smith</span>
                  <span className="farce-author-role">VP of Engineering</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
