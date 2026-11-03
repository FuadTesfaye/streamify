"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <span className="eyebrow">A small interruption</span>
      <h1>We couldn’t open this page.</h1>
      <p>
        Your access may have changed, or a required service may be unavailable.
      </p>
      <div className="button-row">
        <button onClick={reset} className="button">
          Try again
        </button>
        <a className="button secondary" href="/account">
          Account security
        </a>
        <a href="/login">Sign in</a>
      </div>
    </main>
  );
}
