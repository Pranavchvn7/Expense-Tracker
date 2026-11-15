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

## Known limits / to do before real launch
- Email verification and password reset by email need a mail provider with a verified domain; until then the app runs in no-email mode (see above).
- Better Auth rate limiting keys on `x-forwarded-for`; Vercel sets this, but verify in your deployment.
- Add dependency scanning (`npm audit`, Dependabot) and secret scanning (Gitleaks) in CI.
- Get a human security review before storing data at scale.
