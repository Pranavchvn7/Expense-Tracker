# Playwright + TypeScript framework: build it from scratch for any web app

A reusable, step-by-step guide. Part A is generic (works for any web application). Part B shows how each step looks in the Expense Tracker's `e2e/` folder, so you can compare with real code.

---

## 0. Vocabulary (read once)

| Term | Meaning |
|---|---|
| **E2E test** | A test that drives a real browser against a real deployed app, like a user: click, type, read the screen. |
| **Playwright** | The tool that controls browsers (Chromium, Firefox, WebKit) and also provides the test runner (`@playwright/test`). |
| **Locator** | A description of "how to find an element" (e.g. the button with test id `auth-submit`). Locators are lazy and re-evaluated each time, so they survive page re-renders. |
| **Auto-waiting** | Playwright waits for an element to be visible and enabled before clicking. You almost never need `sleep`. |
| **Web-first assertion** | `await expect(locator).toBeVisible()`: retries until true or the timeout. Use these instead of reading a value and comparing. |
| **Page Object (POM)** | A class that wraps one page's locators and actions. Tests read like a story; selectors live in one place. |
| **Fixture** | Something a test asks for by name (`{ page, expensesPage }`). Playwright builds it before the test and tears it down after. |
| **Project** | A named configuration inside the config (browser + device + which tests + login state). Tests run once per matching project. |
| **storageState** | A saved file of cookies/localStorage. Lets tests start already logged in. |
| **Trace** | A recorded timeline (screens, network, console) of a test, opened in a viewer. The best debugging tool. |

---

# PART A: Generic steps (any web app)

## Step 1. Decide what you test, and where

1. **Environment**: test a *deployed non-production* copy (Staging). Never Production: tests create and delete data.
2. **Scope for a first version**: the few journeys that must never break: sign in/out, the app's main create/read/delete flow, navigation, one phone-size check. Not every button.
3. **Test account**: a dedicated user in Staging, with MFA/2FA **off** for that account only, and no real data.

> Why: E2E tests are slow and a little fragile compared to unit tests. Keep them few, valuable, and stable. Unit/integration tests cover the details.

## Step 2. Create the project

Keep the framework in its own folder so it does not mix with the app's dependencies, build and audit.

```bash
mkdir e2e && cd e2e
npm init -y
npm install -D @playwright/test typescript dotenv @types/node
npx playwright install chromium        # downloads the browser (add firefox/webkit later if needed)
```

What each package does:
- `@playwright/test`: runner + browser automation + assertions.
- `typescript`: type-checks your tests (`tsc --noEmit`) so mistakes are caught before running.
- `dotenv`: loads settings from a local `.env` file.
- `@types/node`: types for `process`, `path`, etc.

Commit `package-lock.json`. CI uses `npm ci`, which needs it.

## Step 3. Folder structure

```
e2e/
  playwright.config.ts      # the control centre (Step 6)
  tsconfig.json
  package.json
  .env.example              # documents the settings; the real .env is NOT committed
  .gitignore
  src/
    config/    env.ts, paths.ts        # settings + safety checks
    pages/     BasePage.ts, LoginPage.ts, ...   # Page Objects (Step 8)
    fixtures/  index.ts                # custom `test` (Step 9)
    helpers/   test-data.ts            # unique data names (Step 10)
  tests/
    setup/      auth.setup.ts          # logs in once (Step 11)
    anonymous/  *.spec.ts              # tests that start logged out
    app/        *.spec.ts              # tests that start logged in
    mobile/     *.spec.ts              # phone-size tests
```

Rule of thumb: `src/` = reusable building blocks, `tests/` = only scenarios. Tests should contain *what* happens, never *how to find things*.

## Step 4. TypeScript and git settings

`tsconfig.json`: `strict: true` (catches `undefined` mistakes), `noEmit` (we only type-check; Playwright compiles on the fly), `types: ["node"]`.

`.gitignore`: `node_modules`, `.env`, `.auth` (saved login cookies are secrets!), `playwright-report`, `test-results`.

If the e2e folder lives inside the app's repository, **exclude it from the app's own `tsconfig`/ESLint/build** (e.g. `exclude: ["e2e"]`), otherwise the app's build tries to compile tests whose dependencies it does not have.

