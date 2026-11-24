# Test scenarios and test cases

Your to-do list. Write the tests one by one; tick them off as you go.

## How to read this

- **ID** = `MODULE-number`. Use the ID in the test title or a comment so you can trace tests back here (e.g. `test("EXP-01 add an expense... @smoke")`).
- **Type**: **S** = smoke (fast, must-pass check that the app basically works; tag `@smoke`), **R** = regression (deeper checks for rules, validation, edge cases).
- **Project** (which folder): `anon` = `tests/anonymous`, `app` = `tests/app` (desktop, logged in), `mob` = `tests/mobile`.
- "Expected" is behaviour you should assert. Use your own wording in the tests.
- **Data rule**: every record you create gets a unique name from your `testData` helper and is deleted by cleanup. Never depend on existing data.
- **Test account**: one dedicated Staging user (2FA off). Cases marked *needs 2nd account* or *needs 2FA account* require another Staging user created for that purpose.

## Smoke suite (run on every deployment, about 15 tests)

| Order | ID | One-line check |
|---|---|---|
| 1 | SETUP | Login works and the session is saved (`auth.setup.ts`) |
| 2 | AUTH-01 | Valid login reaches the dashboard |
| 3 | AUTH-04 | Private page redirects a signed-out visitor to login |
| 4 | AUTH-05 | Sign out returns to login and the session is really gone |
| 5 | NAV-01 | All main menu links are present for a signed-in user |
| 6 | DASH-01 | Dashboard loads with its summary cards |
| 7 | EXP-01 | Add an expense; it appears in the list |
| 8 | EXP-20 | Delete an expense; it disappears |
| 9 | EXP-30 | Search narrows the list |
| 10 | INC-01 | Add income; it appears in the list |
| 11 | BUD-01 | Set a category budget; it appears with progress |
| 12 | REP-01 | Reports page shows a month report |
| 13 | GOAL-01 | Create a savings goal; it appears |
| 14 | DEBT-01 | Create a debt; it appears |
| 15 | REC-01 | Create a recurring rule; it appears in the list |
| 16 | SET-01 | Settings opens and the profile saves |
| 17 | MOB-01 | Phone layout: tabs and More menu work |

(Everything else below is regression.)

---

## AUTH: sign in, sign out, sign up (project: `anon`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| AUTH-01 | S | Sign in with valid email and password | Lands on `/dashboard`; the menu is visible |
| AUTH-02 | R | Wrong password for a real email | Generic error shown; stays on `/login`; no hint whether the email exists |
| AUTH-03 | R | Unknown email | Same generic error as AUTH-02 (no user enumeration) |
| AUTH-04 | S | Open `/dashboard`, `/expenses`, `/settings` while signed out | Redirected to `/login` each time |
| AUTH-05 | S | Sign out, then open a private page and press browser Back | Back at login; private pages do not open; no private data shown |
| AUTH-06 | R | Submit empty form / invalid email format | Browser validation blocks submit; no request is sent |
| AUTH-07 | R | Password field is masked and has `autocomplete` set | Input type is `password` |
| AUTH-08 | R | Sign-up (Staging only): create a new account with a unique email | Account created and signed in, or redirected as designed; clean it up afterwards |
| AUTH-09 | R | Sign-up with password shorter than 12 characters | Rejected with a clear message |
| AUTH-10 | R | Sign-up with an email that already exists | Rejected without revealing sensitive details |
| AUTH-11 | R | Forgot-password page with any email | Same confirmation message whether or not the account exists |
| AUTH-12 | R | Login page links: "Create one" (when signups open) and "Forgot password" | Correct pages open |
| AUTH-13 | R | Signed-in user opens `/login` | Redirected to the dashboard (or sees the app), not a broken state |
| AUTH-14 | R | Repeated wrong logins (use a **random throwaway email**, never the tester) | Rate limit message appears after the limit |
| AUTH-15 | R | Login with 2FA enabled (*needs 2FA account*) | Asked for the 6-digit code; wrong code rejected; correct code succeeds; backup code works once |
| AUTH-16 | R | Session revoked elsewhere (*needs 2 browser contexts*) | The other context is signed out within about 30 s |

## NAV: navigation and shell (projects: `app`, `mob` for phone parts)

