# Environments, staging and branch protection

Menu labels in Neon, Vercel and GitHub change from time to time. If a button is not where this guide says, look for the same idea nearby.

## The setup

| Where | Code | Database | Variables come from |
|---|---|---|---|
| Your computer | any branch | **Neon staging** project | local `.env` |
| Staging | branch `staging` | **Neon staging** project | Vercel, Preview, branch `staging` |
| Production | branch `main` | **Neon production** project | Vercel, Production |

Rules that keep this safe:
1. **Production connection strings live only in Vercel (Production).** Type them only for the one-off `prisma migrate deploy` command, then close that terminal.
2. **Your local `.env` points at the staging database.** `prisma migrate dev` changes whichever database `.env` points to, so it must never be production.
3. **Staging has its own `BETTER_AUTH_SECRET`.** A session from staging must not work on production.
4. **Staging data is disposable and fake.** Never put real expenses there.

## Part 1: staging database (Neon)

1. In neon.tech click **New project**. Name it `expense-tracker-staging`, same region as production.
   - Use a separate **project**, not a branch of the production project. A branch copies production data, which is your real financial data.
2. Open **Connect** and copy both strings: pooled (host has `-pooler`) and direct (pooling off). Both must end with `?sslmode=require`.
3. Put them in your local `.env` as `DATABASE_URL` and `DIRECT_URL`, replacing whatever was there. Keep `BETTER_AUTH_URL="http://localhost:3000"`.
4. Create the tables in staging:
   ```bash
   npx prisma migrate deploy
   ```
5. In the Neon console, open the staging project's **Tables** page and check that `user`, `expense`, `Budget` and so on exist.

## Part 2: staging deployment (Vercel)

1. **Check production variables are production-only.** Vercel project, **Settings**, **Environment Variables**. For each of `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SIGNUPS_ENABLED`, edit it and make sure only **Production** is ticked. (Your earlier failed Preview build suggests this is already so; confirm.)
2. **Pick a stable staging address.**
   - Option A: **Settings, Domains, Add**, type a free name such as `expense-tracker-staging.vercel.app`, and connect it to the Git branch `staging` (Preview environment).
   - Option B: skip it. After the first staging deployment, open it in **Deployments** and copy its branch URL (it contains `-git-staging-`). Use that as `BETTER_AUTH_URL` and redeploy once.
   - Either way the URL must be `https://...` with no trailing slash.
3. **Add these variables.** For each, choose **Preview** only, then limit it to the branch `staging`:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | staging pooled string |
   | `DIRECT_URL` | staging direct string |
   | `BETTER_AUTH_SECRET` | a NEW secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `BETTER_AUTH_URL` | the staging address from step 2, **including `https://`**, e.g. `https://expense-tracker-git-staging-yourname.vercel.app`. Copy it from Deployments, the staging deployment, Domains. No spaces; a trailing `/` is tolerated. |
   | `SIGNUPS_ENABLED` | `true` |
   | `APP_ENV` | `staging` |
4. **Keep staging private.** **Settings, Deployment Protection**: make sure **Vercel Authentication** is on for preview deployments, so only people signed in to your Vercel account can open staging. If it cannot be enabled on your plan, set staging's `SIGNUPS_ENABLED` to `false` and create test users by hand, or do not leave staging running.
5. **First deploy** is done by pushing a branch to `staging` (see Part 3). `vercel.json` makes Vercel build only `main` and `staging`.
   - With option B the first staging build fails until `BETTER_AUTH_URL` is set to the staging address. That is expected: set the variable (Preview, branch `staging`), then open the failed deployment, click **Redeploy**, and leave it as a Preview deployment.
   - Never use **Promote to Production** on a staging deployment, and never tick Production on a staging variable.
   - **Never choose "Production" in the Redeploy dialog for a staging deployment.** That rebuilds staging code with your PRODUCTION variables (production database, production secret) and can publish it on your live site. If a staging build fails, read its log, fix the Preview variables, then rebuild by pushing an empty commit to `staging` (see Part 3).
   - As a safety net the app now refuses to build when a production deployment is not from `main` or uses `APP_ENV=staging`, or when a preview deployment lacks `APP_ENV=staging`.
6. **Check it:** the page shows a red **STAGING** banner, you can sign up, and the new user appears in the Neon **staging** project, not production.

## Part 3: daily workflow

