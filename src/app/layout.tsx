import type { Metadata } from "next";
import "./globals.css";

// The CSP uses a per-request nonce (src/middleware.ts). Next.js can only attach that
// nonce to its scripts when pages are rendered per request, so static prerendering
// must stay off, otherwise production blocks every script.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "A private, secure expense tracker.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
