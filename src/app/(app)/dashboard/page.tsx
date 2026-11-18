import Link from "next/link";
import { materializeRecurring } from "@/lib/recurring";
import { listBudgets, monthTotalsByCategory } from "@/lib/queries";
import { getDashboardData } from "@/lib/finance-queries";
import { listGoals } from "@/lib/goal-queries";
import { percent } from "@/lib/goal-math";
import { currentMonth, formatMoney, monthLabel } from "@/lib/money";
import { addMonthsKey } from "@/lib/chart-math";
import { monthSchema } from "@/lib/validation";
import { DonutChart } from "@/components/charts/DonutChart";
import { BarChart } from "@/components/charts/BarChart";
import {
  IconArrowDown,
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
  const now = currentMonth();
  // Query strings are untrusted: validate, fall back to safe defaults.
  const rawMonth = monthSchema.safeParse(Array.isArray(sp.month) ? sp.month[0] : sp.month);
  const month = rawMonth.success && rawMonth.data <= now ? rawMonth.data : now;

  // Create anything that fell due since the last visit before reading the data.
  await materializeRecurring();
  // One round of parallel queries (the session lookup is shared per request).
  const [data, budgets, totals, goals] = await Promise.all([
    getDashboardData(month),
    listBudgets(),
    monthTotalsByCategory(month),
    listGoals({ limit: 3 }),
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

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p>Your money in {monthLabel(month)}</p>
        </div>
        <div className="actions">
          <div className="month-nav" aria-label="Choose month">
            <Link href={href(addMonthsKey(month, -1))} aria-label="Previous month"><IconChevronLeft /></Link>
            <span className="current">{monthLabel(month)}</span>
            <Link
              href={href(addMonthsKey(month, 1))}
              aria-label="Next month"
              aria-disabled={month >= now}
              tabIndex={month >= now ? -1 : undefined}
            >
              <IconChevronRight />
            </Link>
          </div>
        </div>
      </div>

      {data.otherCurrencyEntries > 0 && (
        <p className="notice" role="note">
          {data.otherCurrencyEntries} older {data.otherCurrencyEntries === 1 ? "entry is" : "entries are"} recorded in another
          currency and {data.otherCurrencyEntries === 1 ? "is" : "are"} not included below. Your currency is {currency}; change it in{" "}
          <Link href="/settings#preferences">Settings</Link>.
        </p>
      )}

      <div className="grid stats section">
        <div className="card stat income">
          <span className="label"><span className="pill-icon income"><IconArrowDown /></span>Income</span>
          <span className="value">{formatMoney(data.incomeMinor, currency)}</span>
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
        <div className="card stat">
          <span className="label">Savings rate</span>
          <span className="value">{rate === null ? "–" : `${rate}%`}</span>
          <span className="hint">{rate === null ? "Add income to see this" : "Of income kept"}</span>
        </div>
      </div>

      {empty && (
        <div className="card section">
          <div className="empty">
            <IconInbox />
            <strong>Nothing recorded for {monthLabel(month)}</strong>
            <span>Add an expense or some income to see your charts.</span>
            <div className="actions">
              <Link className="btn" href="/expenses">Add expense</Link>
              <Link className="btn ghost" href="/income">Add income</Link>
            </div>
          </div>
        </div>
      )}

      {!empty && (
        <div className="grid two section">
          <div className="card">
            <h2>Where it went</h2>
            {data.categories.length === 0 ? (
              <p className="muted">No expenses this month.</p>
            ) : (
              <DonutChart items={data.categories} currency={currency} />
            )}
          </div>
          <div className="card">
            <div className="row between">
              <h2>Last 6 months</h2>
              <div className="key">
                <span><i className="dot income" />Income</span>
                <span><i className="dot spend" />Spent</span>
              </div>
            </div>
            <BarChart months={data.trend.months} income={data.trend.income} spent={data.trend.spent} currency={currency} />
          </div>
        </div>
      )}

      {shownBudgets.length > 0 && (
        <div className="card section">
          <h2>Budgets</h2>
          {shownBudgets.map((b) => {
            const used = spent.get(`${b.category.id}|${b.currency}`) ?? 0;
            const over = used > b.amountMinor;
            const pct = Math.round((used * 100) / b.amountMinor);
            return (
              <div key={b.id} className="budget">
                <div className="row between">
                  <strong>{b.category.name}</strong>
                  <span className={over ? "error" : "muted"}>
                    {formatMoney(used, b.currency)} of {formatMoney(b.amountMinor, b.currency)} ({pct}%)
                    {over ? ` · over by ${formatMoney(used - b.amountMinor, b.currency)}` : ""}
                  </span>
                </div>
                {/* <progress> instead of a styled div: the CSP forbids inline style attributes. */}
                <progress
                  className={over ? "over" : undefined}
                  max={b.amountMinor}
                  value={Math.min(used, b.amountMinor)}
                  aria-label={`${b.category.name} budget used`}
                />
              </div>
            );
          })}
        </div>
      )}

      {goals.length > 0 && (
        <div className="card section">
          <div className="row between">
            <h2>Savings goals</h2>
            <Link href="/goals">Manage</Link>
          </div>
          {goals.map((g) => (
            <div key={g.id} className="budget">
              <div className="row between">
                <strong>{g.name}</strong>
                <span className="muted">
                  {formatMoney(g.savedMinor, g.currency)} of {formatMoney(g.targetMinor, g.currency)} ({percent(g.savedMinor, g.targetMinor)}%)
                </span>
              </div>
              <progress max={g.targetMinor} value={Math.min(g.savedMinor, g.targetMinor)} aria-label={`${g.name} progress`} />
            </div>
          ))}
        </div>
      )}

      {data.recent.length > 0 && (
        <div className="card section">
          <div className="row between">
            <h2>Latest expenses</h2>
            <Link href={`/expenses?month=${month}`}>See all</Link>
          </div>
          <table>
            <tbody>
              {data.recent.map((e) => (
                <tr key={e.id}>
                  <td>{e.description}<div className="muted">{e.spentOn.toISOString().slice(0, 10)}</div></td>
                  <td>{e.category ? <span className="tag">{e.category.name}</span> : null}</td>
                  <td className="num">{formatMoney(e.amountMinor, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
