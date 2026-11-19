# Changelog

## 0.4.4
### Fixed
- The page can be scrolled with the pointer over any card or list on Reports and Dashboard (the lists no longer capture the mouse wheel)
- Dashboard: Cash flow and Spending by day now sit together and have the same chart size, so there is no empty space inside the cards. By category and Category detail share the next row

### Operations
- No migration, no new dependency, no new environment variable

## 0.4.3
### Fixed
- The side menu scrolls (with no visible scrollbar) and keeps the profile, theme and **Sign out** at the bottom, so Sign out is never hidden behind the taskbar. On phones the More menu sits above the tab bar and scrolls too
- "Amount owed on the start date" is now **Total loan amount**
- Expenses page order: add an expense, Paid with, filters, then the records grid
- Searching or filtering expenses and reports no longer reloads the page: only the records (or report) area dims and updates, the rest stays still. The same filter form works without JavaScript
- Badges (Income, Expense, Paused, Recurring, category) now always sit on the same row as the name, in recurring, income and expenses. Long names are shortened with an ellipsis instead of pushing badges down
- After any action (add, delete, match, undo...) the page refreshes in place without blanking or jumping

### Changed
- **Uniform cards**: one card header (same height and spacing), one row height for every list and table, content centred, equal-height cards in each row
- **Reports**: By category and Category detail are the same size and show five rows, then scroll with an invisible scrollbar. Largest expenses and Paid with show five rows, then scroll. A new "All expenses in this report" grid lists every expense for the chosen month, year, range and categories, 10 per page with the same 10 / 20 / 50 pagination
- **Dashboard** now uses the same cards as Reports: By category, Category detail, Largest expenses and Paid with (all five rows then scroll), plus Savings goals and Budgets side by side

### Operations
- No migration, no new dependency, no new environment variable

## 0.4.2
### Added
- **Debts** page (in the navigation) for loans and credit cards. Add the amount owed on a start date, the yearly interest rate and the usual monthly payment, then log each payment
- For every payment the app shows how much **reduced the debt (principal)** and how much was **interest**, plus what is still owed. Interest is worked out daily from the rate, or you can enter the exact interest from your statement on any payment
- Per debt: progress bar, principal-versus-interest split, total paid, payoff date and interest still to come at your current payment, and a live "what if I pay extra each month?" calculator
- Summary of everything still owed, principal repaid and interest paid, and an avalanche (highest rate first) versus snowball (smallest balance first) payoff order
- Back-dated payments, edits and deletions are always correct: the balance is replayed from the payments instead of being stored

### Security
- New actions (create, update, delete debt; add, delete payment): session first, user id from the session only, Zod validation, the debt id from the form must belong to you, rate limited, caps (30 debts, 2,000 payments per debt)
- A payment larger than what is still owed, or dated before the debt started, is refused with a clear message
- /debts is protected by the middleware, private no-store headers and a server-side session check; every query is scoped by userId with explicit selects

### Operations
- New migration: `npx prisma migrate dev --name add_debts`. Run it on production with `prisma migrate deploy` BEFORE merging. No new dependencies or environment variables

## 0.4.1
### Added
- **Reports** page (in the navigation): choose a month, a year or a custom date range, and optionally one or more categories (including Uncategorised). Shows spent, income, balance, average per day, a month-by-month chart and table, a category donut with detail, spending by payment method, and the ten largest expenses
- **PDF download** of any report (monthly, yearly or custom, with or without the category filter). Generated on the server with pdf-lib, multi-page, with page numbers

### Fixed
- Goal suggestions: the car 20/4/10 and home deposit calculators now work live in the page, so nothing reloads and the suggestions panel stays open
- After creating a goal (including from a suggestion), the page scrolls to the new goal card and highlights it briefly
- Contribution rows in goal cards are compact like every other list row
- Budgets are no longer listed in Settings (the Budgets page replaces it)

