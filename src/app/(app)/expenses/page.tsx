import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { createExpense, deleteExpense } from "@/actions/expenses";
import { listCategories, listExpenses } from "@/lib/queries";
import { currentMonth, formatMoney } from "@/lib/money";
import { parseListQuery } from "@/lib/validation";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { month, q, categoryId, page } = parseListQuery(await searchParams, currentMonth());
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
      <h1>Expenses</h1>

      <ActionForm
        action={createExpense}
        submitLabel="Add expense"
        className="card stack"
        resetOnSuccess
      >
        <div className="row">
          <label>Amount
            <input name="amount" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" required />
          </label>
          <label>Currency
            <select name="currency" defaultValue="INR">
              <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
            </select>
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

      <h2>Find expenses</h2>
      {/* Filters only: no credentials or sensitive values, so a GET form is appropriate. */}
      <form className="row" method="get">
        <label>Month<input type="month" name="month" defaultValue={month} /></label>
        <label>Search<input type="search" name="q" maxLength={60} defaultValue={q ?? ""} /></label>
        <label>Category
          <select name="categoryId" defaultValue={categoryId ?? ""}>
            <option value="">All</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <button className="btn ghost" type="submit">Apply</button>
      </form>

      <h2>{month}</h2>
      {totals.length > 0 && (
        <p className="muted">
          Total for this view:{" "}
          {totals.map((t) => formatMoney(t._sum.amountMinor ?? 0, t.currency)).join(" · ")}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="muted">Nothing matches.</p>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Description</th><th>Category</th>
                <th className="num">Amount</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>{e.spentOn.toISOString().slice(0, 10)}</td>
                  <td>
                    {e.description}
                    {e.note && <div className="muted">{e.note}</div>}
                  </td>
                  <td>{e.category?.name ?? "—"}</td>
                  <td className="num">{formatMoney(e.amountMinor, e.currency)}</td>
                  <td>
                    <div className="row">
                      <Link className="btn ghost" href={`/expenses/${e.id}/edit`}>Edit</Link>
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
        </div>
      )}

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
