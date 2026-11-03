import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-page">
      <span className="eyebrow">404 / Page not found</span>
      <h1>A different path awaits.</h1>
      <p>This page is unavailable or doesn’t exist.</p>
      <Link className="button" href="/courses">
        Back to your courses
      </Link>
    </main>
  );
}
