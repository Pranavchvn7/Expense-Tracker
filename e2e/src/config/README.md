# src/config

Settings and fixed values. **No page logic, no tests.**

Already provided:
- `env.ts`: loads `e2e/.env`, checks every required value exists, refuses to run against a host in `E2E_BLOCK_HOSTS` (Production). Exports `loadEnv()`.
- `paths.ts`: exports `STORAGE_STATE`, the path of the saved login file (`e2e/.auth/user.json`).

Who imports from here: `playwright.config.ts`, `tests/setup/auth.setup.ts`, and any spec that needs the test account's email/password.

You may add later: constants such as `ROUTES` (`"/expenses"`, ...) or timeouts. Keep it free of Playwright `page` objects.
