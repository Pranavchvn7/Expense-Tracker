# tests

Only **scenarios** live here: what a user does and what must be true afterwards. Selectors and set-up code live elsewhere.

## Sub-folders = Playwright projects (see `playwright.config.ts`)

| Folder | Project | Starts as | Purpose |
|---|---|---|---|
| `setup/` | `setup` | logged out | logs in once, saves the session |
| `anonymous/` | `anonymous` | logged out | login page, redirects, public pages |
| `app/` | `desktop` | logged in | normal feature tests on a desktop browser |
| `mobile/` | `mobile` | logged in | phone-size layout tests |

Files: `*.spec.ts` for tests, `*.setup.ts` for the setup project.

## Conventions
- Import `{ test, expect }` from `../../src/fixtures`.
- One behaviour per test. Name it like a sentence: `"add an expense and see it in the list"`.
- Tag smoke tests with `@smoke` in the title: `test("... @smoke", ...)`. Run them with `npm run test:smoke`.
- Group with `test.describe("Expenses", ...)`.
- Use the `testData` fixture for every record you create. Never depend on another test's data or order.
- No fixed sleeps. Assert something visible instead.
- Suggested file names follow the module IDs in `docs/TEST-SCENARIOS.md` (e.g. `app/expenses.spec.ts`).
