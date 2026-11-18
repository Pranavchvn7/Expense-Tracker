import Link from "next/link";
import { materializeRecurring } from "@/lib/recurring";
import { ActionForm } from "@/components/ActionForm";
import { createExpense, deleteExpense } from "@/actions/expenses";
import { listCategories, listExpenses } from "@/lib/queries";
import { currentMonth, formatMoney, monthLabel } from "@/lib/money";
import { parseListQuery } from "@/lib/validation";
import { IconDownload, IconInbox } from "@/components/icons";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { month, q, categoryId, page } = parseListQuery(await searchParams, currentMonth());
  // Create anything that fell due since the last visit before reading the data.
  await materializeRecurring();
  const [{ rows, hasNext, totals }, cats] = await Promise.all([
    listExpenses({ month, q, categoryId, page }),
    listCategories(),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  // Built only from validated values; React escapes the attribute on render.
  const pageHref = (p: number) => {
    const u = new URLSearchParams({ month, page: String(p) });
    if (q) u.set("q", q);
    if (categoryId) u.set("categoryId", categoryId);
    return `/expenses?${u.toString()}`;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Expenses</h1>
          <p>{monthLabel(month)}{totals.length > 0 ? ` · ${totals.map((t) => formatMoney(t._sum.amountMinor ?? 0, t.currency)).join(" · ")}` : ""}</p>
        </div>
        {/* Plain <a>, not <Link>: prefetching a download would count against the export limit. */}
        <div className="actions">
          <a className="btn ghost small" href={`/expenses/export?month=${month}`}><IconDownload />This month CSV</a>
          <a className="btn ghost small" href="/expenses/export?all=1"><IconDownload />All CSV</a>
        </div>
      </div>

      <details className="add">
        <summary>Add an expense</summary>
        <div className="body">
          <ActionForm action={createExpense} submitLabel="Add expense" className="stack" resetOnSuccess>
            <div className="row">
              <label>Amount
                <input name="amount" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" placeholder="0.00" required />
              </label>
              <label>Date
                <input name="spentOn" type="date" defaultValue={today} max={today} required />
              </label>
            </div>
            <label>Description
              <input name="description" maxLength={120} required />
            </label>
            <label>Category
              <select name="categoryId" defaultValue="">
                <option value="">Uncategorised</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>Note (optional)
              <textarea name="note" maxLength={500} rows={2} />
            </label>
          </ActionForm>
        </div>
      </details>

      {/* Filters only: no credentials or sensitive values, so a GET form is appropriate. */}
      <form className="card row" method="get" aria-label="Filter expenses">
        <label>Month<input type="month" name="month" defaultValue={month} /></label>
        <label>Search<input type="search" name="q" maxLength={60} defaultValue={q ?? ""} placeholder="Description or note" /></label>
        <label>Category
          <select name="categoryId" defaultValue={categoryId ?? ""}>
            <option value="">All</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <button className="btn" type="submit">Apply</button>
      </form>

      <div className="card section">
        {rows.length === 0 ? (
          <div className="empty">
            <IconInbox />
            <strong>No expenses found</strong>
            <span>Nothing matches this month and filter. Use “Add an expense” above.</span>
          </div>
        ) : (
          <table className="responsive">
            <thead>
              <tr>
                <th>Date</th><th>Description</th><th>Category</th>
                <th className="num">Amount</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td data-label="Date">{e.spentOn.toISOString().slice(0, 10)}</td>
                  <td data-label="Description">
                    <span>
                      {e.description}{e.recurringRuleId && <> <span className="tag">Recurring</span></>}
                      {e.note && <div className="muted">{e.note}</div>}
                    </span>
                  </td>
                  <td data-label="Category">{e.category ? <span className="tag">{e.category.name}</span> : <span className="muted">—</span>}</td>
                  <td className="num" data-label="Amount">{formatMoney(e.amountMinor, e.currency)}</td>
                  <td className="nolabel">
                    <div className="cell-actions">
                      <Link className="btn ghost small" href={`/expenses/${e.id}/edit`}>Edit</Link>
                      <ActionForm
                        action={deleteExpense}
                        submitLabel="Delete"
                        danger
                        confirmMessage="Delete this expense?"
                      >
                        <input type="hidden" name="id" value={e.id} />
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(page > 1 || hasNext) && (
        <nav className="pager" aria-label="Pagination">
          {page > 1 ? <Link href={pageHref(page - 1)}>← Newer</Link> : <span />}
          <span className="muted">Page {page}</span>
          {hasNext ? <Link href={pageHref(page + 1)}>Older →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
