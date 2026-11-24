import Link from "next/link";
import { materializeRecurring } from "@/lib/recurring";
import { listBudgets, monthRange, monthTotalsByCategory } from "@/lib/queries";
import { getDashboardData, getLifetimeCounts, getMonthHighlights, listRecentExpenses } from "@/lib/finance-queries";
import { paymentLabel } from "@/lib/payment-method";
import { CardHead } from "@/components/cards/CardHead";
import { CategoryDetailCard, PaymentMethodsCard, TopExpensesCard } from "@/components/cards/ListCards";
import { listGoals } from "@/lib/goal-queries";
import { monthlyNeeded, percent } from "@/lib/goal-math";
import { formatMoney, monthLabel } from "@/lib/money";
import { addMonthsKey } from "@/lib/chart-math";
import { getUserToday, getUserPrefs } from "@/lib/preferences";
import { upcomingJobs } from "@/lib/job-queries";
import { freelanceLifetime, freelanceSummary, outstanding } from "@/lib/freelance-queries";
import { FreelanceSummary } from "@/components/FreelanceSummary";
import { clashingIds } from "@/lib/cal-math";
import { formatDay, timeRangeLabel } from "@/lib/job-math";
import { monthSchema } from "@/lib/validation";
import { parsePaging } from "@/lib/paging";
import { compareSpending, momText } from "@/lib/mom-math";
import { DonutChart } from "@/components/charts/DonutChart";
import { AreaChart } from "@/components/charts/AreaChart";
import { DailyBars } from "@/components/charts/DailyBars";
import { Ring } from "@/components/charts/Ring";
import { GoalCarousel } from "@/components/GoalCarousel";
import { Pager } from "@/components/Pager";
import { CategoryTag } from "@/components/CategoryTag";
import { colorClass } from "@/lib/category-color";
import {
  IconArrowDown,
  IconArrowRight,
  IconArrowUp,
  IconChevronLeft,
  IconChevronRight,
  IconInbox,
  IconScale,
} from "@/components/icons";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  // Create anything that fell due since the last visit before reading the data.
  await materializeRecurring();
  const today = await getUserToday();
  const prefs = await getUserPrefs();
  const upcoming = prefs.workMode === "SALARIED" ? [] : await upcomingJobs(today.iso, 5);
  const upcomingClash = clashingIds(upcoming.map((j) => ({ id: j.id, eventDate: j.eventDate.toISOString().slice(0, 10), startTime: j.startTime, endTime: j.endTime, status: j.status })));
  // Query strings are untrusted: validate, fall back to safe defaults.
  const rawMonth = monthSchema.safeParse(Array.isArray(sp.month) ? sp.month[0] : sp.month);
  const month = rawMonth.success && rawMonth.data <= today.month ? rawMonth.data : today.month;
  const { page, perPage } = parsePaging(sp, { pageKey: "ep", sizeKey: "epp" });

  const [data, budgets, totals, goals, recent, highlights, lifetime] = await Promise.all([
    getDashboardData(month),
    listBudgets(),
    monthTotalsByCategory(month),
    listGoals(12),
    listRecentExpenses(month, page, perPage),
    getMonthHighlights(month),
    getLifetimeCounts(),
  ]);

  const { currency } = data;
  const net = data.incomeMinor - data.spentMinor;
  const rate = data.incomeMinor > 0 ? Math.round((net / data.incomeMinor) * 100) : null;
  const href = (m: string) => `/dashboard?month=${m}`;

  const spent = new Map<string, number>();
  for (const t of totals) {
    if (t.categoryId) spent.set(`${t.categoryId}|${t.currency}`, t._sum.amountMinor ?? 0);
  }
  const shownBudgets = budgets.filter((b) => b.currency === currency);
  const prevSpent = data.trend.spent.length >= 2 ? (data.trend.spent[data.trend.spent.length - 2] ?? 0) : 0;
  const momLine = momText(compareSpending(data.spentMinor, prevSpent), monthLabel(addMonthsKey(month, -1)));
  const mode = prefs.workMode;
  const flData = mode === "SALARIED" ? null : await Promise.all([freelanceSummary(monthRange(month)), outstanding(), mode === "FREELANCE" ? freelanceLifetime() : Promise.resolve(null)]);
  const fl = flData?.[0] ?? null;
  const owed = flData?.[1] ?? null;
  const life = flData?.[2] ?? null;
  const salariedSteps = [
    { done: lifetime.expenses > 0, label: "Add your first expense", href: "/expenses?add=1" },
    { done: budgets.length > 0, label: "Set a monthly budget for a category", href: "/budgets?add=1" },
    { done: goals.length > 0, label: "Create a savings goal", href: "/goals" },
  ];
  // Freelance accounts get a work-first checklist; Salaried and Both keep the money-basics one.
  const freelanceSteps = [
    { done: (life?.clients ?? 0) > 0, label: "Add your first client", href: "/clients?add=1" },
    { done: (life?.jobs ?? 0) > 0, label: "Add a job", href: "/jobs?add=1" },
    { done: (life?.payments ?? 0) > 0, label: "Record a client payment on a job", href: "/jobs" },
  ];
  const steps = prefs.workMode === "FREELANCE" ? freelanceSteps : salariedSteps;
  const showStarter = steps.some((s) => !s.done);
  const empty = data.expenseCount === 0 && data.incomeMinor === 0;

  const upcomingCard = fl ? (
        <div className="card section" data-testid="upcoming-jobs">
          <div className="card-head">
            <h2>Upcoming jobs</h2>
            <Link className="btn soft small" href="/calendar" data-testid="upcoming-calendar">Calendar</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted">No upcoming jobs. <Link href="/jobs?add=1">Add a job</Link></p>
          ) : (
            <ul className="agenda">
              {upcoming.map((j) => (
                <li key={j.id} data-testid="upcoming-job">
                  <span className="agenda-time">{formatDay(j.eventDate)}</span>
                  <span className="name-block">
                    <span className="name-cell">
                      <Link className="nm" href={`/jobs/${j.id}`}>{j.title}</Link>
                      {upcomingClash.has(j.id) && <span className="tag st-overdue">Clash</span>}
                    </span>
                    <span className="muted note">{j.client.name}{timeRangeLabel(j.startTime, j.endTime) ? ` · ${timeRangeLabel(j.startTime, j.endTime)}` : ""}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
  ) : null;
  const freelanceBlock = fl ? (
    <>
      <FreelanceSummary s={fl} periodLabel={monthLabel(month)} outstanding={owed} testId="dash-freelance" />
      {upcomingCard}
    </>
  ) : null;

  const carousel = goals.map((g) => {
    const per = monthlyNeeded(Math.max(g.targetMinor - g.savedMinor, 0), g.targetDate, today.date);
    return {
      id: g.id,
      name: g.name,
      savedText: formatMoney(g.savedMinor, g.currency),
      targetText: formatMoney(g.targetMinor, g.currency),
      pct: percent(g.savedMinor, g.targetMinor),
      note: g.targetDate
        ? `By ${g.targetDate.toISOString().slice(0, 10)}${per !== null ? ` · about ${formatMoney(per, g.currency)} a month` : ""}`
        : "",
    };
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p>Your money in {monthLabel(month)}</p>
        </div>
        <div className="month-nav" aria-label="Choose month">
          <Link href={href(addMonthsKey(month, -1))} aria-label="Previous month"><IconChevronLeft /></Link>
          <span className="current">{monthLabel(month)}</span>
          <Link
            href={href(addMonthsKey(month, 1))}
            aria-label="Next month"
            aria-disabled={month >= today.month}
            tabIndex={month >= today.month ? -1 : undefined}
          >
            <IconChevronRight />
          </Link>
        </div>
      </div>

      {!prefs.timezoneSet && (
        <p className="notice" role="note">
          Your timezone is not set, so dates use UTC. <Link href="/settings#profile">Set it in your profile</Link> so
          today, months and recurring items follow your local time.
        </p>
      )}
      {data.otherCurrencyEntries > 0 && (
        <p className="notice" role="note">
          {data.otherCurrencyEntries} older {data.otherCurrencyEntries === 1 ? "entry is" : "entries are"} recorded in another
          currency and {data.otherCurrencyEntries === 1 ? "is" : "are"} not included below. Your currency is {currency};
          change it in <Link href="/settings#preferences">Settings</Link>.
        </p>
      )}

      {showStarter && (
        <div className="card section starter" data-testid="starter-card">
          <h2>Getting started</h2>
          <ul className="starter-list">
            {steps.map((s) => (
              <li key={s.label} className={s.done ? "done" : undefined}>
                <span className="check" aria-hidden="true">{s.done ? "✓" : "○"}</span>
                {s.done ? <span>{s.label}</span> : <Link href={s.href}>{s.label}</Link>}
              </li>
            ))}
            <li>
              <span className="check" aria-hidden="true">○</span>
              <Link href="/settings#notifications">Turn on alerts and install the app (optional)</Link>
            </li>
          </ul>
        </div>
      )}

      {mode === "FREELANCE" && freelanceBlock}

      <div className="grid stats section">
        <div className="card stat income">
          <span className="label"><span className="pill-icon income"><IconArrowDown /></span>{mode === "FREELANCE" ? "Money in" : "Income"}</span>
          <span className="value">{formatMoney(data.incomeMinor, currency)}</span>
          <span className="hint">{mode === "FREELANCE" ? "Client payments and other income" : "Money received"}</span>
        </div>
        <div className="card stat spend">
          <span className="label"><span className="pill-icon spend"><IconArrowUp /></span>Spent</span>
          <span className="value">{formatMoney(data.spentMinor, currency)}</span>
          <span className="hint" data-testid="spent-hint">
            {data.expenseCount} expense{data.expenseCount === 1 ? "" : "s"}
            {momLine ? <><br /><span data-testid="mom-line">{momLine}</span></> : null}
          </span>
        </div>
        <div className={`card stat ${net >= 0 ? "pos" : "neg"}`}>
          <span className="label"><span className="pill-icon net"><IconScale /></span>Balance</span>
          <span className="value">{formatMoney(net, currency)}</span>
          <span className="hint">Income minus spending</span>
        </div>
        <div className="card stat with-ring">
          <div className="stat-text">
            <span className="label">Savings rate</span>
            <span className="value">{rate === null ? "–" : `${rate}%`}</span>
            <span className="hint">{rate === null ? "Add income to see this" : "Of income kept"}</span>
          </div>
          <Ring percent={rate ?? 0} tone={rate !== null && rate < 0 ? "neg" : "pos"} label={rate === null ? "No savings rate yet" : `Savings rate ${rate}%`} />
        </div>
      </div>

      {mode === "BOTH" && freelanceBlock}

      {empty && (
        <div className="card section">
          <div className="empty">
            <IconInbox />
            <strong>Nothing recorded for {monthLabel(month)}</strong>
            <span>Add an expense or some income to see your charts.</span>
            <div className="actions">
              <Link className="btn" href="/expenses?add=1">Add expense</Link>
              <Link className="btn ghost" href="/income?add=1">Add income</Link>
            </div>
          </div>
        </div>
      )}

      {!empty && (
        <>
          <div className="grid two section equal">
            <div className="card panel">
              <CardHead title="Cash flow">
                <div className="key">
                  <span><i className="dot income" />Income</span>
                  <span><i className="dot spend" />Spent</span>
                </div>
              </CardHead>
              <div className="card-body"><AreaChart months={data.trend.months} income={data.trend.income} spent={data.trend.spent} currency={currency} /></div>
            </div>
            <div className="card panel">
              <CardHead title="Spending by day" />
              <div className="card-body"><DailyBars daily={data.daily} month={month} currency={currency} /></div>
            </div>
          </div>

          <div className="grid two section equal">
            <div className="card panel">
              <CardHead title="By category" />
              <div className="card-body">
                {data.categories.length === 0 ? (
                  <p className="muted">No expenses this month.</p>
                ) : (
                  <DonutChart items={data.categories} currency={currency} />
                )}
              </div>
            </div>
            {data.categories.length > 0 ? (
              <CategoryDetailCard
                categories={data.categories.map((c) => ({ label: c.label, color: c.color, value: c.value, count: c.count })).sort((x, y) => y.value - x.value)}
                spentMinor={data.spentMinor}
                currency={currency}
              />
            ) : (
              <div className="card panel"><CardHead title="Category detail" /><p className="muted">No expenses this month.</p></div>
            )}
          </div>

          <div className="grid two section equal">
            <TopExpensesCard rows={highlights.top} currency={currency} />
            <PaymentMethodsCard rows={highlights.payments.map((p) => ({ label: paymentLabel(p.method), count: p.count, value: p.value }))} currency={currency} />
          </div>

          <div className="grid two section equal">
            <div className="card panel">
              <CardHead title="Savings goals">
                <Link className="btn soft small" href="/goals">Manage <IconArrowRight /></Link>
              </CardHead>
              {carousel.length > 0 ? (
                <GoalCarousel goals={carousel} />
              ) : (
                <div className="empty compact">
                  <strong>No goals yet</strong>
                  <span>Set a target and track your progress.</span>
                  <Link className="btn small" href="/goals">Create a goal</Link>
                </div>
              )}
            </div>
            <div className="card panel">
              <CardHead title="Budgets">
                <Link className="btn soft small" href="/budgets">Manage <IconArrowRight /></Link>
              </CardHead>
              {shownBudgets.length === 0 ? (
                <div className="empty compact">
                  <strong>No budgets yet</strong>
                  <span>Set a monthly limit for a category.</span>
                  <Link className="btn small" href="/budgets?add=1">Set a budget</Link>
                </div>
              ) : (
                <div className="budget-list hide-scroll">
                  {shownBudgets.map((b) => {
                    const used = spent.get(`${b.category.id}|${b.currency}`) ?? 0;
                    const over = used > b.amountMinor;
                    const pct = Math.round((used * 100) / b.amountMinor);
                    return (
                      <div key={b.id} className="budget">
                        <div className="row between">
                          <CategoryTag name={b.category.name} color={b.category.color} />
                          <span className={over ? "error" : "muted"}>
                            {formatMoney(used, b.currency)} of {formatMoney(b.amountMinor, b.currency)} ({pct}%)
                          </span>
                        </div>
                        {/* <progress> instead of a styled div: the CSP forbids inline style attributes. */}
                        <progress
                          className={`${over ? "over " : ""}${colorClass(b.category.color)}`}
                          max={b.amountMinor}
                          value={Math.min(used, b.amountMinor)}
                          aria-label={`${b.category.name} budget used`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {recent.rows.length > 0 && (
        <div className="card section" id="latest">
          <CardHead title="Expenses this month">
            <Link className="btn soft small" href={`/expenses?month=${month}`}>See all <IconArrowRight /></Link>
          </CardHead>
          <table className="responsive">
            <tbody>
              {recent.rows.map((e) => (
                <tr key={e.id}>
                  <td data-label="Expense">
                    <span>{e.description}<div className="muted">{e.spentOn.toISOString().slice(0, 10)}</div></span>
                  </td>
                  <td data-label="Category"><CategoryTag name={e.category?.name} color={e.category?.color} /></td>
                  <td className="num" data-label="Amount">{formatMoney(e.amountMinor, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager
            basePath="/dashboard"
            params={{ month }}
            page={page}
            perPage={perPage}
            hasNext={recent.hasNext}
            rowCount={recent.rows.length}
            pageKey="ep"
            sizeKey="epp"
            anchor="latest"
          />
        </div>
      )}
    </>
  );
}
