# Freelance mode: plan and release roadmap

Status: **0.6.0 Clients, 0.6.1 Jobs shipped; 0.6.2 Job payments shipped; 0.6.3 Job costs + profit built**. Update the status column as each release ships, so any new session can resume from this file plus `CHANGELOG.md`.

## 1. Goal

Let a freelance worker (first user: a bridal makeup artist) run her work in the same app: clients, jobs, payments, job costs, a calendar and reminders, plus client/job reports. Everything the salaried flow already has (expenses, income, budgets, goals, debts, recurring, reports, offline, push) stays available, because many people are salaried **and** freelance.

## 2. Key design decisions

1. **Work type is a setting, not a separate account type.** `User.workMode`: `SALARIED` (default, today's behaviour), `FREELANCE`, `BOTH`. Changing it only changes what the menu and dashboard emphasise. No data is hidden or lost when switching. Existing users stay `SALARIED` and see nothing new until they turn it on.
2. **One source of truth for money.** Job payments and job expenses are stored in the **existing** `Income` and `Expense` tables, with an optional link to a job. Result: dashboards, budgets, reports, CSV, PDF, categories, offline queue and push alerts already include freelance money, with no duplicated totals.
   - Client payment (advance / partial / final) = an **Income** row with `jobId` and `paymentKind`.
   - Job cost (travel, assistant/fellow-artist payment, products) = an **Expense** row with `jobId`.
   - Money *received* is income, not an expense. "Show in expenses" is met by showing job costs in Expenses and showing payments in Income, each labelled with client and job (and by an "All transactions" view in reports and on the job page). *Confirm this reading with the owner.*
3. **Client is reached through the job.** `Expense`/`Income` link to `Job`; `Job` links to `Client`. Client totals are derived, never stored, so they cannot drift.
4. **Derived values, not stored:** amount paid, balance due, payment status badge, job profit (paid minus costs), client lifetime earnings. Computed in a pure, tested module (`job-math.ts`).
5. **Privacy by design.** Client names, phones, addresses and notes are personal data: every query scoped by `userId`, explicit `select`, no logging of values, included in account deletion (cascade), included in CSV export only when asked. Push notifications contain **no client names or amounts** (e.g. "2 jobs tomorrow").
6. **Free-text health notes** (skin type, allergies) are optional and clearly labelled as private notes; no special processing.
7. **Every new element ships with `data-testid`s** so the later Playwright suite needs no rework.
8. **Same engineering rules as today:** Zod on every input, `safely()` actions, rate limits, limits per user (e.g. 5,000 clients, 20,000 jobs), no inline styles (CSP), pure logic modules with node tests, CHANGELOG, SECURITY, git workflow after every release.

## 3. Data model (summary)

- `User`: `workMode` enum, `notifyJobs` boolean.
- `Client`: id, userId, name, phone, email, city/address, source (how they found you: Instagram, referral, ...), notes, archived, timestamps. Unique: none (two clients may share a name).
- `Job`: id, userId, clientId, title, serviceType (free text with suggestions: Bridal, Engagement, Party, Photoshoot, ...), eventDate (date), startTime/endTime (optional), location, status (`ENQUIRY`, `BOOKED`, `COMPLETED`, `CANCELLED`), agreedAmountMinor, currency, notes, timestamps.
- `Expense.jobId?` (FK, SetNull on job delete is **not** used: see rule below), `Income.jobId?`, `Income.paymentKind?` (`ADVANCE`, `PARTIAL`, `FINAL`).
- Rule: a job with payments or costs cannot be deleted. It can be set to `CANCELLED`. A "Delete job and its entries" action needs explicit confirmation.
- Indexes: `(userId, eventDate)`, `(userId, clientId)`, `(userId, jobId)` on Expense and Income.

## 4. Release roadmap (small, independent releases)

Each release = one branch, at most one migration, tests for new pure logic, docs, zip, git workflow. Each is usable on its own.

| Release | Scope | Migration | Status |
|---|---|---|---|
| **0.6.0** Foundation + Clients | Work type setting (Settings → Work type); menu shows Clients when `FREELANCE` or `BOTH`; Clients page: add / edit / search / paginate / archive / delete; client detail page (details, empty "no jobs yet" state) | `workMode`, `Client` | **shipped** |
| **0.6.1** Jobs core | Jobs page: create / edit / delete (rules above) / list; status; create future jobs; "This month: completed and pending" sections; client detail lists its jobs; job detail page | `Job` | **shipped** |
| **0.6.2** Job payments | Add advance / partial / final payment on a job; balance due; status badges (Unpaid, Advance paid, Part paid, Paid in full, Overpaid); payments show in Income with client + job; client "total earned" | `Income.jobId/paymentKind` | **shipped** |
| **0.6.3** Job expenses + profit | Add job costs (travel, assistant payment, products, other) from the job page; show in Expenses with client + job; filter Expenses/Income by job or client; job profit (paid minus costs) | `Expense.jobId` | **built (awaiting merge)** |
| **0.6.4** Calendar | Month grid showing jobs per day (status colours), day agenda list, upcoming-jobs card on the dashboard, double-booking warning for the same date/time | none | planned |
| **0.6.5** Reminders | Push 1 day before a job (existing daily cron, deduplicated), new "Job reminders" toggle, in-app "Payments due" list for completed jobs with a balance | `notifyJobs` | planned |
| **0.7.0** Freelance dashboard + reports | Dashboard for `FREELANCE`/`BOTH` (earned, outstanding, jobs this month, upcoming, top clients); monthly/yearly reports gain jobs completed, clients handled, earnings; **client report** (all jobs + related expenses + totals); **job report**; PDFs for both | none | planned |
| **0.7.1** Polish and insights | Client history timeline, lead-source summary, busiest months, CSV export of clients and jobs, "only freelance" wording (Income shown as client payments) | none | planned |
| **0.8.x** Optional extras | Receipt/invoice PDF per payment or job, WhatsApp share text for confirmations and balance reminders (link only, no API), `.ics` calendar export, service packages with default prices, assistant payout summary, portfolio photos via presigned uploads (needs bucket) | varies | ideas |

Playwright work resumes after 0.7.0 (or earlier if preferred); every release adds test ids.

## 5. Suggested additions beyond the request (chosen for makeup artists and most freelancers)

- **Booking status** (enquiry, booked, completed, cancelled) so enquiries do not count as work.
- **Who owes me**: outstanding balances across clients, oldest first.
- **Job profit**: what you actually kept after costs.
- **Lead source** per client (Instagram, referral...): shows where work comes from.
- **Double-booking warning** on the same date and time.
- **Service type + default price suggestions** (later: packages).
- **Receipts / confirmations** to send to clients (later).
- **Calendar export (.ics)** to see jobs in the phone's own calendar (later).
- **Assistant / fellow-artist payouts** tracked as job costs with a payee name (field on the job cost, release 0.6.3).

## 6. Order of work inside a release (to keep each session small)

1. Pure logic module + node test (validation, math).
2. Prisma schema + migration name.
3. Queries (`src/lib/*-queries.ts`), actions (`src/actions/*.ts`) with Zod, `safely`, rate limit, ownership checks.
4. Page(s) + components, with test ids, no inline styles.
5. Navigation, CSS, empty states, mobile layout.
6. Syntax check, tests, grep for inline styles.
7. CHANGELOG, SECURITY (if new risk), README; zip; git workflow; staging checklist; production `migrate deploy` (remember both `DATABASE_URL` and `DIRECT_URL`).

## 7. Open questions (defaults if not answered)

1. Payments received are shown in **Income**, job costs in **Expenses**, both labelled with client and job. (Default: yes.)
2. Work type is a Settings choice, default Salaried; no separate sign-up type. (Default: yes.)
3. Job reminders arrive about 09:00 local time the day before (daily cron runs once a day on the free plan). (Default: yes.)
4. Start with one currency per user, as today. (Default: yes.)
