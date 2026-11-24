# Changelog

## 0.8.2
### Changed
- Every grid record (Expenses, Income, Jobs, Clients, Budgets, Debts, Recurring, Goals, Job page): Match / Edit / Copy / Delete are one row of equal buttons (same width and height), right aligned and centred on the row; on phones they are four equal buttons across the card
- Pastel accents back as small icon tiles on the Overview cards (lime income, peach spending, lavender balance, sky savings)
- Overview Balance card is the green hero card from the reference
- No database or behaviour change

## 0.8.1
### Fixed (from staging screenshots)
- Expense rows: Match / Edit / Copy / Delete sit in one tidy 2x2 block (4 across on phones), no uneven wrapping
- Description cell: name wraps to two lines, badges and the Job link wrap below instead of squeezing the name; dates no longer break
- Month switcher arrows are no longer turned into pills
- Freelance block on the Overview: even spacing between the title, the KPI row and Top clients
- Sidebar scrollbar hidden (the menu still scrolls)
- Calendar today / selected / status colours match the new look; loading skeletons match card shape
- No database or behaviour change

## 0.8.0
### Changed (finance-SaaS look, replaces the 0.7.2 pastel colours)
- White frame, light grey work area, white cards with a hairline border, one green accent, black active menu item, status tags with a dot
- Sidebar: labelled groups (Main menu, Manage), its own scroll area, footer (theme and Sign out) always visible, fits all pages at 1280x720 without scrolling
- KPI rows never leave a single card alone on a row (5 cards: one row on wide screens, 3+2 on medium, full-width last card on phones)
- Expenses: compact Paid with cards, filter bar on one baseline, long descriptions shorten with an ellipsis, Actions column aligned right, 40px controls
- Same rhythm (20px desktop, 16px mobile) between all blocks; dark theme tokens updated to match
- No database or behaviour change

## 0.7.2
### Changed (Elevate look)
- New look: soft grey frame on a pale blue page, white cards, pastel stat cards (lime, lavender, peach, sky), black pill buttons, Manrope font, rounded sidebar with a lime active item, top bar with search and user pill (desktop)
- Links now look like buttons everywhere
- **Reports**: "Period report", "Client report" and "Job report" buttons; the last two open a dropdown to pick a client or job, then show that report on the page with a PDF button
- Soft rise and hover-lift animations on desktop cards (off with reduced motion)
- Fewer explanatory lines on the job page
- No database change

## 0.7.0
### Added (freelance mode, part 7: dashboard and reports)
- **Freelance summary** on the Overview for the chosen month: money received from clients, job costs, profit, jobs done / booked, clients handled, **still owed to you** (with a link to Payments due), top clients and services
- **Freelance vs Both is now real**: *Freelance* opens the Overview with the freelance summary and upcoming jobs first, a client / job / payment checklist, and income labelled "Money in". *Both* keeps the usual income / spending / savings Overview first, with the freelance summary right below it. *Salaried* is unchanged
- **Reports** gain a Freelance section (same figures for the report period) and a Freelance block in the report PDF
- **Client report** (`/reports/client/<id>`): every job with agreed, received, costs and profit; totals; payments and costs lists; **PDF download**
- **Job report** (`/reports/job/<id>`): job details, payments, costs, balance and profit; **PDF download**
- "Client report" and "Job report" buttons on the client and job pages; top clients on the Overview and Reports link to their client report
- **Reports page picker**: a "Client and job reports" section on the Reports page lists your clients and your 15 latest jobs, each linking straight to its report
- Settings → Work type explains the three modes

### Security
- All freelance report queries are scoped by `userId` with explicit `select`s and bounded row counts; report ids are validated UUIDs and another user's id returns "not found"
- PDFs are built on the server with the existing no-network PDF library, share the 10-a-minute PDF rate limit, use only Latin-1 text, and carry no phone, email, address or private notes (client name and job details only). Filenames contain only the date

### Operations
- **No migration**, no new dependency or environment variable

## 0.6.5
### Added (freelance mode, part 6: reminders and payments due)
- **Job reminders**: the daily reminder run (about 09:00 India time) now also sends one push per person listing how many **booked** jobs they have tomorrow, in their own timezone. Tapping it opens that day in the Calendar
- **Settings → Notifications**: new "Job reminders" choice (On by default), shown for Freelance and Both accounts
- **Payments due** list (Jobs page card and `/jobs/due`): completed jobs with an agreed price that are not fully paid, oldest first, with days since the event, amount paid, balance and a total owed
- The two reminder types run independently, so a failure in one does not stop the other

### Security
- Reminder text never contains client names, places, times or amounts. One reminder per person per day (`NotificationLog` key `jobs:<date>`); the run is bounded (one query, 5,000 jobs) and only reads jobs of users who opted in and have a push device
- The payments-due query is scoped by `userId` with explicit `select`s and reads at most 5,000 completed jobs

