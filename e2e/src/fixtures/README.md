# src/fixtures

A custom `test` built with `base.extend({...})`. Fixtures give each test ready-made objects and run setup/teardown around it.

## Your `index.ts` should
1. `import { test as base } from "@playwright/test"`
2. Declare a `Fixtures` type listing what tests can ask for.
3. `export const test = base.extend<Fixtures>({...})`
4. `export { expect } from "@playwright/test"`

Tests then import `{ test, expect }` from here, never from `@playwright/test` directly.

## Suggested fixtures
- **Page objects**: `loginPage`, `dashboardPage`, `expensesPage`, `nav`, ... (one line each: `await use(new XPage(page))`).
- **`testData`**: gives unique names for this test's records (built from `helpers/test-data.ts`), and **after `await use(...)` deletes everything created** (teardown runs even if the test failed). Wrap cleanup in try/catch so it never hides the real failure.
- Later: `categories` (create/remove a category), `otherUserPage` (second account, for isolation tests).

## Rules
- Fixture code before `await use(x)` = setup; after = teardown.
- Fixtures may import pages and helpers. Pages must never import fixtures.
