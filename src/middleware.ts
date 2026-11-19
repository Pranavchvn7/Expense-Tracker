import { NextResponse, type NextRequest } from "next/server";

/**
 * Per-request CSP with a nonce. No 'unsafe-inline' for scripts.
 * Also performs an optimistic auth redirect (cookie presence only);
 * real authorization is ALWAYS re-checked server-side in requireSession().
 */
export function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV !== "production";
  // Only force https upgrades when the site is actually served over https; on a local
  // http://localhost production build it would try to load assets over https and fail.
  const secureOrigin = process.env.BETTER_AUTH_URL?.startsWith("https://") ?? false;

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self'${isDev ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(secureOrigin ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const { pathname } = req.nextUrl;
  const protectedPrefixes = ["/dashboard", "/expenses", "/income", "/recurring", "/goals", "/budgets", "/reports", "/debts", "/import", "/settings"];
  if (protectedPrefixes.some((p) => pathname.startsWith(p))) {
    const hasCookie =
      req.cookies.has("__Secure-better-auth.session_token") ||
      req.cookies.has("better-auth.session_token");
    if (!hasCookie) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|sw.js|icons/|manifest.webmanifest).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