| ID | Type | Test case | Expected |
|---|---|---|---|
| NAV-01 | S | Check all 8 menu links on desktop | Each is visible; clicking opens the right page and heading |
| NAV-02 | R | Active link highlight | The current page's link has `aria-current="page"` |
| NAV-03 | R | Brand link | Goes to the dashboard |
| NAV-04 | R | Floating "+" button on Dashboard/Expenses | Opens Add expense; on Income opens Add income |
| NAV-05 | R | Press **N** with focus on the page body | Opens Expenses with the add form open |
| NAV-06 | R | Press **N** while typing in an input | Nothing happens (does not hijack typing) |
| NAV-07 | R | Unknown URL (`/nope`) | Friendly "not found" page, no stack trace |
| NAV-08 | R | Theme toggle (light/dark/system) | Theme changes and persists after reload |
| NAV-09 | R | Sign-out button is reachable without scrolling the page | Visible in the side menu |

## DASH: dashboard (project: `app`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| DASH-01 | S | Open the dashboard | "Overview" heading; Income, Spent, Balance, Savings rate cards visible |
| DASH-02 | R | Add an expense, return to dashboard | "Spent" total and expense count increase by that amount |
| DASH-03 | R | Add income, return | "Income" and "Balance" update; savings rate shows a value |
| DASH-04 | R | Previous-month arrow | URL gets `month=YYYY-MM`; heading shows that month |
| DASH-05 | R | Next-month arrow on the current month | Disabled (no future months) |
| DASH-06 | R | `?month=` with a future or invalid value | Falls back to the current month; no error |
| DASH-07 | R | A month with no data | Empty state with "Add expense" and "Add income" buttons that work |
| DASH-08 | R | Month-over-month line | Appears when last month had spending; reads lower/higher/same correctly (needs data in two months) |
| DASH-09 | R | Getting-started card on a **brand-new** account (*needs fresh account*) | Shows 3 steps; each link works; ticks off as done; hides when all done |
| DASH-10 | R | Charts render (Cash flow, Spending by day, By category) | SVG present; category legend matches categories used |
| DASH-11 | R | "Category detail", "Largest expenses", "Paid with" cards | Show at most 5 rows, scroll inside the card, page still scrolls |
| DASH-12 | R | Recent expenses table paging | 10 per page by default; Next/Previous work; page size 20/50 works |
| DASH-13 | R | Goals and Budgets cards | Show created goal/budget; "Manage" links go to the right pages |

## EXP: expenses (project: `app`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| EXP-01 | S | Add expense with amount, description (defaults for the rest) | Row appears with the amount and description; form clears |
| EXP-02 | R | Add with category, payment method, note | Row shows category tag and paid-with; note visible |
| EXP-03 | R | Amount empty / `abc` / `0` / negative / `12.345` / 10+ digits | Not saved; appropriate validation (browser or server message) |
| EXP-04 | R | Amount formats `5`, `5.5`, `5.50` | All accepted and shown as 2 decimals |
| EXP-05 | R | Description empty, 120 chars, 121 chars | Empty rejected; 120 saved; 121 rejected |
| EXP-06 | R | Note 500 vs 501 chars | 500 saved; 501 rejected |
| EXP-07 | R | Date: future date | Not allowed (date picker max = today) |
| EXP-08 | R | Date: earlier day in the same month, and a past month | Appears in the right month's list; shows when that month is selected |
| EXP-09 | R | Description containing HTML/script (`<img src=x onerror=...>`) | Shown as plain text; nothing executes |
| EXP-10 | R | Unicode/emoji/very long single word | Saved and displayed without breaking the layout |
| EXP-11 | R | Totals in the page header | Equal the sum of the month's rows |
| EXP-12 | R | Edit an expense (change amount, description, category) | Saved; list shows new values; currency is not editable |
| EXP-13 | R | Edit then cancel/back | No change saved |
| EXP-14 | R | Copy button | Add form opens pre-filled (amount, description, category, paid with, note), date today; "Copied from…" note shown |
| EXP-15 | R | Click Clear after Copy | Form empties |
| EXP-16 | R | Collapse the form, then Copy a different row | Form re-opens with the new row's data |
| EXP-17 | R | Submit a copied expense | New row added; original unchanged; copy note gone |
| EXP-18 | R | Match / unmatch (statement tick) | Button toggles "Match" ↔ "✓ Matched"; "Statement" filter reflects it |
| EXP-19 | R | "Paid with" summary cards | Totals per method; "not matched" amount drops after matching |
| EXP-20 | S | Delete: accept the confirm box | Row removed |
| EXP-21 | R | Delete: dismiss the confirm box | Row stays |
| EXP-22 | R | Deleting the last row of a page | Page still valid (no error), shows previous page or empty state |
| EXP-30 | S | Search by part of a description | Only matching rows remain |
| EXP-31 | R | Search by text in the note | Matching row found |
| EXP-32 | R | Search with no matches | "No expenses found" empty state |
| EXP-33 | R | Clear search with the × button | Full list returns, search box empty |
| EXP-34 | R | Search is case-insensitive; special characters (`%`, `_`, `'`) are treated literally and cause no error | Behaves predictably |
| EXP-35 | R | Filter by category | Only that category's rows |
| EXP-36 | R | Filter by paid-with | Only that method's rows |
| EXP-37 | R | Filter by statement (matched / not matched) | Correct rows |
| EXP-38 | R | Combine search + category + month | Intersection of filters |
| EXP-39 | R | Reset | All filters cleared (month kept) |
| EXP-40 | R | Month picker: past month; future month blocked | Past loads; future not selectable |
| EXP-41 | R | Applying filters updates only the records area (no full page reload) | A marker element outside the table (e.g. the form you typed in) is not recreated; no navigation event for the whole page |
| EXP-42 | R | Sort by Date, Description, Category, Amount; click again to flip | Order correct; arrow indicates direction; `aria-sort` set |
| EXP-43 | R | Pagination: create 11+ rows (use a loop in setup) | Page 1 has 10 rows; Next shows the rest; Previous returns |
| EXP-44 | R | Rows per page 20 / 50 | Table shows that many; URL keeps it |
| EXP-45 | R | Filters and sort are kept when changing page | Same filtered/sorted set on page 2 |
| EXP-46 | R | Open edit page for a random UUID | "Not found" (no data leak) |
| EXP-47 | R | Open another user's expense edit URL (*needs 2nd account*) | "Not found" |
| EXP-48 | R | Recurring-generated expense | Shows "Recurring" badge in the name cell (see REC) |
| EXP-49 | R | Badges and tags stay in the same row as the name | Layout check (name cell contains the tag) |

