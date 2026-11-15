# Setup guide: Git, Neon database, Vercel deployment

Follow the steps in order. Every command is for a terminal opened in this project folder.

## Prerequisites
- Node.js 20.11 or newer (`node -v`)
- Git (`git --version`)
- Free accounts on GitHub, Neon (neon.tech) and Vercel

## 1. Install dependencies
```bash
npm install
```

## 2. Run the setup script (git + .env)
```bash
npm run setup
```
This creates `.env` with a freshly generated `BETTER_AUTH_SECRET`, initialises git on branch `main`, and makes the first commit. `.env` is git-ignored and is never committed.

## Email is optional (v0.2)
Email verification and "forgot password" by email only switch on when you set BOTH `RESEND_API_KEY` and `EMAIL_FROM`. Without them (the default) the app runs in **no-email mode**:
- Sign-up signs the user in straight away, with no verification step.
- There is no "forgot password" email. Signed-in users can change their password under **Settings > Change password**.
- If someone forgets their password, the owner resets it from their own computer: `npm run reset-password -- their@email.com` (see "Forgotten passwords" below).
- **Close registration once you and your family have signed up:** set `SIGNUPS_ENABLED="false"` (in `.env` locally and in Vercel). Because email is not verified in this mode, anyone on the internet could otherwise create an account.

To turn email on later: create a free account at resend.com, add and verify a sending domain (DNS records), create an API key, then set `RESEND_API_KEY` and `EMAIL_FROM` (an address on that domain, e.g. `Expense Tracker <no-reply@yourdomain.com>`). Resend's shared test sender only delivers to your own account email, so a verified domain is needed for other users.

## Forgotten passwords (no-email mode)
Run on your own computer, in an interactive terminal:
```bash
# local database
node --env-file=.env scripts/reset-password.mjs their@email.com
# production database: set both Neon strings for this one command only, then
DATABASE_URL="<neon pooled string>" DIRECT_URL="<neon direct string>" node scripts/reset-password.mjs their@email.com
```
You type the new password at a hidden prompt. The script signs that user out everywhere. Tell them the new password in person and ask them to change it under Settings.

## 3. Create the Neon database
1. Sign in at neon.tech and click **New project**. Pick the region closest to your users (and to your Vercel region).
2. Open **Connect** on the project dashboard.
3. Copy two connection strings:
   - **Pooled** (host contains `-pooler`): this is `DATABASE_URL`.
   - **Direct** (turn the "Connection pooling" toggle off): this is `DIRECT_URL`.
4. Both must end with `?sslmode=require`.
5. Paste them into `.env`. Keep `BETTER_AUTH_URL="http://localhost:3000"` for local work.

Security tip: in Neon, create a dedicated role for the app instead of using the owner role for everything, and never share these strings in chat or screenshots.

## 4. Create the tables
```bash
npx @better-auth/cli generate   # optional: compare with prisma/schema.prisma
npx prisma migrate dev --name init
```
Commit the generated `prisma/migrations` folder:
```bash
git add prisma/migrations
git commit -m "feat(db): add initial migration"
```

## 5. Run locally
```bash
npm run dev
```
Open http://localhost:3000, create an account, add an expense, then check Settings.

## 6. Push to GitHub
1. On github.com create a new **empty** repository (no README, no .gitignore).
2. Connect and push:
```bash
git remote add origin https://github.com/<your-username>/expense-tracker.git
git push -u origin main
```
3. In the repo go to **Settings > Code security** and enable Dependabot alerts, Dependabot security updates and secret scanning with push protection.
4. Make the repo **private** until you have reviewed it, if you prefer. The CI workflow in `.github/workflows/ci.yml` runs typecheck, lint, `npm audit` and a Gitleaks secret scan on every push.

Use conventional commit messages (`feat:`, `fix:`, `chore:`, `docs:`, `test:`) so the portfolio history reads cleanly.

## 7. Deploy on Vercel
1. At vercel.com click **Add New > Project** and import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Leave build settings as they are.
3. Add these **Environment Variables** (Production, and Preview if you use previews):

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon pooled string |
| `DIRECT_URL` | Neon direct string |
| `BETTER_AUTH_SECRET` | a NEW value: run `openssl rand -base64 32` (do not reuse your local one) |
| `BETTER_AUTH_URL` | your final `https://` URL, no trailing slash |
| `SIGNUPS_ENABLED` | `true` while registering accounts, then `false` |
| `RESEND_API_KEY` | optional: only if you turn email on (set together with `EMAIL_FROM`) |
| `EMAIL_FROM` | optional: verified sender address |

4. Click **Deploy**. The first deploy gives you a URL like `https://expense-tracker-xxxx.vercel.app`. If it differs from the `BETTER_AUTH_URL` you entered, update the variable and redeploy.

## 8. Apply migrations to the production database
Run once from your machine, pointing at the production Neon database (use a temporary shell variable, do not put it in a file):
```bash
DATABASE_URL="<neon pooled string>" DIRECT_URL="<neon direct string>" npx prisma migrate deploy
```
Repeat whenever you add a migration.

## 9. Verify the deployment
- Sign up, sign in, add and delete an expense, create and revoke a share link.
- Check security headers at https://securityheaders.com (enter your URL). Expect a high grade.
- Sign in with a second account and confirm you cannot see the first account's data.
- Try 6 wrong logins quickly; you should get rate limited.

## 10. Custom domain (optional)
Vercel project **Settings > Domains** > add your domain, follow the DNS instructions, then set `BETTER_AUTH_URL` to the new `https://` domain and redeploy.

## Day-to-day workflow
```bash
git checkout -b feat/my-change
# edit, then
npm run typecheck && npm run lint
git commit -am "feat: describe the change"
git push -u origin feat/my-change   # open a PR; Vercel makes a preview, CI runs checks
```

## If something goes wrong
- **"Invalid environment configuration"**: a variable is missing or weak; the message lists the names only.
- **Prisma can't connect**: confirm `sslmode=require` and that you used the pooled string for `DATABASE_URL`.
- **Login loops on Vercel**: `BETTER_AUTH_URL` doesn't match the deployed origin exactly.
- **A secret was committed**: rotate it immediately in Neon/Vercel; deleting the commit is not enough.
