# Security

## Principles
- **Zero trust on the server.** Every mutation and private read calls `requireSession()` first. `userId` is taken from the validated session, never from the client.
- **Tenant isolation (anti-BOLA).** Every read, update and delete includes `userId` in `where`. Foreign keys supplied by the client (e.g. `categoryId`) are verified to belong to the caller.
- **Validate then query.** Every payload passes through Zod before any DB access. Prisma safe APIs only; the single raw query (rate limiter) uses a parameterized tagged template.
- **Least data out.** Explicit `select` everywhere. No hashes, session tokens or internal flags reach the UI.
- **Uninformative errors.** Clients get a generic message plus a correlation id; details stay in server logs.

- **Nonce CSP needs dynamic rendering.** The root layout sets `dynamic = "force-dynamic"`. Do not remove it: statically prerendered pages have no nonce and the browser would block all scripts.
- **Credentials never travel in URLs.** Auth forms use `method="post"` so a failed script load cannot cause a GET submit.

## Checklist mapping
| Prompt | Where it is handled |
|---|---|
| 1. Secret leak prevention | Secrets only via env vars (`src/env.ts` fails fast); `.env` git-ignored; `.env.example` has placeholders; no `NEXT_PUBLIC_` secrets; no secrets logged |
| 2. Personal data flow | No third-party SDKs; no PII logging; scrypt hashing via Better Auth; httpOnly/secure/sameSite cookies; no PII in localStorage; field-level `select`; account deletion with cascades |
| 3. Pre-deploy audit | Env validation; no debug code or test endpoints; generic errors; security headers + nonce CSP (`middleware.ts`, `next.config.ts`); rate limits on auth and mutations; same-origin only (no CORS headers); TLS enforced for DB in production |
| 4. Deep audit | Auth on every action; no IDOR; server-side money parsing (no client totals); XSS-safe rendering (no `dangerouslySetInnerHTML`); no payments or uploads in v0.1 |
| 5. Attacker's view | UUIDv4 ids; ownership checks; per-user caps (expenses, categories, shares); rate limits on signup, actions, shares; no admin roles; no exposed docs or debug routes |

## Known limits / to do before real launch
- Email verification and password reset need an email provider (not enabled in v0.1).
- Better Auth rate limiting keys on `x-forwarded-for`; Vercel sets this, but verify in your deployment.
- Add dependency scanning (`npm audit`, Dependabot) and secret scanning (Gitleaks) in CI.
- Get a human security review before storing data at scale.
