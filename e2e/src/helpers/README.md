# src/helpers

Small, reusable functions and classes that are **not** page-specific and **not** tests. They should be easy to unit-reason about (no hidden browser state).

## Suggested helpers
- `test-data.ts`: a `TestData` class: builds a unique prefix per test (time + worker index + random), and `name(label)` returns `"<prefix> <label>"`. Cleanup finds data by this prefix.
- `money.ts` (later): format or parse amounts the way the app shows them (e.g. `"12.50"`), so tests never repeat the logic.
- `dates.ts` (later): today's date / month key in the test user's timezone (`YYYY-MM`), for month URLs and "future date" cases.
- `files.ts` (later): create a small CSV in a temp folder for the import tests.
- `api.ts` (later): optional shortcuts that create/delete data through the app's own pages or requests, to make tests faster.

## Rules
- No selectors here (selectors live in `pages/`).
- No `expect` assertions about app behaviour.
- Helpers may be imported by fixtures, pages and tests.
