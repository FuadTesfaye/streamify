import Link from "next/link";
import { Brand } from "@/components/brand";
export default function Privacy() {
  return (
    <main className="privacy-page">
      <Brand />
      <span className="eyebrow">Your learning space</span>
      <h1>Privacy & playback</h1>
      <p>
        Streamify is a free, invitation-only learning application for adults.
        Your institution controls accounts, course enrollment, and application
        access.
      </p>
      <h2>Information stored</h2>
      <p>
        We store your name, email address, authentication records, course
        enrollments, registered-browser labels, session records, and security
        events. Passwords are hashed. Browser verification codes and
        registration credentials are stored as protected hashes. Authenticator
        secrets and recovery codes are encrypted by the authentication service.
      </p>
      <h2>Browser registration and sessions</h2>
      <p>
        We use essential cookies to keep you signed in and recognize a verified
        browser. Browser registrations expire after 30 days. Up to two browsers
        and one simultaneous playback are allowed per student. Browser
        credentials are not proof of a physical device; we do not fingerprint
        your browser.
      </p>
      <h2>YouTube playback</h2>
      <p>
        When you start a lesson, the official embedded player connects to
        YouTube. YouTube receives information needed to provide playback and may
        use cookies or show advertisements. Its standard controls, links, and
        attribution remain available. Read{" "}
        <a href="https://policies.google.com/privacy" rel="noreferrer">
          Google’s Privacy Policy
        </a>{" "}
        and{" "}
        <a href="https://www.youtube.com/t/terms" rel="noreferrer">
          YouTube’s Terms of Service
        </a>
        .
      </p>
      <p>
        Our authorization protects this application. The video ID becomes
        visible during authorized playback. Anyone who extracts an unlisted link
        may watch or share it outside Streamify. Ending a Streamify session does
        not revoke direct YouTube playback, and screen recording cannot reliably
        be prevented.
      </p>
      <h2>Activity and retention</h2>
      <p>
        Administrators can review access events and revoke accounts, browsers,
        and sessions. Security events are retained for 90 days and removed
        through scheduled maintenance. We do not record passwords, verification
        codes, authentication tokens, or video IDs in these events. Retention
        and deletion of account and enrollment records are managed by your
        institution.
      </p>
      <h2>Questions and account requests</h2>
      <p>
        Contact the institution that invited you for account deletion,
        corrections, or privacy questions. Before production launch, the
        institution must provide its identity, contact details, and any
        additional privacy terms applicable to its operation.
      </p>
      <Link className="button secondary" href="/courses">
        Return to your workspace →
      </Link>
    </main>
  );
}
