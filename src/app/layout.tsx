import type { Metadata, Viewport } from "next";
import "./globals.css";
import { env } from "@/env";
import { getTheme } from "@/lib/preferences";

// The CSP uses a per-request nonce (src/middleware.ts). Next.js can only attach that
// nonce to its scripts when pages are rendered per request, so static prerendering
// must stay off, otherwise production blocks every script.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "A private, secure expense tracker.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1419" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getTheme();
  return (
    <html lang="en" data-theme={theme === "system" ? undefined : theme}>
      <head>
        {/* use-credentials: the manifest is requested with the sign-in cookie, so hosts that sit behind a login (e.g. Vercel preview protection) do not redirect it elsewhere. */}
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
      </head>
      <body>
        {env.APP_ENV === "staging" && (
          <div className="env-banner" role="note">
            STAGING: test data only, not the real app
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