### Operations
- **Migration**: `add_job_reminders` (`User.notifyJobs` boolean, default true). Apply to production with `migrate deploy` (both `DATABASE_URL` and `DIRECT_URL`) before merging
- No new dependency or environment variable; the existing cron schedule and `CRON_SECRET` are reused. Push must already be set up (VAPID keys) for reminders to be sent

## 0.6.4
### Added (freelance mode, part 5: calendar)
- **Calendar** page (Freelance and Both): a month grid (Monday first) showing each day's jobs, coloured by status, with month navigation and a Today button. Tap a day to see its **agenda**: time, job, client, place, status
- **Double-booking warning**: two jobs overlap when their times overlap (a job with no end time is assumed to last 2 hours); a job with no time on the same date as another is flagged softly ("Same day"). Cancelled jobs never clash. Warnings appear on the job page, in the day agenda and as a red day in the grid. Saving is never blocked
- **Upcoming jobs** card on the Dashboard (next 5 pending jobs, with a Clash tag)
- Phone layout: the grid shows a job count per day instead of titles

### Security
- Calendar and conflict queries are scoped by `userId` with explicit `select`; month and day come from validated query strings only; no new action or write path

### Operations
- **No migration**, no new dependency or environment variable. `/calendar` was added to the protected routes, the security-header paths and the offline page list

## 0.6.3
### Added (freelance mode, part 4: job costs and profit)
- **Costs and profit** section on each job: add travel, an assistant/helper payment, products or other costs (amount, date, type, "paid to", what for). Shows Costs, Profit so far (received minus costs) and Profit when paid in full
- Costs are stored as normal **Expenses**, so the dashboard, budgets, reports and CSV include them. The Expenses page labels each one with its type, job and client
- **Filter by job or client**: "See them in Expenses / Income" links on the job and client pages show only that job's or client's entries across all months
- Client page now also shows total **Costs** and **Profit**, with links to that client's payments and costs
- Edit or delete a cost from the job page or the Expenses page

### Security
- The job is verified as the caller's own before a cost is created; `userId` in every query (including the job/client filters, which are validated UUIDs); Zod validation; rate limit; shared 50,000 expense limit
- A job with payments **or costs** cannot be deleted (cancel it instead), in the action and in the database (`ON DELETE NO ACTION`)

### Operations
- **Migration**: `add_job_costs` (new `JobCostKind` enum, `Expense.jobId`, `costKind`, `payee`, index). Apply to production with `migrate deploy` (both `DATABASE_URL` and `DIRECT_URL`) before merging. Existing expenses are untouched
- Costs are saved without a category for now (choose one by editing the expense). No new dependency or environment variable

## 0.6.2
### Added (freelance mode, part 3: job payments)
- **Payments** section on each job: add an advance, part payment or final payment (amount, date, type, note). Shows Agreed, Received and Balance due, with a badge: Unpaid, Part paid, Paid in full, Overpaid (or "No price set")
- The amount is pre-filled with the balance still due and the type is suggested (first payment = Advance)
- Payments are stored as normal **Income**, so the dashboard, reports, CSV and PDFs include them. The Income page labels each one with its type, job and client
- Jobs list and client page show a **Balance** column; the client page shows **Total received** and **Balance due**
- Edit or delete a payment from the job page or the Income page

### Security
- The job is verified as the caller's own (`assertOwnJob`) before a payment is created; `userId` in every query; Zod validation; rate limit; shared 20,000 income-entry limit
- A job that has payments cannot be deleted (cancel it instead); enforced in the action and by the database (`ON DELETE NO ACTION`). Account deletion still removes everything

### Operations
- **Migration**: `add_job_payments` (new `PaymentKind` enum, `Income.jobId`, `Income.paymentKind`, index). Apply to production with `migrate deploy` (both `DATABASE_URL` and `DIRECT_URL`) before merging. Existing income rows are untouched
- No new dependency or environment variable

## 0.6.1
### Added (freelance mode, part 2: jobs)
- **Jobs** page (Freelance and Both): create, edit, delete and list jobs with client, title, service type, date, start/end time, location, status (Enquiry, Booked, Completed, Cancelled), agreed amount and notes
- Month navigation with "Completed" and "Pending" sections, status/client filters and paging; future jobs can be created
- **Job page** with all details; **client page** now lists that client's jobs and has an "Add job" shortcut
- A client that has jobs cannot be deleted (archive it instead); deleting the whole account still removes everything

### Security
- Every job query and change is scoped by `userId`; the chosen client must belong to the same user (`assertOwnClient`); explicit `select`s; Zod validation (real calendar dates, HH:MM times, end after start); rate limits; 20,000 jobs per user

### Operations
- **Migration**: `add_jobs` (new `JobStatus` enum and `Job` table). Apply to production with `migrate deploy` (both `DATABASE_URL` and `DIRECT_URL`) before merging
- Fixed a duplicate `.card-head` CSS rule. No new dependency or environment variable

