import Link from "next/link";
import { materializeRecurring } from "@/lib/recurring";
import { listBudgets, monthRange, monthTotalsByCategory } from "@/lib/queries";
import { getDashboardData, getLifetimeCounts, getMonthHighlights, listRecentExpenses } from "@/lib/finance-queries";
import { paymentLabel } from "@/lib/payment-method";
import { CardHead } from "@/components/cards/CardHead";
import { CategoryDetailCard, TopExpensesCard } from "@/components/cards/ListCards";
import { listGoals } from "@/lib/goal-queries";
import { monthlyNeeded, percent } from "@/lib/goal-math";
import { formatMoney, monthLabel } from "@/lib/money";
import { addMonthsKey } from "@/lib/chart-math";
import { getUserToday, getUserPrefs } from "@/lib/preferences";
import { upcomingJobs } from "@/lib/job-queries";
import { freelanceLifetime, freelanceSummary, outstanding } from "@/lib/freelance-queries";
import { FreelanceSummary } from "@/components/FreelanceSummary";
import { Slider } from "@/components/Slider";
import { PaidWithCarousel, type PaidWithItem } from "@/components/PaidWithCarousel";
import { clashingIds } from "@/lib/cal-math";
import { timeRangeLabel } from "@/lib/job-math";
import { monthSchema } from "@/lib/validation";
import { compareSpending, momText } from "@/lib/mom-math";
import { DonutChart } from "@/components/charts/DonutChart";
import { AreaChart } from "@/components/charts/AreaChart";
import { DailyBars } from "@/components/charts/DailyBars";
import { Ring } from "@/components/charts/Ring";
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

const EXPENSES_SHOWN = 5;

const shortDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  // Create anything that fell due since the last visit before reading the data.
  await materializeRecurring();
  const [today, prefs] = await Promise.all([getUserToday(), getUserPrefs()]);
  // Every upcoming job is shown in the slider, so take a generous window.
  const upcoming = prefs.workMode === "SALARIED" ? [] : await upcomingJobs(today.iso, 50);
  const upcomingClash = clashingIds(upcoming.map((j) => ({ id: j.id, eventDate: j.eventDate.toISOString().slice(0, 10), startTime: j.startTime, endTime: j.endTime, status: j.status })));
  // Query strings are untrusted: validate, fall back to safe defaults.
  const rawMonth = monthSchema.safeParse(Array.isArray(sp.month) ? sp.month[0] : sp.month);
  const month = rawMonth.success && rawMonth.data <= today.month ? rawMonth.data : today.month;

  const [data, budgets, totals, goals, recent, highlights, lifetime] = await Promise.all([
    getDashboardData(month),
    listBudgets(),
    monthTotalsByCategory(month),
    listGoals(12),
    listRecentExpenses(month, 1, EXPENSES_SHOWN),
    getMonthHighlights(month),
    getLifetimeCounts(),
  ]);

  const { currency } = data;
  const net = data.incomeMinor - data.spentMinor;
  const rate = data.incomeMinor > 0 ? Math.round((net / data.incomeMinor) * 100) : null;
  const href = (m: string) => `/dashboard?month=${m}`;

  // Greeting from the user's own clock, so "morning" means morning where they live.
  const firstName = prefs.name.trim().split(" ")[0] || "there";
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: today.timezone }).format(new Date())) % 24;
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

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
    <div className="card section record-card" data-testid="upcoming-jobs">
      <div className="card-head">
        <h2>Upcoming jobs</h2>
        <Link className="btn soft small" href="/calendar" data-testid="upcoming-calendar">Calendar</Link>
      </div>
      {upcoming.length === 0 ? (
        <div className="empty compact">
          <span className="muted">No upcoming jobs yet.</span>
          <Link className="btn small" href="/jobs?add=1">Add a job</Link>
        </div>
      ) : (
        <Slider label="upcoming job">
          {upcoming.map((j) => {
            const d = new Date(`${j.eventDate.toISOString().slice(0, 10)}T00:00:00Z`);
            const time = timeRangeLabel(j.startTime, j.endTime);
            return (
              <div key={j.id} className="slide" data-testid="upcoming-job">
                <div className="job-row">
                  <span className="date-tile" aria-hidden="true">
                    <strong>{d.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" })}</strong>
                    <span>{d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}</span>
                  </span>
                  <span className="job-main">
                    <span className="nm-plain">{j.title}</span>
                    <span className="sub">{j.client.name}{time ? ` · ${time}` : ""}</span>
                  </span>
                  <span className="job-side">
                    {upcomingClash.has(j.id) && <span className="tag st-overdue">Clash</span>}
                    <Link className="btn soft small" href={`/jobs/${j.id}`} data-testid="upcoming-open">Open</Link>
                  </span>
                </div>
              </div>
            );
          })}
        </Slider>
      )}
    </div>
  ) : null;
  const freelanceBlock = fl ? (
    <>
      <FreelanceSummary s={fl} periodLabel={monthLabel(month)} outstanding={owed} testId="dash-freelance" />
      {upcomingCard}
    </>
  ) : null;

  // Goals use the same slide shape as budgets: figure, progress, then two facts.
  const goalSlides = goals.map((g) => {
    const toGo = Math.max(g.targetMinor - g.savedMinor, 0);
    const per = g.targetDate ? monthlyNeeded(toGo, g.targetDate, today.date) : null;
    return {
      id: g.id,
      name: g.name,
      savedText: formatMoney(g.savedMinor, g.currency),
      targetText: formatMoney(g.targetMinor, g.currency),
      pct: percent(g.savedMinor, g.targetMinor),
      toGoText: formatMoney(toGo, g.currency),
      // Second fact: what it needs each month if there is a date, otherwise the date itself.
      secondLabel: per !== null ? "A month" : "By",
      secondText: per !== null ? formatMoney(per, g.currency) : g.targetDate ? shortDate(g.targetDate) : "No date",
    };
  });

  // Paid with: every method used this month, plus "Not set", each with its share of spending.
  const paidWith: PaidWithItem[] = highlights.payments
    .filter((p) => p.value > 0)
    .map((p) => ({
      method: p.method,
      label: paymentLabel(p.method),
      count: p.count,
      valueText: formatMoney(p.value, currency),
      share: data.spentMinor > 0 ? Math.round((p.value * 100) / data.spentMinor) : 0,
    }));

  return (
    <div className="dash">
      <div className="page-head">
        <div>
          <h1 data-testid="greeting">{greeting}, {firstName}</h1>
          <p>Your money in {monthLabel(month)}</p>
        </div>
        <div className="month-nav top-month" aria-label="Choose month">
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
        <div className={`card stat hero ${net >= 0 ? "pos" : "neg"}`}>
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
            <div className="card panel" data-testid="paid-with-card">
              <CardHead title="Paid with" />
              {paidWith.length === 0 ? (
                <p className="muted">No expenses in this period.</p>
              ) : (
                <PaidWithCarousel items={paidWith} />
              )}
            </div>
          </div>

          <div className="grid two section equal">
            <div className="card panel record-card" data-testid="goals-card">
              <CardHead title="Savings goals">
                <Link className="btn soft small" href="/goals">Manage <IconArrowRight /></Link>
              </CardHead>
              {goalSlides.length > 0 ? (
                <Slider label="savings goal">
                  {goalSlides.map((g) => (
                    <div key={g.id} className="slide goal-slide" data-testid="goal-slide">
                      <div className="row between">
                        <strong className="nm-plain">{g.name}</strong>
                        <span className={g.pct >= 100 ? "tag done" : "tag"}>{g.pct >= 100 ? "Reached" : `${g.pct}%`}</span>
                      </div>
                      <div className="budget-figure">
                        <strong>{g.savedText}</strong>
                        <span className="muted">of {g.targetText} · {g.pct}%</span>
                      </div>
                      {/* <progress> instead of a styled div: the CSP forbids inline style attributes. */}
                      <progress max={100} value={g.pct} aria-label={`${g.name} progress`} />
                      <dl className="budget-facts">
                        <div><dt>To go</dt><dd>{g.toGoText}</dd></div>
                        <div><dt>{g.secondLabel}</dt><dd>{g.secondText}</dd></div>
                      </dl>
                    </div>
                  ))}
                </Slider>
              ) : (
                <div className="empty compact">
                  <strong>No goals yet</strong>
                  <span>Set a target and track your progress.</span>
                  <Link className="btn small" href="/goals">Create a goal</Link>
                </div>
              )}
            </div>
            <div className="card panel record-card" data-testid="budgets-card">
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
                <Slider label="budget">
                  {shownBudgets.map((b) => {
                    const used = spent.get(`${b.category.id}|${b.currency}`) ?? 0;
                    const over = used > b.amountMinor;
                    const pct = Math.round((used * 100) / b.amountMinor);
                    const left = Math.max(b.amountMinor - used, 0);
                    return (
                      <div key={b.id} className="slide budget-slide" data-testid="budget-slide">
                        <div className="row between">
                          <CategoryTag name={b.category.name} color={b.category.color} />
                          <span className={over ? "tag status over" : "tag status ok"}>{over ? "Over" : "On track"}</span>
                        </div>
                        <div className="budget-figure">
                          <strong>{formatMoney(used, b.currency)}</strong>
                          <span className="muted">of {formatMoney(b.amountMinor, b.currency)} · {pct}%</span>
                        </div>
                        {/* <progress> instead of a styled div: the CSP forbids inline style attributes. */}
                        <progress
                          className={`${over ? "over " : ""}${colorClass(b.category.color)}`}
                          max={b.amountMinor}
                          value={Math.min(used, b.amountMinor)}
                          aria-label={`${b.category.name} budget used`}
                        />
                        <dl className="budget-facts">
                          <div><dt>{over ? "Over by" : "Left"}</dt><dd>{formatMoney(over ? used - b.amountMinor : left, b.currency)}</dd></div>
                          <div><dt>Used</dt><dd>{pct}%</dd></div>
                        </dl>
                      </div>
                    );
                  })}
                </Slider>
              )}
            </div>
          </div>
        </>
      )}

      {recent.rows.length > 0 && (
        <div className="card section" id="latest">
          <CardHead title="Latest expenses" />
          <table className="responsive">
            <thead>
              <tr><th>Date</th><th>Expense</th><th>Category</th><th className="num">Amount</th></tr>
            </thead>
            <tbody>
              {recent.rows.map((e) => (
                <tr key={e.id}>
                  <td data-label="Date">{shortDate(e.spentOn)}</td>
                  <td data-label="Expense">{e.description}</td>
                  <td data-label="Category"><CategoryTag name={e.category?.name} color={e.category?.color} /></td>
                  <td className="num" data-label="Amount">{formatMoney(e.amountMinor, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="card-foot">
            <Link className="btn" href={`/expenses?month=${month}`} data-testid="see-all-expenses">
              See all expenses <IconArrowRight />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
