import Link from "next/link";
import { materializeRecurring } from "@/lib/recurring";
import { listBudgets, monthTotalsByCategory } from "@/lib/queries";
import { getDashboardData, listRecentExpenses } from "@/lib/finance-queries";
import { listGoals } from "@/lib/goal-queries";
import { monthlyNeeded, percent } from "@/lib/goal-math";
import { formatMoney, monthLabel } from "@/lib/money";
import { addMonthsKey } from "@/lib/chart-math";
import { getUserToday, getUserPrefs } from "@/lib/preferences";
import { monthSchema } from "@/lib/validation";
import { parsePaging } from "@/lib/paging";
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
  // Query strings are untrusted: validate, fall back to safe defaults.
  const rawMonth = monthSchema.safeParse(Array.isArray(sp.month) ? sp.month[0] : sp.month);
  const month = rawMonth.success && rawMonth.data <= today.month ? rawMonth.data : today.month;
  const { page, perPage } = parsePaging(sp, { pageKey: "ep", sizeKey: "epp" });

  const [data, budgets, totals, goals, recent] = await Promise.all([
    getDashboardData(month),
    listBudgets(),
    monthTotalsByCategory(month),
    listGoals(12),
    listRecentExpenses(month, page, perPage),
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
  const empty = data.expenseCount === 0 && data.incomeMinor === 0;

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

      <div className="grid stats section">
        <div className="card stat income">
          <span className="label"><span className="pill-icon income"><IconArrowDown /></span>Income</span>
          <span className="value">{formatMoney(data.incomeMinor, currency)}</span>
          <span className="hint">Money received</span>
        </div>
        <div className="card stat spend">
          <span className="label"><span className="pill-icon spend"><IconArrowUp /></span>Spent</span>
          <span className="value">{formatMoney(data.spentMinor, currency)}</span>
          <span className="hint">{data.expenseCount} expense{data.expenseCount === 1 ? "" : "s"}</span>
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
            <div className="card">
              <div className="row between">
                <h2>Cash flow</h2>
                <div className="key">
                  <span><i className="dot income" />Income</span>
                  <span><i className="dot spend" />Spent</span>
                </div>
              </div>
              <AreaChart months={data.trend.months} income={data.trend.income} spent={data.trend.spent} currency={currency} />
            </div>
            <div className="card">
              <h2>Where it went</h2>
              {data.categories.length === 0 ? (
                <p className="muted">No expenses this month.</p>
              ) : (
                <DonutChart items={data.categories} currency={currency} />
              )}
            </div>
          </div>

          <div className="grid two section equal">
            <div className="card">
              <h2>Spending by day</h2>
              <DailyBars daily={data.daily} month={month} currency={currency} />
            </div>
            <div className="card">
              <div className="row between">
                <h2>Savings goals</h2>
                <Link className="btn soft small" href="/goals">Manage <IconArrowRight /></Link>
              </div>
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
          </div>
        </>
      )}

      {shownBudgets.length > 0 && (
        <div className="card section">
          <div className="row between">
            <h2>Budgets</h2>
            <Link className="btn soft small" href="/budgets">Manage <IconArrowRight /></Link>
          </div>
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
                    {over ? ` · over by ${formatMoney(used - b.amountMinor, b.currency)}` : ""}
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

      {recent.rows.length > 0 && (
        <div className="card section" id="latest">
          <div className="row between">
            <h2>Expenses this month</h2>
            <Link className="btn soft small" href={`/expenses?month=${month}`}>See all <IconArrowRight /></Link>
          </div>
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
