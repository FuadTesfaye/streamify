import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  ShieldCheck,
  Play,
  ArrowRight,
} from "lucide-react";
import { Brand } from "@/components/brand";
export default function Home() {
  return (
    <main className="landing">
      <header className="landing-header">
        <Brand />
        <nav>
          <Link href="/privacy">Privacy</Link>
          <Link className="button small" href="/login">
            Student sign in <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      <section className="landing-hero">
        <div>
          <span className="eyebrow">
            <span className="tiny-dot" /> A space for curious minds
          </span>
          <h1>
            A little focus.
            <br />A world of <em>possibility.</em>
          </h1>
          <p>
            Your courses, your pace, your next chapter. Welcome to a thoughtful
            space built around your learning.
          </p>
          <Link className="button" href="/courses">
            Enter your learning space <ArrowRight size={18} />
          </Link>
          <div className="hero-footnote">
            <ShieldCheck size={16} /> Free learning. Invitation-only access.
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-card">
            <span className="eyebrow">The learning collection</span>
            <div className="art-book">
              <BookOpen size={80} strokeWidth={1} />
            </div>
            <h2>
              Make room
              <br />
              for what’s next.
            </h2>
            <span className="art-play">
              <Play size={18} fill="currentColor" />
            </span>
          </div>
          <span className="floating-note">One lesson at a time ↗</span>
        </div>
      </section>
      <section className="landing-bottom">
        <span>LEARN WITH INTENTION</span>
        <p>A focused course library.</p>
        <p>Space to learn at your own pace.</p>
        <p>A connection to your institution.</p>
      </section>
      <footer className="public-footer">
        <span>© {new Date().getFullYear()} Streamify</span>
        <Link href="/privacy">Privacy & playback information</Link>
      </footer>
    </main>
  );
}
