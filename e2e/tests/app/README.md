# tests/app

Feature tests that start **logged in** on a desktop-size browser (project `desktop`). One spec file per module, e.g. `dashboard.spec.ts`, `expenses.spec.ts`, `income.spec.ts`, `budgets.spec.ts`, `reports.spec.ts`, `debts.spec.ts`, `recurring.spec.ts`, `goals.spec.ts`, `settings.spec.ts`, `import-export.spec.ts`.

Every test creates its own data with the `testData` fixture and cleans up afterwards.