## Step 5. Settings and a safety guard (`src/config/env.ts`)

Read all settings in **one** place, fail fast with a clear message, and add a guard that refuses to run against production.

- `E2E_BASE_URL`: the Staging address.
- `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`: the test account.
- `E2E_BLOCK_HOSTS`: the production host name(s). If `E2E_BASE_URL` points there, the run aborts.
- Optional bypass secret if the hosting platform password-protects previews.

Locally these come from `e2e/.env`; in CI from repository secrets. **Never hard-code credentials or URLs in tests.**

## Step 6. The config file (`playwright.config.ts`)

Key options and why:

| Option | Value | Why |
|---|---|---|
| `testDir` | `./tests` | Where specs live. |
| `fullyParallel` | `true` | Tests in a file also run in parallel, which is fast and **forces tests to be independent** (a good thing). |
| `forbidOnly` | `true` on CI | A stray `test.only` would silently skip everything else. |
| `retries` | 1 on CI, 0 locally | Absorbs a network blip on CI; a retry that passes is reported as **flaky**, so you still notice. Locally you want failures immediately. |
| `workers` | 2 | Parallel processes. Keep low when apps have rate limits or share one test account. |
| `timeout` / `expect.timeout` | 45 s / 10 s | Per test / per assertion. Generous but finite. |
| `reporter` | list + html (+ github on CI) | Console output and a browsable report. |
| `use.baseURL` | from env | Lets tests say `page.goto("/expenses")`. |
| `use.trace` | `on-first-retry` | Records the timeline only when a test needs a retry: cheap and useful. |
| `use.screenshot` / `video` | on failure | Evidence without slowing passing runs. |
| `use.testIdAttribute` | `data-testid` | Makes `getByTestId()` look at that attribute. |
| `use.serviceWorkers` | `block` | Stops a PWA's cache from making one test depend on another. Test offline behaviour in its own project. |

### Projects (the important idea)

A *project* = a way to run tests. We use four:

1. `setup`: runs `auth.setup.ts` once: logs in and saves cookies.
2. `anonymous`: no saved login; for login-page tests.
3. `desktop`: depends on `setup`; starts with the saved login; desktop Chrome.
4. `mobile`: depends on `setup`; Pixel 7 device emulation (small screen, touch).

`dependencies: ["setup"]` guarantees the login file exists before those projects start. `testMatch` decides which folder each project runs.

## Step 7. Locator strategy (how to find elements)

Order of preference:

1. **`getByTestId("...")`**: a stable `data-testid` attribute added by developers *for tests*. Survives redesigns, translations and CSS refactors. Best for custom controls and repeated elements.
2. **`getByRole("button", { name: "Apply" })`**: how users and screen readers perceive the page; also checks accessibility.
3. **`getByLabel("Amount")`**: form fields by their visible label.
4. **`getByText`**: only for assertions about content.
5. **CSS/XPath**: last resort. They break when styling changes.

Scope locators to reduce ambiguity: `form.getByLabel("Category")` rather than `page.getByLabel("Category")` (the page may have two). Use `locator.filter({ hasText: "..." })` to pick one row out of a list.

Naming convention for test ids used in this project: `area-thing` kebab case; forms get `<action>` and `<action>-submit` / `-error`; list rows get `<thing>-row`; navigation gets `side-nav-*`, `tab-*`, `sheet-nav-*` (different prefixes because the same menu item can exist in two layouts).

## Step 8. Page Objects (`src/pages/*.ts`)

Each page/component gets a class:

Shape of a page object: an abstract `BasePage` (holds `page`, `path`, `goto()`); each page extends it, declares its locators as `readonly` fields set in the constructor, and exposes async methods named after user actions (`login`, `add`, `delete`).

Rules:
- Page objects contain **locators and actions** (`add`, `delete`, `search`). They may include "wait until ready" assertions.
- **Business assertions live in the tests** (`expect(row).toContainText("12.50")`).
- One class per page, plus *components* for things that appear everywhere (the nav menu).
- If the UI changes, you fix **one** file, not fifty tests.

## Step 9. Fixtures (`src/fixtures/index.ts`)

`test.extend({...})` creates a custom `test` that hands page objects to tests:

A test then simply lists what it needs in its parameter list (for example `expensesPage` and `testData`) and Playwright supplies them.

Why: no `new ExpensesPage(page)` boilerplate; setup/teardown in one place. A fixture runs code **before** `await use(value)` (setup) and **after** it (teardown, runs even if the test failed). We use that for automatic cleanup of the data a test created.

Tests import `{ test, expect }` from the fixtures file, never straight from `@playwright/test`.

## Step 10. Test data strategy

Goals: tests don't interfere with each other, and don't leave garbage.

1. **Unique names**: each test gets a prefix like `e2e-lq3k9-w0-ab12` (time + worker + random). Everything it creates uses that prefix.
2. **Cleanup in the fixture**: after the test, search for the prefix in the app and delete those rows. It can only touch what this test created.
3. **Independence**: a test never relies on another test's data or order.

Other strategies when you outgrow this (in order of effort): call the app's API to create/delete data (fast, needs auth handling), a staging-only seed/reset endpoint protected by a secret (never in production), or a dedicated database per run. Start with 1-3.

## Step 11. Log in once, reuse everywhere (`auth.setup.ts`)

Logging in through the UI before every test wastes time and hits rate limits. Instead:

1. `setup` project logs in once via the real login page.
2. `page.context().storageState({ path: ".auth/user.json" })` saves the cookies.
3. `desktop`/`mobile` projects set `use.storageState` to that file, so each test starts logged in.
4. The `anonymous` project does **not** use it, and tests there log in/out themselves.

The login flow itself is still tested (in the `anonymous` project and by the setup step).

## Step 12. Writing a good test

Pattern: **Arrange → Act → Assert**.

Arrange: ask for unique data and open the page. Act: perform the user action through the page object. Assert: check the visible result with a web-first assertion.

Do:
- One behaviour per test; clear name that reads like a sentence.
- Use web-first assertions (`expect(locator)...`); they retry.
- Handle browser dialogs with `page.once("dialog", d => d.accept())` **before** the click that opens them.
- Tag key tests with `@smoke` in the title and run them with `--grep @smoke`.