## INC: income (project: `app`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| INC-01 | S | Add income with amount and source | Row appears; Dashboard Income increases |
| INC-02 | R | Validation: empty/invalid amount, empty source, long source (>80), long note (>500) | Rejected with messages |
| INC-03 | R | Future date | Not allowed |
| INC-04 | R | Edit income | Updated values shown |
| INC-05 | R | Delete income (confirm/cancel) | Removed / kept |
| INC-06 | R | Month filter and pagination | Correct rows; 10 per page |
| INC-07 | R | HTML in source/note | Rendered as text |
| INC-08 | R | Other user's income id (*needs 2nd account*) | "Not found" |

## CAT: categories (Settings → Categories, project: `app`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| CAT-01 | R | Create category | Appears in settings and in expense category lists |
| CAT-02 | R | Duplicate name (also with different letter case) | Rejected |
| CAT-03 | R | Empty / 40 / 41 character name | Empty and 41 rejected; 40 saved |
| CAT-04 | R | Category colour tag | Same category always shows the same colour in tables, charts and dashboard |
| CAT-05 | R | Delete a category used by expenses | Expenses remain, now "Uncategorised"; budget for it handled |
| CAT-06 | R | Category count limit message (if you create many) | Clear limit message (optional, slow) |

## CLIENT: freelance work type and clients (project: `app`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| CLIENT-01 | R | Settings → Work type: choose Freelance, save | "Clients" appears in the menu; Salaried hides it again |
| CLIENT-02 | R | Open `/clients` while Salaried | "Freelance mode is off" with a link to settings |
| CLIENT-03 | R | Add a client with only a name | Row appears; page scrolls to it |
| CLIENT-04 | R | Add a client with every field | All values shown on the client page |
| CLIENT-05 | R | Phone: `+91 98765-43210` saved as `+919876543210`; letters, too short, too long rejected | Normalised or rejected with a message |
| CLIENT-06 | R | Email invalid / valid mixed case | Invalid rejected; valid stored lower-case |
| CLIENT-07 | R | Name empty, 80 vs 81 characters; notes 1000 vs 1001 | Boundaries enforced |
| CLIENT-08 | R | Edit a client | Changes saved and shown; cancel changes nothing |
| CLIENT-09 | R | Archive, then see it under "Archived" and not under "Active"; restore | Moves between lists |
| CLIENT-10 | R | Delete (confirm / dismiss) | Removed / kept |
| CLIENT-11 | R | Search by name, phone digits, email, city; clear with × | Correct rows; list resets |
| CLIENT-12 | R | Sort by name and added date, both directions | Order correct |
| CLIENT-13 | R | Paging (10/20/50) with more than 10 clients | Correct pages, filters kept |
| CLIENT-14 | R | HTML in name/notes | Shown as text |
| CLIENT-15 | R | Another user's client id (*needs 2nd account*) or random UUID | Not found |

