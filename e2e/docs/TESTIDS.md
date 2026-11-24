# data-testid reference

Use with `page.getByTestId("...")` (the config sets `testIdAttribute: "data-testid"`).

Prefer, in order: **test id → role → label → text**. When a form has a test id, scope inside it (`form.getByLabel("Amount")`) so labels such as "Category" that appear in two forms on one page do not clash.

## Navigation and shell

| Test id | Where |
|---|---|
| `side-nav-dashboard`, `-expenses`, `-income`, `-budgets`, `-reports`, `-debts`, `-recurring`, `-goals`, `-settings` | Desktop side menu links |
| `tab-dashboard`, `tab-expenses`, `tab-income` | Phone bottom tab bar |
| `tab-more` | Phone "More" button |
| `sheet-nav-budgets`, `-reports`, `-debts`, `-recurring`, `-goals`, `-settings` | Links inside the phone "More" sheet |
| `fab-add` | Floating "+" (Dashboard/Expenses/Income pages) |
| `sign-out` | Sign out button (side menu on desktop, "More" sheet on phone) |
| `offline-banner`, `offline-status`, `outbox-waiting` | Offline/sync banner and its parts |

## Auth

| Test id | Element |
|---|---|
| `auth-login` / `auth-signup` | The form |
| `auth-name` (sign-up only), `auth-email`, `auth-password`, `auth-submit`, `auth-error` | Fields, button, error text |
| `forgot-password`, `forgot-password-submit`, `forgot-password-sent` | Forgot-password form / confirmation |
| `reset-password`, `reset-password-submit`, `reset-password-error` | Reset-password form |
| `two-factor-login`, `two-factor-code`, `two-factor-submit`, `two-factor-error` | 2FA sign-in step |
| `two-factor-start`, `two-factor-confirm`, `two-factor-regenerate`, `two-factor-turn-off` | Settings → 2FA forms |
| `change-password`, `change-password-submit`, `change-password-message` | Settings → change password |

## Generic pattern for forms that run a server action

Every such form has **`<action>`**, **`<action>-submit`**, **`<action>-error`** (shown on failure) and **`<action>-notice`** (shown after an offline save).

Actions: `create-expense`, `delete-expense`, `set-reconciled`, `update-expense`, `create-income`, `delete-income`, `update-income`, `set-budget`, `delete-budget`, `create-rule`, `update-rule`, `toggle-rule`, `delete-rule`, `create-goal`, `update-goal`, `delete-goal`, `add-contribution`, `delete-contribution`, `create-debt`, `update-debt`, `delete-debt`, `add-debt-payment`, `delete-debt-payment`, `create-category`, `delete-category`, `create-share`, `revoke-share`, `set-currency`, `update-profile`, `revoke-session`, `revoke-other-sessions`, `delete-account`, `set-notify-prefs`.

Several forms with the same id can exist on one page (one per row). Narrow with `.filter({ hasText })` or scope inside the row.

## Lists, filters, paging

| Test id | Element |
|---|---|
| `expense-row`, `income-row` | One table row each |
| `expense-records` | The expenses table card |
| `expense-edit`, `expense-copy`, `copy-cancel` | Row buttons / the "Clear" link after Copy |
| `filter-filter-expenses` | Expenses filter form (SoftForm testids are `filter-<label as kebab>`) |
| `filter-report-filters`, `report-period`, `report-submit` | Reports filter form, period select, Show report |
| `pager`, `pager-prev`, `pager-next` | Pagination |

## Dashboard and settings

| Test id | Element |
|---|---|
| `spent-hint`, `mom-line` | "Spent" card hint and month-over-month line |
| `starter-card` | Getting-started checklist |
| `notification-settings`, `push-enable`, `push-disable`, `push-test`, `clear-offline` | Settings → Notifications & offline |

## Clients (v0.6.0)

`create-client`, `update-client`, `delete-client`, `set-client-archived` (+ `-submit`, `-error`), `client-row`, `client-view`, `client-edit`, `client-records`, `client-details`, `client-jobs`, `freelance-off`, `filter-filter-clients`, `set-work-mode`, menu link `side-nav-clients` / `sheet-nav-clients`.

## Jobs (v0.6.1)

`create-job`, `update-job`, `set-job-status`, `cancel-job`, `reopen-job`, `delete-job` (+ `-submit`, `-error`), `job-row`, `job-status`, `job-view`, `job-edit`, `job-details`, `job-money`, `job-records`, `job-summary`, `job-count-completed`, `job-count-pending`, `job-count-cancelled`, `client-add-job`, `client-job-row`, `client-jobs`, menu link `side-nav-jobs` / `sheet-nav-jobs`.

## Job payments (v0.6.2)

`add-job-payment` (+ `-submit`, `-error`), `pay-status`, `pay-summary`, `pay-agreed`, `pay-received`, `pay-balance`, `payment-row`, `payment-edit`, `job-balance` (Jobs list), `client-money`, `client-paid`, `client-due`, and on the Income page `payment-kind`, `payment-job`. Deleting a payment uses `delete-income`.

## Job costs and profit (v0.6.3)

`add-job-cost` (+ `-submit`, `-error`), `job-costs`, `cost-summary`, `cost-total`, `profit-now`, `profit-expected`, `cost-row`, `cost-edit`, `job-income-link`, `job-expenses-link`, `client-costs`, `client-profit`, `client-income-link`, `client-expenses-link`; on Expenses `cost-kind`, `cost-job`, `expense-job-filter`, `expense-job-filter-clear`; on Income `income-job-filter`, `income-job-filter-clear`. Deleting a cost uses `delete-expense`.

## Calendar (v0.6.4)

`calendar`, `cal-day` (has `data-date="YYYY-MM-DD"`), `cal-count`, `cal-prev`, `cal-next`, `cal-today`, `cal-add-job`, `cal-agenda`, `cal-agenda-add`, `agenda-item`, `agenda-clash`; job page `double-booking`, `double-booking-calendar`; dashboard `upcoming-jobs`, `upcoming-job`, `upcoming-calendar`; menu `side-nav-calendar` / `sheet-nav-calendar`.

## Reminders and payments due (v0.6.5)

`notify-jobs` (Settings select inside `set-notify-prefs`), Jobs page `due-card`, `due-card-row`, `due-see-all`; `/jobs/due`: `due-list`, `due-row`, `due-count`, `due-total`, `due-back`. The push itself cannot be asserted in Playwright; test the preference and the lists.

## Import

`import-kind`, `import-format`, `import-file`, `import-preview`, `import-confirm`, `import-error`, `import-notice`.

## Not covered by test ids yet (ask if you need them)

Charts, goal calculators and suggestion cards, report summary cards and "Download PDF" link, budget progress bars, settings module headers, the public share page. Until then use role/label/text locators. If a locator is awkward, that is a signal to add a test id to the app (a tiny change).
