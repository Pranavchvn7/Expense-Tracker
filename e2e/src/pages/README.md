# src/pages: Page Objects

One class per page, plus *components* that appear on many pages (the menu).

## What goes in a page object
- `path`: the page's address (e.g. `/expenses`).
- **Locators**: how to find things (prefer `getByTestId`, then `getByRole`, then `getByLabel`).
- **Actions**: things a user does (`login`, `add`, `delete`, `search`).
- Small "is the page ready" waits.

## What does NOT go in
- Business assertions such as "the total equals 12.50". Those belong in the test.
- Test data creation, cleanup, or credentials (that is helpers/fixtures/config).
- Importing from `fixtures/` or `tests/` (the arrow only points inward, see `docs/ARCHITECTURE.md`).

## Suggested files
`BasePage.ts` (abstract: `page`, `path`, `goto()`), `LoginPage.ts`, `NavComponent.ts`, `DashboardPage.ts`, `ExpensesPage.ts`, `IncomePage.ts`, `BudgetsPage.ts`, `ReportsPage.ts`, `DebtsPage.ts`, `RecurringPage.ts`, `GoalsPage.ts`, `SettingsPage.ts`, `ImportPage.ts`.

Tip: put locators as `readonly` fields created in the constructor, actions as `async` methods.