## BUD: budgets (project: `app`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| BUD-01 | S | Set a monthly limit for a category | Budget card shows limit and 0 spent |
| BUD-02 | R | Add an expense in that category | Progress and spent amount update; remaining shown |
| BUD-03 | R | Spend above the limit | Shown as over budget (clear visual/text state) |
| BUD-04 | R | Spend between 80-100% | Warning state (if displayed) |
| BUD-05 | R | Change the limit | Saved; progress recalculated |
| BUD-06 | R | Delete a budget | Removed; spending moves to "Spending without a budget" |
| BUD-07 | R | Validation: empty, 0, negative, too many digits | Rejected |
| BUD-08 | R | One budget per category | Setting again updates instead of duplicating |
| BUD-09 | R | Month navigation | Spent figures follow the month |
| BUD-10 | R | Dashboard Budgets card matches the Budgets page | Same numbers |

## REC: recurring (project: `app`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| REC-01 | S | Create a monthly expense rule starting today | Rule listed with next due date |
| REC-02 | R | After creating a rule dated today, open Expenses | One expense created with "Recurring" badge (not duplicated on reload) |
| REC-03 | R | Create an income rule | Income entry generated on its due date |
| REC-04 | R | Pause and resume a rule | Status changes; paused rules create nothing |
| REC-05 | R | Edit a rule (amount, name) | Saved; future items use new values; old ones unchanged |
| REC-06 | R | Delete a rule | Rule gone; previously generated expenses remain |
| REC-07 | R | End date earlier than first date / past end date | Rejected or rule ends correctly |
| REC-08 | R | First date more than 1 year back/ahead | Rejected with message |
| REC-09 | R | Frequencies (weekly, monthly, yearly) | Next-due dates correct, including month-end (31st) clamping |
| REC-10 | R | Validation: empty name, bad amount | Rejected |

## GOAL: savings goals (project: `app`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| GOAL-01 | S | Create a goal (name, target, optional date) | Card appears; page scrolls to the new card |
| GOAL-02 | R | Validation: empty name, target 0/negative, past target date | Rejected |
| GOAL-03 | R | Add a contribution | Saved amount and percent update |
| GOAL-04 | R | Delete a contribution | Totals revert |
| GOAL-05 | R | Contribution beyond target | Handled gracefully (100% or "reached") |
| GOAL-06 | R | Edit a goal | Updated everywhere (dashboard carousel too) |
| GOAL-07 | R | Delete a goal | Card removed |
| GOAL-08 | R | Collapsible cards | Expand/collapse; long contribution lists scroll inside the card |
| GOAL-09 | R | Suggestions (emergency fund, etc.) create a goal with the suggested amount | Goal created with correct values |
| GOAL-10 | R | Calculators (e.g. buying a car): press Calculate | **Whole page does not reload**; suggestion panel stays expanded; result shown |
| GOAL-11 | R | Home deposit calculator, same as GOAL-10 | Same |
| GOAL-12 | R | Goals pagination | 10 per page (create many via loop) |
| GOAL-13 | R | Dashboard carousel | Shows goals, arrows/swipe move between them |

## PAY: job payments (project: `app`, work type Freelance)

| ID | Type | Test case | Expected |
|---|---|---|---|
| PAY-01 | S | Job with agreed 10000: add an Advance of 4000 | Received 4,000, Balance 6,000, badge "Part paid" |
| PAY-02 | R | Add the remaining balance as Final payment | Balance 0, badge "Paid in full" |
| PAY-03 | R | Pay more than agreed | Badge "Overpaid", shows the "Over by" amount |
| PAY-04 | R | Job with no agreed amount, add a payment | Badge "No price set", no balance shown |
| PAY-05 | R | Amount empty, 0, negative, 3 decimals; future date | Rejected with a clear message |
| PAY-06 | R | Add a payment, open Income for that month | Row shows type tag, job link and client name; month total includes it |
| PAY-07 | R | Dashboard income for the month | Includes the payment |
| PAY-08 | R | Delete a payment on the job page | Balance due returns; Income page no longer lists it |
| PAY-09 | R | Edit a payment's amount from the job page | Totals and badge recalculate |
| PAY-10 | R | Try to delete a job that has payments | Refused with "Cancel the job instead"; job remains |
| PAY-11 | R | Cancel a job that has an advance | Payment kept; client "Total received" still counts it |
| PAY-12 | R | Jobs list and client page Balance column | Matches the job page for each job |
| PAY-13 | R | Client page totals with two jobs | Total received and Balance due are the sums (cancelled jobs owe nothing) |
| PAY-14 | R | Second user opens the first user's job id, or posts a payment for it | Not found; nothing created |
| PAY-15 | R | Delete the account (disposable user) | Succeeds; jobs, clients and payments gone |

## COST: job costs and profit (project: `app`, work type Freelance)

