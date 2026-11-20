import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { CategoryTag } from "@/components/CategoryTag";
import { CardHead } from "@/components/cards/CardHead";
import { setBudget, deleteBudget } from "@/actions/budgets";
import { getBudgetCards } from "@/lib/budget-queries";
import { budgetStats } from "@/lib/budget-math";
import { colorClass } from "@/lib/category-color";
import { addMonthsKey } from "@/lib/chart-math";
import { formatMoney, monthLabel } from "@/lib/money";
import { getUserToday } from "@/lib/preferences";
import { monthSchema } from "@/lib/validation";
import { buildHref } from "@/lib/paging";
import { IconChevronLeft, IconChevronRight, IconTarget } from "@/components/icons";

const STATUS_TEXT = { ok: "On track", warn: "Close to limit", over: "Over budget" } as const;

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const today = await getUserToday();
  const parsed = monthSchema.safeParse(Array.isArray(sp.month) ? sp.month[0] : sp.month);
  const month = parsed.success && parsed.data <= today.month ? parsed.data : today.month;
  const openAdd = (Array.isArray(sp.add) ? sp.add[0] : sp.add) === "1";

  const { currency, cards, unbudgeted } = await getBudgetCards(month);

  const [y, m] = [Number(month.slice(0, 4)), Number(month.slice(5, 7))];
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const isCurrent = month === today.month;
  const dayOfMonth = isCurrent ? Number(today.iso.slice(8, 10)) : null;

  const totalLimit = cards.reduce((a, c) => a + c.limitMinor, 0);
  const totalSpent = cards.reduce((a, c) => a + c.spentMinor, 0);
  const totalStats = budgetStats(totalLimit, totalSpent, daysInMonth, dayOfMonth);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Budgets</h1>
          <p>Monthly limits per category in {currency}. A budget applies to every month.</p>
        </div>
        <div className="month-nav" aria-label="Choose month">
          <Link href={buildHref("/budgets", { month: addMonthsKey(month, -1) })} aria-label="Previous month"><IconChevronLeft /></Link>
          <span className="current">{monthLabel(month)}</span>
          <Link
            href={buildHref("/budgets", { month: addMonthsKey(month, 1) })}
            aria-label="Next month"
            aria-disabled={isCurrent}
            tabIndex={isCurrent ? -1 : undefined}
          >
            <IconChevronRight />
          </Link>
        </div>
      </div>

      <details className="add" open={openAdd || cards.length === 0}>
        <summary>Set a budget</summary>
        <div className="body">
          {unbudgeted.length === 0 && cards.length === 0 ? (
            <p className="muted">Add a category in <Link href="/settings#categories">Settings</Link> first, then set a budget for it.</p>
          ) : (
            <>
              <ActionForm action={setBudget} submitLabel="Save budget" className="row" resetOnSuccess>
                <label>Category
                  <select name="categoryId" required defaultValue="">
                    <option value="" disabled>Choose…</option>
                    {unbudgeted.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label>Monthly limit
                  <input name="amount" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" placeholder="0.00" required />
                </label>
              </ActionForm>
              <p className="muted">To change a limit, edit it on its card below.</p>
            </>
          )}
        </div>
      </details>

      {cards.length > 0 && (
        <div className="card section budget-total">
          <CardHead title="All budgets">
            <span className={`tag status ${totalStats.status}`}>{STATUS_TEXT[totalStats.status]}</span>
          </CardHead>
          <progress
            className={totalStats.over ? "over" : undefined}
            max={Math.max(totalLimit, 1)}
            value={Math.min(totalSpent, totalLimit)}
            aria-label="Total budget used"
          />
          <p className="muted">
            {formatMoney(totalSpent, currency)} of {formatMoney(totalLimit, currency)} ({totalStats.pct}%) ·{" "}
            {totalStats.over
              ? `over by ${formatMoney(-totalStats.remaining, currency)}`
              : `${formatMoney(totalStats.remaining, currency)} left`}
          </p>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="card section">
          <div className="empty">
            <IconTarget />
            <strong>No budgets yet</strong>
            <span>Set a monthly limit for a category such as Food or Transport and see how you are tracking.</span>
          </div>
        </div>
      ) : (
        <div className="grid two section budget-grid">
          {cards.map((c) => {
            const st = budgetStats(c.limitMinor, c.spentMinor, daysInMonth, dayOfMonth);
            return (
              <div key={c.id} className={`card budget-card ${st.status}`}>
                <div className="row between">
                  <CategoryTag name={c.category.name} color={c.category.color} />
                  <span className={`tag status ${st.status}`}>{STATUS_TEXT[st.status]}</span>
                </div>
                <div className="budget-figure">
                  <strong>{formatMoney(c.spentMinor, currency)}</strong>
                  <span className="muted">of {formatMoney(c.limitMinor, currency)} · {st.pct}%</span>
                </div>
                {/* <progress> instead of a styled div: the CSP forbids inline style attributes. */}
                <progress
                  className={`${st.over ? "over " : ""}${colorClass(c.category.color)}`}
                  max={c.limitMinor}
                  value={Math.min(c.spentMinor, c.limitMinor)}
                  aria-label={`${c.category.name} budget used`}
                />
                <dl className="facts">
                  <div><dt>{st.over ? "Over by" : "Left"}</dt><dd className={st.over ? "error" : undefined}>{formatMoney(Math.abs(st.remaining), currency)}</dd></div>
                  <div><dt>Expenses</dt><dd>{c.count}</dd></div>
                  <div><dt>Daily average</dt><dd>{formatMoney(st.dailyAverage, currency)}</dd></div>
                  <div><dt>Largest</dt><dd>{c.count > 0 ? formatMoney(c.largestMinor, currency) : "–"}</dd></div>
                  {isCurrent && (
                    <>
                      <div><dt>On this pace</dt><dd className={st.projected > c.limitMinor ? "error" : undefined}>{formatMoney(st.projected, currency)}</dd></div>
                      <div><dt>Safe per day</dt><dd>{st.safePerDay === null ? "–" : formatMoney(st.safePerDay, currency)}<span className="muted"> · {st.daysLeft} day{st.daysLeft === 1 ? "" : "s"} left</span></dd></div>
                    </>
                  )}
                </dl>
                <div className="budget-actions">
                  <ActionForm action={setBudget} submitLabel="Update limit" className="row" >
                    <input type="hidden" name="categoryId" value={c.category.id} />
                    <label>New monthly limit
                      <input name="amount" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" defaultValue={(c.limitMinor / 100).toFixed(2)} required />
                    </label>
                  </ActionForm>
                  <div className="cell-actions">
                    <Link className="btn soft small" href={buildHref("/expenses", { month, categoryId: c.category.id })}>View expenses</Link>
                    <ActionForm action={deleteBudget} submitLabel="Remove" danger confirmMessage="Remove this budget?">
                      <input type="hidden" name="id" value={c.id} />
                    </ActionForm>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {unbudgeted.some((c) => c.spentMinor > 0) && (
        <div className="card section">
          <h2>Spending without a budget</h2>
          <ul className="devices">
            {unbudgeted.filter((c) => c.spentMinor > 0).map((c) => (
              <li key={c.id} className="row between">
                <CategoryTag name={c.name} color={c.color} />
                <span>{formatMoney(c.spentMinor, currency)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
