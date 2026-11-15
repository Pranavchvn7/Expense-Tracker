# Expense Tracker

A secure, multi-user expense tracker. Next.js (App Router) · TypeScript · Better Auth · Prisma · Neon Postgres · Zod · Vercel.

## Features (v0.1)
- Email + password accounts (Better Auth, scrypt hashing, 12+ char passwords)
- Expenses with categories, integer minor-unit money, multi-currency
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

## Security
See [SECURITY.md](./SECURITY.md) for the threat model and the mapping to the 5-prompt launch checklist.

> If a secret was ever committed, it stays in git history. Rotate it immediately.

## Roadmap
- v0.2: receipt uploads (presigned S3/R2 URLs, MIME allowlist, UUID keys), CSV export
- v0.3: Playwright e2e suite (page objects, API tests, CI)
