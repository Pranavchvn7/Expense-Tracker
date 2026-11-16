# Security

## Principles
- **Zero trust on the server.** Every mutation and private read calls `requireSession()` first. `userId` is taken from the validated session, never from the client.
- **Tenant isolation (anti-BOLA).** Every read, update and delete includes `userId` in `where`. Foreign keys supplied by the client (e.g. `categoryId`) are verified to belong to the caller.
- **Validate then query.** Every payload passes through Zod before any DB access. Prisma safe APIs only; the single raw query (rate limiter) uses a parameterized tagged template.
- **Least data out.** Explicit `select` everywhere. No hashes, session tokens or internal flags reach the UI.
- **Uninformative errors.** Clients get a generic message plus a correlation id; details stay in server logs.

- **Nonce CSP needs dynamic rendering.** The root layout sets `dynamic = "force-dynamic"`. Do not remove it: statically prerendered pages have no nonce and the browser would block all scripts.
- **Credentials never travel in URLs.** Auth forms use `method="post"` so a failed script load cannot cause a GET submit.

- **No inline `style` attributes.** The production CSP blocks them. Use CSS classes or elements like `<progress>` instead.
- **Email is optional and gated on the server.** `isEmailEnabled` (both `RESEND_API_KEY` and `EMAIL_FROM` set) controls verification and reset. Without it the reset endpoint is disabled in Better Auth itself and the pages return 404; it is not just hidden in the UI.
- **Email flows are enumeration-resistant.** Forgot-password and resend-verification always show the same message; mail is sent after the response; sign-up errors are generic.
- **Reset links** expire in 15 minutes, are single use, revoke other sessions, and the reset page sends no Referer.
- **No-email mode trade-off.** Without verification, anyone could register with any address. Mitigations: set `SIGNUPS_ENABLED="false"` once your household has registered (enforced by the sign-up endpoint, not just the UI), sign-up is rate limited per IP, and per-user data caps apply.
- **Owner password reset** (`scripts/reset-password.mjs`) runs only on the owner's machine with database credentials; it is not exposed over the web.
- **Query strings are untrusted.** `parseListQuery` validates each field and falls back to defaults.

## Checklist mapping
| Prompt | Where it is handled |
|---|---|
| 1. Secret leak prevention | Secrets only via env vars (`src/env.ts` fails fast); `.env` git-ignored; `.env.example` has placeholders; no `NEXT_PUBLIC_` secrets; no secrets logged |
| 2. Personal data flow | No third-party SDKs; no PII logging; scrypt hashing via Better Auth; httpOnly/secure/sameSite cookies; no PII in localStorage; field-level `select`; account deletion with cascades |
| 3. Pre-deploy audit | Env validation; no debug code or test endpoints; generic errors; security headers + nonce CSP (`middleware.ts`, `next.config.ts`); rate limits on auth and mutations; same-origin only (no CORS headers); TLS enforced for DB in production |
| 4. Deep audit | Auth on every action; no IDOR; server-side money parsing (no client totals); XSS-safe rendering (no `dangerouslySetInnerHTML`); no payments or uploads in v0.1 |
| 5. Attacker's view | UUIDv4 ids; ownership checks; per-user caps (expenses, categories, shares); rate limits on signup, actions, shares; no admin roles; no exposed docs or debug routes |

## v0.2.1 additions
- **2FA (authenticator app).** Better Auth `twoFactor` plugin; enabling needs the password, and the first code must be confirmed before 2FA turns on. Backup codes are shown once, only after that confirmation. Code guessing is limited to 5 tries a minute per IP. The secret and backup codes are stored encrypted by the plugin and no app query selects them. Lost-device recovery is owner-only (`scripts/disable-2fa.mjs`), not a web endpoint.
- **Signed-in devices.** The page lists only the caller's own sessions and shows an opaque HMAC reference, never the session id or token. Revoking looks the reference up among the caller's own sessions, so another user's session can never be targeted; the current session cannot be revoked from the list.
- **CSV export.** Authenticated, `userId` in the filter, 10 exports an hour, 20,000-row cap, `Cache-Control: private, no-store`, filename built only from validated input. Text cells that start with `=`, `+`, `-`, `@`, tab or CR get a leading apostrophe so spreadsheets cannot run them as formulas (CSV injection).
- **Environment separation.** Production, staging and local use different Neon projects and different secrets; staging shows a banner and sits behind Vercel Authentication. See ENVIRONMENTS.md.
- **Environment guards.** `src/env.ts` refuses to start a production deployment that is not built from `main` or carries `APP_ENV=staging`, and a preview deployment without `APP_ENV=staging`. This stops staging code from running on production variables (for example by choosing Production in Vercel's Redeploy dialog).
- **Branch protection.** `main` accepts changes only through pull requests with passing CI; force pushes and deletion are blocked.

## Accepted dependency advisories
CI runs `audit-ci` and fails on any high or critical advisory that is not listed in `audit-ci.jsonc`. Three are accepted for now, each with its reason written next to it in that file:
- **deepmerge-ts (inside the `prisma` CLI, dev only):** never runs in the deployed app or on user input. `prisma` and `@prisma/client` are pinned to the same version (6.19.3) because a mismatched pair is a bigger risk than this advisory. Fix = Prisma 7 (breaking).
- **postcss (inside next):** build-time only, runs on this repo's own CSS, never on user input. Fix = Next 16 (breaking).
- **zod:** the flaw needs a client-supplied array/set/map; no schema here accepts one, and request bodies are capped at 100 kb. Fix = zod 4 (breaking).

Both upgrades are planned as their own branches with the full build and, later, the e2e suite to catch breakage. Remove the allowlist entry when each upgrade lands.

## Known limits / to do before real launch
- Email verification and password reset by email need a mail provider with a verified domain; until then the app runs in no-email mode (see above).
- Better Auth rate limiting keys on `x-forwarded-for`; Vercel sets this, but verify in your deployment.
- Add dependency scanning (`npm audit`, Dependabot) and secret scanning (Gitleaks) in CI.
- Get a human security review before storing data at scale.
