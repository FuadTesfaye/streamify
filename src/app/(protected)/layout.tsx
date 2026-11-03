import Link from "next/link";
import {
  BookOpen,
  ShieldCheck,
  Settings2,
  ArrowUpRight,
  Leaf,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { SignOut } from "@/components/sign-out";
import { pageViewer } from "@/lib/page-auth";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await pageViewer({ allowMfaSetup: true });
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Brand />
        <span className="nav-caption">YOUR WORKSPACE</span>
        <nav>
          <Link href="/courses">
            <BookOpen size={18} /> My courses{" "}
            <ArrowUpRight size={14} className="nav-arrow" />
          </Link>
          <Link href="/account">
            <ShieldCheck size={18} /> Account security
          </Link>
          {user.role === "admin" && (
            <Link href="/admin">
              <Settings2 size={18} /> Administration
            </Link>
          )}
        </nav>
        <div className="sidebar-note">
          <Leaf size={24} strokeWidth={1.4} />
          <h3>A little every day.</h3>
          <p>Small steps make room for meaningful progress.</p>
          <span className="note-line" />
        </div>
        <div className="sidebar-user">
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user.name}</strong>
            <small>
              {user.role === "admin" ? "Administrator" : "Student workspace"}
            </small>
          </div>
        </div>
        <SignOut />
      </aside>
      <div className="app-body">
        <header className="app-header">
          <span className="header-location">
            Your learning space <span>/</span> Streamify
          </span>
          <span className="header-private">
            <span className="tiny-dot" /> Invitation only
          </span>
        </header>
        <main className="workspace">{children}</main>
        <footer className="app-footer">
          <span>Built for a little more focus.</span>
          <Link href="/privacy">Privacy & playback information ↗</Link>
        </footer>
      </div>
    </div>
  );
}
