# Changelog

## 0.3.3 (includes 0.3.2)
### Added
- **Savings goals:** set a target (and optional date), add money by hand, see progress, the monthly amount needed to hit the date, and a summary on the dashboard. Edit, delete, and undo single contributions
- **CSV import** (expenses or income): choose the date format, preview what will be imported, then import. Skips rows that already exist so importing twice is safe, matches categories by name, reports bad rows by line number. Files exported from this app import as they are. Up to 1,000 rows / about 80 KB per file
- Goals in the navigation (mobile bar now has six tabs)

### Fixed
- Choosing "Uncategorised" made the recurring form (and the expense form) fail with "Something went wrong": the empty option was rejected as an invalid id. Empty now means "no category"
- Invalid input now says "Please check your input and try again" instead of "Something went wrong"

### Security
- Goals and contributions: session first, user id on every query, the goal id from the form must belong to you, Zod validation, rate limits, caps (50 goals, 5,000 contributions)
- Import: the file is parsed by a small RFC 4180 parser on the server (nothing is executed), every cell is stripped of control characters and length-capped, amounts and dates are strictly validated, and the commit step re-validates the whole file instead of trusting the preview. Rate limited (30 previews and 10 imports an hour), the same per-account caps apply, and the insert is one transaction (all or nothing)
- Text that this app's export protected with a leading apostrophe (spreadsheet formula guard) is restored on import; exports still protect it again

### Operations
- New migrations: `add_recurring_rules` (if not applied yet) and `add_savings_goals`. Run `npx prisma migrate dev --name add_savings_goals`. No new dependencies or environment variables

## 0.3.2
### Added
- Recurring expenses and income (weekly, monthly, yearly) on a new Recurring page: add, edit, pause/resume, delete, optional end date and category
- Due items are created automatically the next time you open the dashboard, Expenses or Income, including ones missed while you were away
- "Recurring" tag on generated entries; a Recurring item in the navigation

### Security
- Every rule query and mutation is session-first, scoped by the session user id, Zod validated and rate limited; categories are checked to belong to you; 50 rules per account
- Generation is idempotent: each rule is claimed with a conditional update inside the same database transaction as the inserts, and (rule, date) is unique, so two tabs or a retry can never create an entry twice
- A start date can be at most a year back or ahead, at most 120 entries are created per rule per visit, and the normal per-account entry caps still apply
- A generation failure is logged without data and never breaks the page

### Fixed
- Added a favicon (the browser console showed a 404 for /favicon.ico)

### Notes
- Dates use UTC, so the day changes at 05:30 in India
- Currency is fixed when the rule is created. Editing changes future entries only; entries already created are never rewritten

### Operations
- New migration: run `npx prisma migrate dev --name add_recurring_rules`. No new dependencies or environment variables

## 0.3.1
### Added
- Currency is now chosen once in Settings > Currency and applied to every new expense, income entry and budget. The currency pickers are gone from all forms
- Light / system / dark theme toggle (sidebar and top bar), remembered in a cookie and applied on the server, so there is no flash and no inline script
- Loading skeletons while pages load

### Changed
- Faster navigation: the session is looked up once per request instead of 5-6 times, dashboard queries run in parallel, and Vercel functions are pinned to `cle1` (Cleveland) next to the Neon database in AWS US East 2 (Ohio)
- Existing entries in other currencies are not converted. They keep their saved currency, are left out of dashboard totals and charts, and the dashboard says how many there are
- Editing an entry no longer changes its currency

### Security
- The currency is read from the database for the signed-in user; no form field, query string or cookie can set it. Updating it uses the session user id and is rate limited
- The theme cookie holds only light/dark and is allowlisted again on the server

### Operations
- New migration: run `npx prisma migrate dev --name add_user_currency`. No new dependencies or environment variables
- `vercel.json` now sets `regions: ["cle1"]`. If your Neon project is elsewhere, change it to the nearest region

## 0.3.0
### Added
- Complete visual redesign: design system in plain CSS, responsive app shell (sidebar / bottom tab bar), dark mode, new landing and sign-in pages, empty states, 404 and error pages
- Income tracking (add, edit, delete, per month) with its own page
- Dashboard: Income / Spent / Balance / Savings rate cards, category donut chart, six-month income-vs-spending bars, month switcher, currency chips, latest expenses
- Settings reorganised into sections with a jump bar

