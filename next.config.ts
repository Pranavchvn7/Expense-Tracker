import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Linting is CI's job (npm run lint). A lint rule must never be able to block a deployment.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: {
      // Hard cap on action payload size (defense against oversized bodies).
      bodySizeLimit: "100kb",
    },
  },
  async headers() {
    // CSP is set per-request with a nonce in src/middleware.ts.
    // Static headers below apply to every response.
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      // Private, per-user pages must never be cached by shared caches.
      ...["dashboard", "expenses", "income", "recurring", "goals", "budgets", "reports", "debts", "import", "settings"].map((p) => ({
        source: `/${p}/:path*`,
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      })),
      {
        // Public, aggregate-only share pages: edge cache with stale-while-revalidate.
        source: "/share/:id",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default config;