```bash
git checkout main
git pull
git checkout -b feat/my-change
# ...edit, commit with conventional messages...

# 1. If the change has a database migration, apply it to STAGING first:
#    (your local .env already points at staging)
npx prisma migrate deploy

# 2. Put this branch on staging (staging is a disposable pointer, so force is fine):
git push --force-with-lease origin feat/my-change:staging
#    First time ever, when the branch does not exist yet:
#    git push origin feat/my-change:staging
#    If Vercel shows no deployment, the same commit was probably already pushed to another
#    branch. Push a new commit instead:
#    git commit --allow-empty -m "chore: trigger staging deploy"
#    git push --force-with-lease origin HEAD:staging

# 3. Test on the staging address.

# 4. Open a pull request into main:
git push -u origin feat/my-change
#    GitHub: Pull requests > New > base: main. Wait for CI (checks) to pass, then Rebase and merge.

# 5. If the change has a migration, apply it to PRODUCTION before (or right as) you merge:
#    DATABASE_URL="<production pooled>" DIRECT_URL="<production direct>" npx prisma migrate deploy
#    PowerShell:  $env:DATABASE_URL="..."; $env:DIRECT_URL="..."; npx prisma migrate deploy
#    Close that terminal afterwards.

git checkout main
git pull
git branch -d feat/my-change
```

Notes:
- Only one feature can be on staging at a time. Pushing another branch to `staging` replaces it.
- Do not open pull requests from `staging`; always branch from `main` and push the feature branch to `staging` as shown.
- Migrations must be backwards compatible with the code currently in production (add columns or tables first; remove them in a later release), because the database is updated a moment before the code.

## Part 4: GitHub branch protection

Do this once, after your current work is merged.

1. Repository, **Settings**, **Rules**, **Rulesets**, **New ruleset**, **New branch ruleset**.
2. Name: `Protect main`. Enforcement status: **Active**.
3. **Target branches**: Add target, **Include default branch** (this is `main`; it does not cover `staging`).
4. Tick these rules:
   - **Restrict deletions**
   - **Block force pushes**
   - **Require linear history** (matches "Rebase and merge")
   - **Require a pull request before merging**, with required approvals **0** (GitHub will not let you approve your own pull request, so 1 would lock you out)
   - **Require status checks to pass**: click **Add checks** and pick **`checks`** (the job in `.github/workflows/ci.yml`; it only appears in the list after CI has run once, which it has). Also tick **Require branches to be up to date before merging**.
5. **Bypass list**: leave it empty. In an emergency you can edit the ruleset and set it to Disabled, then turn it back on.
6. **Create**.

Then **Settings, General, Pull Requests**:
- Untick **Allow merge commits** and **Allow squash merging**; keep **Allow rebase merging**.
- Tick **Automatically delete head branches**.

And confirm **Settings, Code security** has Dependabot alerts, Dependabot security updates, secret scanning and push protection switched on.

After this, nobody (including you) can push straight to `main`, so every change goes through a pull request with passing CI.

## Check that staging is isolated from production
Do this once after the first staging deployment, and again if you ever change variables.
1. Vercel, **Deployments**: the staging deployment's environment must say **Preview**, its address must not be your production address, and your production deployment must still be the one marked **Current**.
2. The red **STAGING** banner shows on every page (this only works if the Preview `APP_ENV` variable applied).
3. Create a test user on staging. In Neon, that user must appear in the **staging** project's `user` table and must **not** appear in the production project.
4. Production still works: sign in on the production address, and its `BETTER_AUTH_URL` variable is still the production address.
5. **Settings, Environment Variables**: each staging variable is ticked for Preview only (branch `staging`), and staging `DATABASE_URL` points at a different Neon host than production's.

If any check fails, stop using staging, tell me what you saw, and rotate anything that may have been exposed.

## If something goes wrong
- **No Vercel deployment after pushing to `staging`**: the same commit was already pushed elsewhere. Push a new commit (see Part 3).
- **First staging build fails with `Invalid environment configuration: NAME (reason)`**: the reason says what is wrong (for example "is missing or empty for this environment" means the variable is not applied to the `staging` branch; "must be a full URL" or "must start with https://" means the value is wrong). Fix the Preview variable, then rebuild by pushing an empty commit to `staging`.
- **A variable change has no effect**: Vercel applies variables only to NEW deployments, and a branch-specific Preview variable applies only when its branch field is exactly `staging`.

- **Staging build fails with `Invalid environment configuration: ...`**: a staging variable is missing or not scoped to the `staging` branch. The message lists names only.
- **Staging login loops**: `BETTER_AUTH_URL` does not exactly match the address in the browser bar.
- **Vercel shows no deployment for a branch**: expected for any branch other than `main` and `staging`.
- **You see real data on staging**: stop. Check the staging `DATABASE_URL` points at the staging Neon project and rotate anything that was exposed.


### v0.5.0 variables
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` (all optional; VAPID three must be set together). Use different VAPID keys for Staging and Production. Cron only runs on Production deployments.