## 0.6.0
### Added (freelance mode, part 1: foundation and clients)
- **Work type** in Settings: Salaried (default), Freelance, or Both. It only changes what is shown; nothing is hidden or deleted when you switch
- **Clients** page (visible for Freelance and Both): add, edit, archive/restore and delete clients with name, phone, email, city, address, how they found you, and private notes; search by name, phone, email or city; show Active / Archived / All; sort by name or date added; 10/20/50 per page
- **Client page** with all details (tap-to-call and email links) and a section where jobs and payments will appear in the next release
- Phone numbers are cleaned and validated (7 to 15 digits, optional +); email is validated and lower-cased
- Salaried-only accounts see a short "Freelance mode is off" page at /clients and a 404 for client detail pages

### Security
- Every client query and change is scoped to the signed-in user (`userId` in every `where`), with explicit `select`s, Zod validation, rate limits and a limit of 5,000 clients per user
- Client details are removed with the account (database cascade). Search text is escaped by Prisma; links use only validated phone/email values

### Operations
- **Migration**: `add_work_mode_and_clients` (new `WorkMode` enum, `User.workMode` default SALARIED, new `Client` table). Apply to production with `migrate deploy` (set both `DATABASE_URL` and `DIRECT_URL`) before merging
- No new dependency, no new environment variable. Existing users stay Salaried and see no change

## Unreleased
### Added
- `e2e/`: base setup for a Playwright + TypeScript test framework (config, env guard, folder READMEs, scenario list, test-id reference) and `.github/workflows/e2e.yml` (manual + nightly). The page objects, fixtures, helpers and tests are written by hand. See `e2e/README.md`
- More `data-testid` hooks: password, 2FA, import and report forms, create-goal forms
- The app's `tsconfig.json` and ESLint config now exclude `e2e/`
- No application code, migration or environment variable changes

## 0.5.2
### Fixed
- Copy expense: a **Clear** link in the "Copied from…" note resets the form; copying a second expense re-opens the add form even if you had collapsed it, and the page scrolls to the form
- Offline: pages other than the dashboard failed with "Something went wrong" because their scripts were never saved. Saved pages now bring their scripts/styles with them, and a page opened with filters falls back to its unfiltered saved copy. If a page truly was never saved the message now says "You are offline" instead of a generic error
- CI: added the new `effect` advisory (GHSA-7589-6fvf-x4pw, dev tooling only) to the documented audit allowlist

### Operations
- No migration, no new dependency, no new environment variable
- After deploying, open the app once online and wait ~10 seconds: the offline copies are rebuilt automatically (the old ones are replaced)

## 0.5.1
### Added
- **Home Screen shortcuts**: long-press the installed app icon for "Add expense" and "Add income"
- **Copy** button on each expense: opens the add form pre-filled (date = today) so repeat purchases take seconds
- **Month-over-month**: the Spent card on the dashboard says how spending compares with the previous month
- **Offline label**: when you are offline the banner says when the data you are looking at was saved
- **Getting started** card on the dashboard for new accounts (first expense, budget, goal); it disappears once done
- Press **N** anywhere (not while typing) to add an expense
- `data-testid` attributes on navigation, forms (`<action-name>` / `-submit` / `-error`), rows, filters, pager, banner and notification settings, for the Playwright framework

### Operations
- No migration, no new dependency, no new environment variable

## 0.5.0
### Added
- **Installable app (PWA)**: add it to your phone's Home Screen or install it from the browser; it opens like a normal app
- **Offline mode**: pages you have opened (and the main pages, saved quietly in the background) open without a connection. Expenses and income added offline are kept on the device and sent automatically when you are back online. A banner shows what is waiting; failures can be retried or discarded
- **Push notifications** (opt in per device in Settings → Notifications & offline): alert when a category reaches 80% of its budget and when it goes over; reminder 2 days before a recurring expense renews (daily job). Notifications never contain amounts. Test button included
- Duplicate-proof saving: each offline entry carries a random reference, so a retry never creates it twice

### Security
- Push addresses are accepted only from the real push services (https allowlist, no IPs/ports/credentials), so the server cannot be pointed at internal addresses; keys are format-checked; max 10 devices per user; every query is scoped to the signed-in user
- The reminder job requires a secret (`CRON_SECRET`, constant-time compare) and answers 401 to everyone else
- Signing out (or a session revoked elsewhere) removes saved pages, the offline queue and this device's push link; switching users on a device does the same

### Operations
- **Migration**: `add_push_and_offline` (apply to production with `prisma migrate deploy` before merging)
- New dependency: `web-push`
- New env vars (Vercel, Staging and Production, use different keys): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`. Generate keys once with `npx web-push generate-vapid-keys`
- Vercel Cron runs `/api/cron/reminders` once a day (Hobby plan limit)
- iPhone: push works only after Add to Home Screen (iOS 16.4+)

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
