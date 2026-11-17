# Expense Tracker

A secure, multi-user expense tracker. Next.js (App Router) · TypeScript · Better Auth · Prisma · Neon Postgres · Zod · Vercel.

## Features (v0.3.0)
- New responsive design: sidebar on desktop, bottom tab bar on phones, light and dark mode
- Income tracking and a monthly balance (income minus spending, savings rate)
- Dashboard charts (category donut, six-month income vs spending) drawn as server-side SVG, month switcher and currency chips

### Earlier features
- Email + password accounts (Better Auth, scrypt hashing, 12+ char passwords)
- Optional email verification and password reset by email (needs a verified sending domain), change-password in Settings, closable registration
- Expenses with categories, integer minor-unit money, multi-currency
- Edit, search, category filter and pagination
- Monthly budgets with progress bars
- Monthly dashboard totals by category
- Opt-in, expiring, read-only share links (aggregates only)
- Account deletion that removes all data

## Setup
```bash
npm install
cp .env.example .env        # fill in real values; never commit .env
npx @better-auth/cli generate   # confirm the auth tables in prisma/schema.prisma match your installed version
npx prisma migrate dev --name init
npm run dev
```

### Neon
Create a project at neon.tech. Use the **pooled** string for `DATABASE_URL` and the **direct** string for `DIRECT_URL`. Both must include `sslmode=require`.

### Vercel
1. Import the repo. 2. Add `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your `https://` domain) as environment variables.
3. Run `npx prisma migrate deploy` against Neon once (or add it to a deploy step).

## Environments and workflow
Local, staging and production use separate databases and secrets. See [ENVIRONMENTS.md](./ENVIRONMENTS.md).

## Security
See [SECURITY.md](./SECURITY.md) for the threat model and the mapping to the 5-prompt launch checklist.

> If a secret was ever committed, it stays in git history. Rotate it immediately.

## Roadmap
- v0.2.1 (done): authenticator-app 2FA, signed-in devices list, CSV export, staging environment
- v0.3.0 (done): new UI, income, balance, charts
- v0.3.1: recurring expenses
- v0.3.2: shared household
- v0.4: receipt uploads (presigned S3/R2 URLs, MIME allowlist, UUID keys)
- Playwright e2e suite (page objects, API tests, CI)
