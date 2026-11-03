import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Streamify — A space to learn",
    template: "%s · Streamify",
  },
  description: "Your institution’s invitation-only learning space.",
  robots: { index: false, follow: false },
  referrer: "strict-origin-when-cross-origin",
};
export const dynamic = "force-dynamic";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
