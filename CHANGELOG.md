# Changelog

## 0.2.1
### Added
- Authenticator-app two-factor authentication (QR setup, backup codes, second sign-in step, turn off, new backup codes)
- Signed-in devices list with per-device and "all other devices" sign-out
- CSV export (this month, or everything up to the latest 20,000 rows) with spreadsheet formula-injection protection
- Staging environment support: `APP_ENV=staging` banner, `vercel.json` builds `main` and `staging`, `ENVIRONMENTS.md` (staging database, Vercel variables, daily workflow, branch protection)
- `scripts/disable-2fa.mjs` owner-only recovery

### Security
- 2FA code guessing rate limited; session references are opaque HMACs; exports are rate limited and capped

### Operations
- New migration: `TwoFactor` table and `twoFactorEnabled` on `user`
- New optional env var: `APP_ENV`
- New dependency: `qrcode` (and `@types/qrcode`); run `npm install` and commit `package-lock.json`
- Local `.env` should now point at the staging database

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