| ID | Type | Test case | Expected |
|---|---|---|---|
| COST-01 | S | Job agreed 10000 with 4000 received: add Travel 500 | Costs 500, Profit so far 3,500, Profit when paid in full 9,500 |
| COST-02 | R | Add an Assistant cost with "Paid to" | Row shows the type tag and "Paid to <name>" |
| COST-03 | R | Leave "What for" empty | Description becomes "Travel" or "Assistant / helper – name" |
| COST-04 | R | Amount empty, 0, negative, 3 decimals; future date | Rejected with a clear message |
| COST-05 | R | Open Expenses for that month | Cost shows type tag, job link and client; month total includes it |
| COST-06 | R | Dashboard spent total | Includes the cost |
| COST-07 | R | Delete a cost on the job page | Costs and profit recalculate; Expenses row gone |
| COST-08 | R | Job with no agreed amount | "Profit when paid in full" shows a dash |
| COST-09 | R | Costs above received money | Profit so far is negative and shown with a minus sign |
| COST-10 | R | "See them in Expenses" on the job page | Only that job's costs, "All months" in the heading, notice with a clear link |
| COST-11 | R | Client page "Costs in Expenses" and "Payments in Income" | Only that client's jobs' entries appear |
| COST-12 | R | Paging while a job filter is on | The filter is kept on page 2 |
| COST-13 | R | Try to delete a job that has only costs | Refused with "Cancel the job instead" |
| COST-14 | R | Client page totals with two jobs | Costs and Profit are the sums |
| COST-15 | R | Second user opens `/expenses?job=<other user's job id>` or posts a cost for it | Empty list / not found; nothing created |

## CAL: calendar and double booking (project: `app`, work type Freelance)

| ID | Type | Test case | Expected |
|---|---|---|---|
| CAL-01 | S | Open Calendar with a job today | Today is highlighted; the day shows the job and a count |
| CAL-02 | R | Next / previous month, then Today | Month label changes; Today returns to the current month |
| CAL-03 | R | Click a day with two jobs | Agenda lists both, timed ones first, untimed last as "All day" |
| CAL-04 | R | Click a day with nothing | "Nothing booked this day." |
| CAL-05 | S | Two jobs on one date, 10:00-12:00 and 11:00-13:00 | Both flagged "Overlaps with"; day has a red border; job page shows "Double booking" |
| CAL-06 | R | Two jobs 10:00-12:00 and 12:00-14:00 | No warning (touching is fine) |
| CAL-07 | R | One job with no end time at 10:00, another at 11:30 | Overlap warning (2 hour default); at 12:00 no warning |
| CAL-08 | R | A job with no time and another on the same date | Soft "Same day" notice |
| CAL-09 | R | Cancel one of two clashing jobs | Warning disappears |
| CAL-10 | R | Jobs in a neighbouring month's padding days | Shown greyed in the grid; counted only in their own month |
| CAL-11 | R | Dashboard "Upcoming jobs" | Next 5 pending jobs, soonest first; completed/cancelled/past ones absent; Clash tag when two clash |
| CAL-12 | R | Salaried account opens /calendar | "Freelance mode is off" |
| CAL-13 | R | /calendar?month=bad&day=bad | Falls back to the current month without an error |
| CAL-14 | R | Phone width | Grid shows counts, not titles; agenda stacks; no horizontal scroll |
| CAL-15 | R | Second user's jobs | Never appear in the first user's calendar |

## REM: job reminders and payments due (project: `app`, work type Freelance)

| ID | Type | Test case | Expected |
|---|---|---|---|
| REM-01 | R | Settings → Notifications on a Freelance account | "Job reminders" select is visible, On by default |
| REM-02 | R | Same page on a Salaried account | No "Job reminders" select |
| REM-03 | R | Set Job reminders Off, save, reload | Choice is kept; budget and renewal choices unchanged |
| REM-04 | R | Save alert choices on a Salaried account after earlier turning jobs Off | Job reminders choice is not changed |
| REM-05 | S | Completed job, agreed 10000, paid 4000 | Appears in Payments due with balance 6,000 |
| REM-06 | R | Pay the balance | Job leaves Payments due |
| REM-07 | R | Job with no agreed price, or still Booked, or Cancelled | Never listed |
| REM-08 | R | Two due jobs | Oldest event first; total owed is the sum; "n days ago" is correct |
| REM-09 | R | Jobs page card shows at most 5 and "See all" opens the full list | Counts agree |
| REM-10 | R | No jobs owing | Card is hidden on Jobs; /jobs/due shows "Nothing is owed to you" |
| REM-11 | R | Salaried account opens /jobs/due | "Freelance mode is off" |
| REM-12 | R | Other user's jobs | Never listed |
| REM-13 | Manual | Booked job tomorrow, push enabled, trigger the cron with the secret | One notification "You have 1 job tomorrow", no names; second trigger sends nothing |
| REM-14 | Manual | Same with reminders Off, or the job Cancelled/Enquiry | No notification |
| REM-15 | Manual | Call `/api/cron/reminders` without or with a wrong secret | 401 |