### Security
- New `Income` table: every query and mutation uses the session user id in `where`, explicit `select`, Zod validation, rate limits and a 20,000-row cap
- Charts are server-rendered SVG with CSS-class colours: no chart library, no client JavaScript, no inline styles (CSP unchanged)
- `?month=` and `?cur=` query values are validated and fall back to safe defaults
- `/income` is auth-protected in middleware and sent with `no-store`

### Operations
- New migration: run `npx prisma migrate dev --name add_income`. No new dependencies and no new environment variables

## 0.2.1
### Added
- Authenticator-app two-factor authentication (QR setup, backup codes, second sign-in step, turn off, new backup codes)
- Signed-in devices list with per-device and "all other devices" sign-out
- CSV export (this month, or everything up to the latest 20,000 rows) with spreadsheet formula-injection protection
- Staging environment support: `APP_ENV=staging` banner, `vercel.json` builds `main` and `staging`, `ENVIRONMENTS.md` (staging database, Vercel variables, daily workflow, branch protection)
- `scripts/disable-2fa.mjs` owner-only recovery

### Security
- 2FA code guessing rate limited; session references are opaque HMACs; exports are rate limited and capped
- Environment guards: on Vercel the build fails if a production deployment is not from `main` or has `APP_ENV=staging`, or if a preview deployment does not have `APP_ENV=staging` (prevents staging running on production variables)

### Operations
- New migration: `TwoFactor` table and `twoFactorEnabled` on `user`
- New optional env var: `APP_ENV`
- New dependency: `qrcode` (and `@types/qrcode`); run `npm install` and commit `package-lock.json`
- Local `.env` should now point at the staging database

### Fixed
- 2FA sign-in failed with `SCHEMA_MISMATCH`: Better Auth 1.7 needs `failedVerificationCount` and `lockedUntil` on the `twoFactor` table (new migration `add_two_factor_lockout`)
- `prisma` (CLI) and `@prisma/client` had drifted apart (6.12.0 vs 6.19.3) after `npm audit fix`; both are now pinned to 6.19.3
- Environment errors now say what is wrong with each variable (missing, not a URL, wrong scheme) without ever printing a value; `BETTER_AUTH_URL` tolerates surrounding spaces and trailing slashes

## 0.2.0
### Added
- Edit expenses (previously only add and delete)
- Search by text, filter by category, month filter, pagination (25 per page), total for the filtered view
- Monthly budgets per category and currency, with progress on the dashboard
- Email verification (required before first sign-in) and password reset (15-minute single-use links)
- Confirmation prompts on destructive actions

### Security
- Sessions are revoked on password reset
- Auth emails are sent after the response, so timing does not reveal whether an account exists
- Tampered query strings fall back to safe defaults instead of reaching the database
- Rate limits on verification and reset endpoints

### Changed
- Email is now optional. With `RESEND_API_KEY` and `EMAIL_FROM` empty the app runs in no-email mode: instant sign-up, no email verification, reset-by-email disabled on the server
- Added `SIGNUPS_ENABLED` to close registration, Settings > Change password, and an owner-only `reset-password` script for forgotten passwords

### Fixed
- CI secret scan (gitleaks) failed with 403 on pull requests: the workflow now grants `pull-requests: read`; two audit allowlist entries that no longer apply were removed
- Vercel branch/PR deployments failed because the Preview environment has no variables: `vercel.json` now skips every branch except `main`
- CI audit step failed on transitive advisories: it now uses `audit-ci` with a short, documented allowlist (`audit-ci.jsonc`); `npm audit fix` updates the rest
- `SIGNUPS_ENABLED` accepts any case ("True"), and the mail-settings error says which variable is missing
- CI lint step failed on an interactive prompt: added `eslint.config.mjs`, `npm run lint` now calls ESLint directly (`next lint` is deprecated), and lint no longer runs during `next build`
- Empty `RESEND_API_KEY=""` / `EMAIL_FROM=""` lines (as in the first v0.2 `.env.example`) failed environment validation; blank values are now treated as unset
- `npm run build && npm start` now works locally: deployment guards (https URL, database TLS, mail settings) are skipped only for localhost origins and never on Vercel
- Cookies are Secure exactly when the site is served over https; `upgrade-insecure-requests` is only sent on https origins

### Operations
- New optional env vars: `RESEND_API_KEY`, `EMAIL_FROM` (set both or neither), `SIGNUPS_ENABLED`
- New migration: `Budget` table

## 0.1.0
- Initial release: accounts, expenses, categories, dashboard, share links, account deletion
