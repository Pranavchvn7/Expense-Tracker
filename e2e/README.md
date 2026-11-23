# e2e: Playwright + TypeScript tests for Expense Tracker

Runs against **Staging only**. You write the page objects, fixtures, helpers and tests yourself; this folder gives you the base setup and a README in every folder explaining what goes there.

## What is already here (base setup)

| File | Purpose |
|---|---|
| `package.json` | Dependencies and npm scripts |
| `tsconfig.json` | TypeScript settings for the tests |
| `playwright.config.ts` | The control centre: browsers, projects, retries, reports |
| `.env.example` | Which settings you must provide (copy to `.env`) |
| `.gitignore` | Keeps secrets and reports out of git |
| `src/config/env.ts` | Reads `.env`, validates it, blocks Production |
| `src/config/paths.ts` | Path of the saved login file |

Everything else (`src/pages`, `src/fixtures`, `src/helpers`, `tests/*`) is empty on purpose, each with a README.

## First-time setup

```bash
cd e2e
npm install
npx playwright install chromium
cp .env.example .env          # Windows: copy .env.example .env  (then edit it)
npm run typecheck             # should print nothing (no errors)
npx playwright test --list    # should say "No tests found" (nothing written yet): that proves the config loads
```

## Docs in this folder

- `docs/ARCHITECTURE.md`: how `config → pages → fixtures → tests` link together, and the import rules.
- `docs/TEST-SCENARIOS.md`: smoke and regression scenarios with their test cases (your to-do list).
- `docs/TESTIDS.md`: every `data-testid` the app exposes.
- `PLAYWRIGHT-FRAMEWORK-GUIDE.md`: generic, reusable guide for any web app.

## Suggested order to build

1. `src/pages/BasePage.ts`, then `LoginPage.ts`
2. `tests/setup/auth.setup.ts` (log in once, save state)
3. `tests/anonymous/` first smoke test (redirect to login)
4. `src/pages/NavComponent.ts`, `DashboardPage.ts`
5. `src/fixtures/index.ts` (custom `test`)
6. `src/helpers/test-data.ts` (unique names)
7. `ExpensesPage.ts`, then the expense tests, cleanup in the fixture
8. Continue module by module from `docs/TEST-SCENARIOS.md`