## FREP: freelance dashboard and reports (project: `app`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| FREP-01 | S | Freelance account: open Overview | Freelance summary and upcoming jobs appear before the usual cards; income card says "Money in" |
| FREP-02 | S | Both account: open Overview | Income / Spent / Balance cards first; freelance summary below them; income card says "Income" |
| FREP-03 | R | Salaried account: open Overview | No freelance summary, no upcoming jobs |
| FREP-04 | R | Freelance account with no data | Checklist: client, job, payment; each tick appears when done |
| FREP-05 | S | Job agreed 10000, 4000 received, 500 cost this month | Received 4,000; Costs 500; Profit 3,500; Still owed counts the balance once the job is Completed |
| FREP-06 | R | Move the Overview to last month | Freelance figures follow the month |
| FREP-07 | R | Top clients | Largest receiver first; clicking opens the client report |
| FREP-08 | R | Reports → month with freelance data | Freelance section shown with the same period; PDF has a "Freelance work" block |
| FREP-09 | R | Reports with a category filter | Freelance section stays, with the note that it ignores the filter |
| FREP-10 | S | Client report | Totals equal the sum of its jobs; cancelled job's deposit still counts as received |
| FREP-11 | S | Client report PDF | Downloads; contains the name and money, no phone, email or notes |
| FREP-12 | S | Job report and PDF | Balance, profit, payments and costs match the job page |
| FREP-13 | R | Salaried account opens a client or job report URL | Not found |
| FREP-14 | R | Another user's client or job id | Not found; PDF route returns 404 |
| FREP-15 | R | Press Download PDF 11 times in a minute | The 11th is refused (rate limit) |

## DEBT: debt tracker (project: `app`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| DEBT-01 | S | Create a debt (type, name, total loan amount, rate, EMI, start date) | Debt card appears |
| DEBT-02 | R | Validation: empty name, 0 amount, negative rate, EMI 0 | Rejected |
| DEBT-03 | R | Add a payment (with and without interest part) | Balance decreases correctly; payment listed |
| DEBT-04 | R | Payment larger than the balance | Handled (capped or rejected, never negative balance) |
| DEBT-05 | R | Delete a payment | Balance restored |
| DEBT-06 | R | Payoff projection | Shows months to payoff and total interest that match the inputs |
| DEBT-07 | R | What-if extra payment | Projection improves (shorter time, less interest) |
| DEBT-08 | R | Edit debt | Projection and balance recalculated |
| DEBT-09 | R | Delete debt | Removed with its payments |
| DEBT-10 | R | Ordering suggestions (snowball/avalanche) if shown | Order matches the rule |
| DEBT-11 | R | Label says "Total loan amount" (not the old wording) | Text check |

## REP: reports (project: `app`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| REP-01 | S | Open Reports | Current month report with totals, category breakdown and the transactions grid |
| REP-02 | R | Period = Year | Year totals; shows the chosen year |
| REP-03 | R | Period = Date range | Only entries inside the range |
| REP-04 | R | From later than To | Rejected with a message |
| REP-05 | R | Future dates | Blocked |
| REP-06 | R | Filter by one / several categories; include "No category" | Totals and grid match; income hidden when categories filtered (as the note says) |
| REP-07 | R | Report totals equal the Expenses page for the same month | Numbers match |
| REP-08 | R | "Largest expenses" and "Paid with" cards | At most 5 rows; correct order |
| REP-09 | R | Transactions grid paging and sorting | 10 per page; same pager behaviour as Expenses |
| REP-10 | R | Filter change updates only the report body | Soft update, no whole-page reload |
| REP-11 | R | Download PDF | Response 200, `application/pdf`, file starts with `%PDF`, non-trivial size |
| REP-12 | R | PDF for a filtered report | Opens; no error; filename sensible |
| REP-13 | R | PDF rate limit (more than 10 in a minute) | Limit message instead of a file |
| REP-14 | R | Empty period | Friendly empty state; PDF still works or is disabled by design |
| REP-15 | R | Manual URL tampering (`?month=abc`, `?from=...`) | Falls back to safe defaults, no server error |

