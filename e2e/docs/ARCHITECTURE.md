# How the pieces link together

## Folder map

```
e2e/
├─ playwright.config.ts        ← reads src/config, defines projects
├─ .env  (not committed)       ← values for src/config/env.ts
├─ .auth/user.json (generated) ← saved login, used by projects desktop + mobile
├─ src/
│  ├─ config/    env.ts, paths.ts
│  ├─ helpers/   test-data.ts, money.ts, dates.ts ...
│  ├─ pages/     BasePage.ts, LoginPage.ts, ExpensesPage.ts, NavComponent.ts ...
│  └─ fixtures/  index.ts      ← custom `test` that hands pages + helpers to tests
└─ tests/
   ├─ setup/      auth.setup.ts     (project: setup)
   ├─ anonymous/  *.spec.ts         (project: anonymous)
   ├─ app/        *.spec.ts         (project: desktop)
   └─ mobile/     *.spec.ts         (project: mobile)
```

## Who imports whom (arrows point to what is imported)

```
tests/**/*.spec.ts ──► src/fixtures ──► src/pages ──► @playwright/test
        │                   │
        │                   └────────► src/helpers
        └───────────────────────────► src/config   (only when it needs credentials)

tests/setup/auth.setup.ts ──► src/pages (LoginPage), src/config
playwright.config.ts ───────► src/config
```

Rules that keep this healthy:
1. **Pages never import fixtures or tests.** A page object only knows Playwright.
2. **Helpers never import pages.** They are plain utilities.
3. **Fixtures are the only place that wires pages + helpers together.**
4. **Specs import `test`/`expect` from `src/fixtures`**, not from `@playwright/test`. (Setup files import from `@playwright/test` because they run before fixtures matter.)
5. **No selectors in specs**; no assertions about business rules in pages.
6. Config is read in **one** place (`env.ts`).

## How one test run flows

1. `npx playwright test` → loads `playwright.config.ts` → calls `loadEnv()` (fails fast if `.env` is incomplete or points to Production).
2. Project `setup` runs `auth.setup.ts`: logs in, writes `.auth/user.json`.
3. Projects `desktop` / `mobile` start (they depend on `setup`). Each test gets a **fresh browser context** that already contains the saved cookies.
4. A test asks for fixtures by name, e.g. `async ({ expensesPage, testData }) => ...`. Playwright builds them (setup part), runs the test, then runs the teardown part (cleanup).
5. Results go to the console and `playwright-report/`; failures also keep screenshot, video and trace.

## Why a fresh context per test?
Isolation. Cookies, local storage and caches do not leak between tests. The saved login file is *copied* into each context.

## Where does a new thing go? (decision table)

| You are writing... | Put it in |
|---|---|
| "How do I find/click X on page Y" | `src/pages/YPage.ts` |
| "A menu that exists on every page" | `src/pages/NavComponent.ts` |
| "Unique names, date math, file creation" | `src/helpers/` |
| "Give every test a ready page object / automatic cleanup" | `src/fixtures/index.ts` |
| "A user journey and what must be true at the end" | `tests/<project folder>/*.spec.ts` |
| "A URL, credential, or timeout" | `src/config/` (+ `.env`) |
