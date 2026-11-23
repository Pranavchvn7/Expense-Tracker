# tests/setup

Runs first (project `setup`), once per run.

Create `auth.setup.ts`:
1. `import { test as setup, expect } from "@playwright/test"`
2. Read the test account with `loadEnv()` (from `src/config/env.ts`).
3. Open the login page, sign in, wait for the dashboard URL.
4. Save the cookies: `await page.context().storageState({ path: STORAGE_STATE })` (`STORAGE_STATE` from `src/config/paths.ts`).

The `desktop` and `mobile` projects then start already logged in because the config points their `storageState` at that file.
The `.auth/` folder is git-ignored: it contains a live session.