## IMP: CSV import and export (project: `app`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| IMP-01 | R | Export "This month CSV" after adding an expense | A file downloads; first line is the header; the new expense is in it |
| IMP-02 | R | Export "All CSV" | Download works; contains older months too |
| IMP-03 | R | Descriptions starting with `=`, `+`, `-`, `@` are exported safely | Cell does not start with a formula character (neutralised) |
| IMP-04 | R | Import page: choose kind (expenses/income) and format | Instructions/example match the choice |
| IMP-05 | R | Preview a valid CSV (create it in a temp file) | Shows importable count, no errors |
| IMP-06 | R | Preview a CSV with bad rows | Per-line errors listed; valid rows still counted |
| IMP-07 | R | Confirm import | Entries appear in Expenses (and clean up afterwards) |
| IMP-08 | R | Wrong file type / empty file / oversized file | Clear error, nothing imported |
| IMP-09 | R | Import income | Entries appear in Income |
| IMP-10 | R | Export or import without a session (`request` without cookies) | Redirect/401, no data |

## SET: settings (project: `app`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| SET-01 | S | Open Settings; change the display name and save | Saved; name shows in the side menu after reload |
| SET-02 | R | Country and timezone | Saved; dashboard timezone notice disappears once set |
| SET-03 | R | Change currency | Saved; entries in the old currency are noted as not included |
| SET-04 | R | Modules collapse/expand | State toggles; content hidden when collapsed |
| SET-05 | R | Change password: wrong current password | Error; nothing changes |
| SET-06 | R | New password too short / confirmation mismatch | Rejected |
| SET-07 | R | Change password successfully, sign out, sign in with new, change back (*use a throwaway account*) | Old password stops working; new one works |
| SET-08 | R | Sessions list shows this device; "sign out other devices" (*2 contexts*) | Other context loses its session |
| SET-09 | R | Enable 2FA (*needs 2FA account; compute codes with a TOTP library*) | Backup codes shown once; login now requires a code; turn off needs password |
| SET-10 | R | Share link: create for a month with N days | Link appears with expiry |
| SET-11 | R | Open the share link in a fresh context | Shows category totals only: no descriptions or notes; no login needed |
| SET-12 | R | Revoke the link | Link no longer works |
| SET-13 | R | Notifications module: push not configured on Staging | Shows "not set up" message; alert-choice form saves (budget/renewals on/off) and persists |
| SET-14 | R | "Clear offline data on this device" | Confirmation, then success note |
| SET-15 | R | Delete account (*disposable account only, never the main tester*) | Needs confirmation; account and data gone; login fails afterwards |
| SET-16 | R | Hash links (`/settings#profile`, `#notifications`) | Page opens at the right module |

## SHARE: public share page (project: `anon`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| SHARE-01 | R | Valid link (created in a setup step) | Totals by category; no descriptions/notes; no login prompt |
| SHARE-02 | R | Random UUID / garbage id | "Not found" |
| SHARE-03 | R | Revoked or expired link | "Not found"/expired message |
| SHARE-04 | R | Response headers | `X-Robots-Tag: noindex`, no private data in HTML source |

## OFF: offline and PWA (later: own project that allows the service worker)

| ID | Type | Test case | Expected |
|---|---|---|---|
| OFF-01 | R | Visit main pages online, wait for caching, go offline (`context.setOffline(true)`), open them | Saved pages open; offline banner shows |
| OFF-02 | R | "Showing data from …" time in the banner | Present and plausible |
| OFF-03 | R | Open a page never visited, offline | "You are offline" page, not a crash |
| OFF-04 | R | Add an expense offline | "Saved on this device" notice; banner shows 1 waiting |
| OFF-05 | R | Go back online | Entry syncs, banner clears, row appears, **only once** |
| OFF-06 | R | Offline entry that the server rejects (e.g. category deleted meanwhile) | Banner shows the failure with Retry / Discard |
| OFF-07 | R | Sign out with entries waiting | Confirm prompt; after signing out caches and queue are gone |
| OFF-08 | R | Second user signs in on the same browser profile | Previous user's saved pages are not visible |
| OFF-09 | R | Manifest and icons reachable; shortcuts present | `/manifest.webmanifest` 200 with name, icons, two shortcuts |
| OFF-10 | R | `/sw.js` served with no-cache and scope `/` | Headers correct |

## SEC: security checks (mix of projects)