### Security
- /reports and /reports/pdf are protected by the middleware, private no-store headers and a server-side session check; every query is scoped by userId and the user's own currency
- Report filters are shape-checked (month, year, dates, UUIDs); custom ranges are limited to about three years; category ids can only narrow the user's own rows
- PDF generation is rate limited (10 a minute per user); text is reduced to the characters the standard PDF fonts support, so user text can never break or inject into the document; the filename comes only from validated values
- New dependency: `pdf-lib` (pure JavaScript, no native code, no network access)

### Operations
- **Run `npm install`** to get pdf-lib (package.json and the lock file change). No database migration and no new environment variables

## 0.4.0
### Added
- **Budgets page** (in the navigation): one card per category with spent, limit, percentage, left or over by, number of expenses, daily average, largest expense, projected month-end spending, a safe amount per remaining day, and a status (on track / close to limit at 80% / over). Month picker, total across all budgets, inline limit change, a link to that category's expenses, and spending in categories that have no budget
- **Payment methods**: tag each expense as cash, credit card, debit card, UPI, bank transfer, wallet or other. Filter by method, see totals per method for the month, and tick expenses as "matched" against your bank or card statement (filter by matched / not matched yet). Both fields are included in the CSV export
- **Goal suggestions**: emergency fund (3 and 6 months, from your own average spending), the 20/4/10 car rule (down payment, loan, monthly payment, income needed), home deposit (20%), and vacation, education, gadget, wedding and debt-free templates. Each creates a normal goal you can edit

### Changed
- Budgets moved out of Settings (Settings links to the new page)

### Security
- New action `setReconciled`: session first, id and flag validated with Zod, update scoped by userId, rate limited
- Payment method is validated against a fixed enum on the server; suggestion inputs from the URL are parsed with strict regexes and capped
- /budgets is protected by the same middleware and cache headers as the other private pages

### Operations
- New migration: `npx prisma migrate dev --name add_payment_method_and_reconciled`. Run it on production with `prisma migrate deploy` BEFORE merging. No new dependencies or environment variables

## 0.3.4
### Added
- **Profile** module in Settings: display name, country and timezone (nothing sensitive; email and password are not editable there). The timezone decides what "today" and "this month" mean and when recurring items are added. "Use this device" fills it in
- **Pagination** on expenses, income, recurring, goals and the dashboard expense list: 10 rows per page with a 10 / 20 / 50 selector (goals: 4 / 8 / 12)
- **Sortable columns** in expenses (date, description, category, amount) with the direction shown in the header
- **Clear (x) button** inside the expense search box, plus a Reset button when filters are active
- **Category colours**: each category keeps one colour, used on dashboard charts and on the tag shown on every record
- **Charts**: smooth cash-flow area chart (income vs spent, 6 months), colour-coded category donut, spending-by-day bars with average line, savings-rate ring
- **Goal carousel** on the dashboard (one goal at a time, hidden arrows that appear on hover/focus, loops, swipe on phones)
- Goal cards are collapsible and their contribution list scrolls (up to 100 per goal)
- All settings modules are collapsible, with Expand all / Collapse all
- **Mobile**: 4-tab bottom bar with a More sheet, a floating + button that adds an expense or income, safe-area support, larger touch targets
- Other sessions are signed out automatically: every open screen checks the session every 30 seconds and when it regains focus

### Fixed
- Removing /dashboard from the address (going to the site root) showed the login page for signed-in users; they now go to the dashboard. Same for /login and /signup
- Stat cards on the dashboard were uneven in height
- The duplicated "Import income from a CSV file" links are now an "Import CSV" button
- "See all" and "Manage" use a modern soft button style

### Changed
- Error messages now state the cause (what is wrong with which field, which limit was reached, how long to wait after rate limiting) without exposing internals; unexpected failures show only a reference number

### Security
- Profile update: session first, user id from the session only, Zod validation, timezone checked against the runtime's IANA list, country against an allowlist, rate limited
- Session check endpoint returns only 204/401/503, never user data, and is not cached
- Sorting uses a whitelist of columns; page and page size are validated integers from a fixed set

### Operations
- New migration: `npx prisma migrate dev --name add_profile_and_category_color`. Run it against production with `prisma migrate deploy` BEFORE merging. No new dependencies or environment variables

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