Don't:
- `page.waitForTimeout(3000)`. Wait for a *condition* (an element, a URL, a response) instead.
- Chain tests (test 2 needs test 1's data).
- Assert on text that changes often (dates, random ids) unless you control it.
- Put selectors in tests.

## Step 13. Running and debugging

| Command | Use |
|---|---|
| `npx playwright test` | Run everything (headless). |
| `npx playwright test --headed` | Watch the browser. |
| `npx playwright test --ui` | Interactive UI mode: pick tests, time-travel through steps. Great for writing tests. |
| `npx playwright test --debug` | Step through with the inspector. |
| `npx playwright test tests/app/expenses.spec.ts -g "copy"` | One file / one test by name. |
| `npx playwright test --project=mobile` | One project. |
| `npx playwright codegen <url>` | Records your clicks as code (a starting point; then convert to page objects and test ids). |
| `npx playwright show-report` | Open the last HTML report. |
| `npx playwright show-trace trace.zip` | Open a trace file. |

When a test fails: open the report → the failing test → the **trace** (timeline, DOM snapshots before/after each step, network, console). Most failures are visible there in seconds.

## Step 14. Flaky tests

A flaky test passes and fails without code changes. Common causes and fixes:
- Fixed sleeps → wait for a condition.
- Shared data between tests → unique names + cleanup.
- Racing the UI (clicking before data arrived) → assert a visible result before the next step.
- Rate limiting → fewer workers, saved login instead of logging in every time.
- Animations → assert final state; Playwright already waits for elements to be stable.

Policy: a flaky test is a bug. Fix or quarantine it (`test.fixme`) with a note; don't just raise retries.

## Step 15. Continuous integration (GitHub Actions)

A workflow that: checks out the repo → installs Node → `npm ci` (in `e2e/`) → type-checks → `npx playwright install --with-deps chromium` → runs the tests → uploads `playwright-report` as an artifact (even on failure).

- Secrets (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `VERCEL_BYPASS_SECRET`) in *Settings → Secrets and variables → Actions → Secrets*. Non-secret values (`E2E_BASE_URL`, `E2E_BLOCK_HOSTS`) as *Variables*.
- Trigger: manual (`workflow_dispatch`) plus a nightly schedule at first. Per-pull-request runs need a way to wait for the preview deployment; add them when that is solved.
- Keep it **separate** from the app's own CI so a flaky e2e run never blocks a hotfix.

## Step 16. Grow it safely

Add in this order: more journeys (income, budgets, goals, debts, reports), validation/error cases, accessibility checks (`@axe-core/playwright`), visual snapshots for a few key screens, API tests (`request` fixture) for backend rules, an offline project that *allows* the service worker and uses `context.setOffline(true)`.

---

## Checklist: starting a new app

- [ ] Staging environment + dedicated test account (MFA off) + safety guard against production
- [ ] `e2e/` folder with own `package.json`, lockfile, `.gitignore` (`.env`, `.auth`)
- [ ] App's own tsconfig/ESLint/build exclude `e2e`
- [ ] Ask developers for `data-testid`s on key controls (or add them)
- [ ] `env.ts` with required settings and block-list guard
- [ ] `playwright.config.ts`: projects (setup, anonymous, desktop, mobile), traces/screens on failure, `forbidOnly`, retries on CI
- [ ] Page objects + custom fixtures + unique-data helper with auto cleanup
- [ ] `auth.setup.ts` saving `storageState`
- [ ] 5-10 smoke tests, tagged `@smoke`
- [ ] CI workflow (manual + nightly) uploading the HTML report
- [ ] README note on how to run locally

## Common pitfalls

- **Committed `.env` or `.auth/`**: both contain secrets. They must be git-ignored.
- **Running against Production**: use the block-list guard.
- **Two elements match a locator**: Playwright throws a "strict mode violation". Scope the locator (inside a form/row) or add a test id.
- **Test passes locally, fails in CI**: slower machine, different timezone/locale, missing secret, rate limits. Look at the trace.
- **Date/time-dependent assertions**: avoid, or compute the expected value in the test.
- **Hosting protection page**: a preview login/SSO page appears instead of your app → use the platform's automation bypass header.
- **Browser dialogs** (confirm/alert) auto-dismiss unless a handler is registered; register it before the click.

---

# PART B: How it looks in the Expense Tracker

## Where things are

Everything is under `e2e/`. The app's root `tsconfig.json` and `eslint.config.mjs` exclude it.

## Test ids the app exposes (full list: docs/TESTIDS.md)

- Navigation: `side-nav-<page>`, `tab-<dashboard|expenses|income>`, `tab-more`, `sheet-nav-<page>`, `fab-add`, `sign-out`
- Auth: `auth-login` / `auth-signup` (form), `auth-email`, `auth-password`, `auth-submit`, `auth-error`
- Forms: every server-action form has `<action-name>` (kebab case), `<action-name>-submit`, `<action-name>-error`, `<action-name>-notice` (e.g. `create-expense`, `delete-expense`)
- Lists: `expense-row`, `income-row`, `expense-records`, `pager`, `pager-prev`, `pager-next`, `filter-<label>` (e.g. `filter-filter-expenses`)
- Misc: `expense-copy`, `expense-edit`, `copy-cancel`, `offline-banner`, `offline-status`, `outbox-waiting`, `spent-hint`, `mom-line`, `starter-card`, `push-*`, `notification-settings`

## App-specific facts that shape the tests

- Staging deployments may be protected by Vercel Deployment Protection. Use *Project → Settings → Deployment Protection → Protection Bypass for Automation* to create `VERCEL_BYPASS_SECRET`; the config sends it as the `x-vercel-protection-bypass` header.
- The app registers a service worker. The config blocks it so each test starts clean.
- "Delete" uses a browser `confirm()` dialog, so page objects register a dialog handler first.
- Amounts are integer minor units in the database and formatted by currency in the UI; assert on the digits (`12.50`), not the currency symbol.
- Login and other sensitive actions are rate limited; that is why the suite logs in once and keeps workers low.
- Money, dates and months depend on the test user's timezone/currency profile. Set them once on the test account.

## Running it

```bash
cd e2e
npm install
npx playwright install chromium
cp .env.example .env        # then fill in the values
npm run typecheck
npm test                    # everything
npm run test:smoke          # only @smoke tests
npm run test:ui             # interactive
npm run report              # open the HTML report
```