| ID | Type | Test case | Expected |
|---|---|---|---|
| SEC-01 | R | Every private route while signed out | Redirect to login (list them in a data-driven test) |
| SEC-02 | R | Another user's record URLs (*needs 2nd account*) | Not found for expenses, income, goals, debts, rules |
| SEC-03 | R | Response headers on pages | CSP present with a nonce, `X-Frame-Options: DENY`, `nosniff`, HSTS, no `X-Powered-By` |
| SEC-04 | R | Session cookie flags (`context.cookies()`) | `HttpOnly`, `Secure`, `SameSite` set |
| SEC-05 | R | No inline-style or script violations in the console on key pages | Console clean (listen to `page.on("console")`) |
| SEC-06 | R | Cron endpoint `/api/cron/reminders` without/with wrong secret | 401 both times |
| SEC-07 | R | `/api/session-check` without cookies | 401 |
| SEC-08 | R | Stored XSS strings in every text field you used | Always shown as text |
| SEC-09 | R | Direct request to `/reports/pdf` and `/expenses/export` without login | Redirect/401, no file |
| SEC-10 | R | Server error pages leak nothing (no stack traces, no SQL/Prisma text) | Generic message with a reference only |

## MOB: phone layout (project: `mob`)

| ID | Type | Test case | Expected |
|---|---|---|---|
| MOB-01 | S | Bottom tabs (Dashboard, Expenses, Income) and More | Tabs visible; More opens a sheet with other pages and Sign out |
| MOB-02 | R | Sheet scrolls with the Sign out button reachable (not hidden behind the bar) | Visible and clickable |
| MOB-03 | R | Tables on a phone become cards with labelled values | Labels such as Date/Amount shown per row |
| MOB-04 | R | Add expense on a phone | Works end to end |
| MOB-05 | R | Page has no horizontal scrolling (`scrollWidth <= clientWidth`) on each main page | True |
| MOB-06 | R | Floating "+" does not cover important controls | Visible and tappable |
| MOB-07 | R | Dashboard cards stack in a single column | Layout check |

## A11Y: accessibility (add later)

| ID | Type | Test case | Expected |
|---|---|---|---|
| A11Y-01 | R | Keyboard only: sign in and add an expense | Possible using Tab/Enter; focus visible |
| A11Y-02 | R | Automated scan with `@axe-core/playwright` on Login, Dashboard, Expenses | No serious or critical violations |
| A11Y-03 | R | Form errors are announced (`role="alert"`) | Present |

## Out of scope for automation (test manually)

- Real push-notification delivery to a phone (needs VAPID keys, browser permission prompts, a real device).
- Real email (password reset, verification): the app runs in no-email mode.
- Visual quality of charts/PDF layout (use manual review or screenshot comparison later).
- Production data or any action on the Production site.

## Suggested order of writing

1. Setup + AUTH-01, 04, 05 → NAV-01 → DASH-01
2. EXP-01, 20, 30 (smoke) → rest of EXP in the order above
3. INC, BUD, REC, GOAL, DEBT, REP smoke cases, then their regression cases
4. SET, SHARE, IMP
5. MOB, SEC
6. OFF (new project in the config), A11Y

## UI-01..06 Elevate look and report picker (v0.7.2)
- UI-01 Reports shows Period / Client / Job buttons; Client and Job open a dropdown
- UI-02 Choosing a client shows its report in place with a PDF button that downloads a PDF
- UI-03 Choosing a job does the same
- UI-04 App bar search sends you to Expenses filtered by the text (desktop)
- UI-05 No horizontal scroll at 390px and 1280px on every page
- UI-06 Active sidebar item is highlighted; mobile bottom bar shows the active tab

## UI-07..12 Finance-SaaS look (v0.8.0)
- UI-07 Sidebar shows Main menu and Manage groups; only the open page is dark
- UI-08 At 1280x720 the sidebar footer (theme, Sign out) is visible; with many pages the menu scrolls on its own
- UI-09 Dashboard KPI row has no card alone on a row at 1920, 1366, 1280, 768, 390, 360 wide
- UI-10 Expenses filters line up; Apply is reachable at every width
- UI-11 No horizontal page scroll at the six widths, light and dark
- UI-12 Theme Light/Dark/System changes every page

## UI-13..14 Grid row buttons and accents (v0.8.2)
- UI-13 In every grid record the action buttons share one height and one centre line, desktop and phone
- UI-14 Overview: Balance card is the green hero card; income, spending, balance and savings tiles show their colour accent in light and dark

## CSV-01..04, HIS-01..04 (v0.8.3)
- CSV-01 Clients Export CSV downloads a file with only your clients; names with commas are quoted
- CSV-02 Jobs Export CSV includes agreed, received and balance; cancelled jobs show balance 0
- CSV-03 A second user never sees your clients or jobs in an export
- CSV-04 Export is rate limited (10 per hour, shared with the expense export)
- HIS-01 Where clients come from lists sources with counts; blank sources show Not recorded
- HIS-02 Busiest months shows at most 3 months from the last 12, most booked first
- HIS-03 Client History lists jobs newest first with year headings and money received
- HIS-04 Freelance-only accounts see the Income page titled Client payments
