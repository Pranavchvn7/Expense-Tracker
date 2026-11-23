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

## v0.3.0 additions
- **Income** follows the same rules as expenses: `requireSession()` first, `userId` in every `where`, Zod before the database, rate limits, per-user cap.
- **Charts** are plain SVG rendered on the server from numbers the server computed; labels are React-escaped text. Colours come from CSS classes so the strict `style-src` nonce policy still holds.
- **Dashboard query strings** (`month`, `cur`) are validated; a tampered value falls back to the current month / the first currency you use.

## v0.3.1 additions
- **Request-scoped session cache.** `getSession()` uses React `cache()`, so it is shared only inside one request. It does not keep sessions between requests, so revoking a device still takes effect immediately.
- **Currency preference** lives on the user row, is read server-side and is never accepted from the client on entries.

## v0.3.2 additions
- **Recurring rules** follow the standard rules (session, `userId` in `where`, Zod, rate limits, caps).
- **No double generation.** Occurrences are created inside a transaction that first claims the rule with `updateMany` on the `nextDue` it read; a concurrent request matches nothing. `(recurringRuleId, date)` is unique in the database as a backstop.
- **Bounded work.** Start dates are limited to ±1 year, at most 120 entries per rule per visit, 50 rules per user, and the existing per-account entry caps apply to generated rows.
- **On-open generation** needs no cron endpoint, so there is no extra public URL or shared secret to protect.

## v0.3.3 additions
- **Savings goals** follow the standard rules. A contribution's goal id comes from the client, so it is checked to belong to the caller before anything is written.
- **CSV import is untrusted input.** Parsed on the server by a small pure parser; cells are cleaned and capped; amounts and dates are strictly validated; the 80 kb request cap bounds file size; row, rate and account caps bound the work; the commit step re-runs the full validation and inserts in one transaction. Nothing from the file is ever evaluated, and display is React-escaped.
- **Formula injection** is handled on the way out (export prefixes risky cells) and the matching apostrophe is removed on the way in so round trips are lossless.

## v0.3.4 additions
- Profile action: session first, id from the session, Zod, country allowlist, IANA timezone validation, rate limit; no sensitive fields
- /api/session-check: GET only, no body, 204/401/503, no-store; only a definite 401 signs a screen out
- Error messages describe the cause (field, limit, wait time) but never echo submitted values, SQL, stack traces or schema; unexpected errors show a reference id only
- Sorting and paging: column whitelist, validated integers, fixed page-size set

## v0.4.0 additions
- Reconcile toggle and payment method are validated server-side (enum, boolean flag) and always scoped by userId
- Budget page queries use the session user and the user's own currency only; per-category totals never include other users' rows
- Goal suggestion inputs (price, rate) come from the query string: regex-validated, length-capped, only used for display and for a prefilled form that is re-validated by Zod on submit

## v0.4.1 additions
- Reports: all filters validated server-side, userId and currency on every query, bounded date range, bounded category list
- PDF route: session first, rate limited, Latin-1 sanitising of every string, validated filename, no-store, nosniff
- pdf-lib: pure JS, runs in the function, makes no network calls

## v0.4.2 additions
- Debt and payment actions: session first, ownership of the debt id checked (BOLA), Zod, rate limits, per-user caps
- Balances are derived (replayed from payments) rather than stored, so a tampered or stale value cannot exist
- Rates are parsed with a strict regex into integer basis points; money stays in integer minor units

## v0.5.0 additions
- **SSRF defence**: a push subscription address comes from the browser, so it is only stored if it is https on an allowlisted push-service host (FCM, Mozilla, Apple, Windows); IPs, ports and credentials are rejected (`push-validate.ts`).
- **Cron endpoint**: `/api/cron/reminders` needs `Authorization: Bearer CRON_SECRET` (timing-safe); same 401 for missing/wrong/unconfigured.
- **Notifications carry no amounts**; push errors log only a status code (the endpoint address is a capability and is never logged).
- **Data on the device**: the service worker keeps copies of signed-in pages (HTML with that page's nonce and CSP) and a queue of unsent entries. Only app pages are cached (never API, sign-in, CSV/PDF). Everything is deleted on sign-out, on forced session end, on user change, and via Settings → Clear offline data. Anyone with access to an unlocked device profile can read cached pages, the same as an open browser tab.
- **CSP**: added `worker-src 'self'` and `manifest-src 'self'` (needed because `strict-dynamic` ignores `'self'` for workers).
- **Idempotent sync**: unique (userId, clientRef) so a replayed offline entry is stored once; the server re-validates every queued entry.

## v0.6.0 additions
- **Client data is personal data** (names, phones, emails, addresses, private notes). Every read and write includes `userId`; explicit `select`s; values are never logged; deleting the account cascades to clients.
- Inputs: Zod with control-character stripping, length caps, phone normalisation (digits and optional +), email validation; 5,000 clients per user; per-user rate limits on create/update/archive/delete.
- Access: `/clients` and client detail pages answer "not found" for another user's id and for Salaried-only accounts. Phone and email links are built only from validated values.
- Planned: when jobs arrive, a client with jobs cannot be deleted (archive instead) so payment history is never orphaned.

## Accepted dependency advisories
CI runs `audit-ci` and fails on any high or critical advisory that is not listed in `audit-ci.jsonc`. Several are accepted for now (picomatch, postcss, zod, deepmerge-ts, effect), each with its reason written next to it in that file:
- **deepmerge-ts (inside the `prisma` CLI, dev only):** never runs in the deployed app or on user input. `prisma` and `@prisma/client` are pinned to the same version (6.19.3) because a mismatched pair is a bigger risk than this advisory. Fix = Prisma 7 (breaking).
- **postcss (inside next):** build-time only, runs on this repo's own CSS, never on user input. Fix = Next 16 (breaking).
- **picomatch (dev tooling only):** glob matching inside eslint/typescript-eslint at lint time; never in the deployed app. Remove when the tooling ships a patched version.
- **effect (inside `@prisma/config`, dev/build only):** ReDoS in a schema feature that only matters when untrusted input is decoded; Prisma only loads this repo's own config with it. Fix arrives with a Prisma release.
- **zod:** the flaw needs a client-supplied array/set/map; no schema here accepts one, and request bodies are capped at 100 kb. Fix = zod 4 (breaking).

Both upgrades are planned as their own branches with the full build and, later, the e2e suite to catch breakage. Remove the allowlist entry when each upgrade lands.

## Known limits / to do before real launch
- Email verification and password reset by email need a mail provider with a verified domain; until then the app runs in no-email mode (see above).
- Better Auth rate limiting keys on `x-forwarded-for`; Vercel sets this, but verify in your deployment.
- Add dependency scanning (`npm audit`, Dependabot) and secret scanning (Gitleaks) in CI.
- Get a human security review before storing data at scale.
