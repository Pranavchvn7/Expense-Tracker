import Link from "next/link";
import { materializeRecurring } from "@/lib/recurring";
import { ActionForm } from "@/components/ActionForm";
import { Pager } from "@/components/Pager";
import { SoftForm } from "@/components/SoftForm";
import { SortHeader } from "@/components/SortHeader";
import { CategoryTag } from "@/components/CategoryTag";
import { createExpense, deleteExpense, setReconciled } from "@/actions/expenses";
import { listCategories, listExpenses, paymentBreakdown } from "@/lib/queries";
import { PAYMENT_METHODS, paymentLabel } from "@/lib/payment-method";
import { getUserCurrency } from "@/lib/preferences";
import { formatMoney, monthLabel } from "@/lib/money";
import { parseListQuery } from "@/lib/validation";
import { parsePaging, buildHref } from "@/lib/paging";
import { getUserToday } from "@/lib/preferences";
import { IconDownload, IconInbox, IconUpload } from "@/components/icons";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const today = await getUserToday();
  const { month, q, categoryId, sort, dir, paymentMethod, reconciled } = parseListQuery(sp, today.month);
  const { page, perPage } = parsePaging(sp);
  const openAdd = (Array.isArray(sp.add) ? sp.add[0] : sp.add) === "1";
  // Create anything that fell due since the last visit before reading the data.
  await materializeRecurring();
  const currency = await getUserCurrency();
  const [{ rows, hasNext, totals }, cats, methods] = await Promise.all([
    listExpenses({ month, q, categoryId, page, perPage, sort, dir, paymentMethod, reconciled }),
    listCategories(),
    paymentBreakdown(month, currency),
  ]);
  // Totals per payment method, split into matched / not yet matched with a statement.
  const byMethod = new Map<string, { total: number; open: number; count: number }>();
  for (const m of methods) {
    const key = m.method ?? "NONE";
    const cur = byMethod.get(key) ?? { total: 0, open: 0, count: 0 };
    cur.total += m.totalMinor;
    cur.count += m.count;
    if (!m.reconciled) cur.open += m.totalMinor;
    byMethod.set(key, cur);
  }

  // Only validated values go into links; React escapes attributes on render.
  const keep = {
    month,
    q,
    categoryId,
    pm: paymentMethod,
    rec: reconciled,
    sort: sort === "date" ? undefined : sort,
    dir: dir === "desc" ? undefined : dir,
    pp: perPage === 10 ? undefined : String(perPage),
  };
  const sortParams = { month, q, categoryId, pm: paymentMethod, rec: reconciled, pp: keep.pp };
  const hasFilter = Boolean(q || categoryId || paymentMethod || reconciled);
  const clearSearchHref = buildHref("/expenses", { ...keep, q: undefined });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Expenses</h1>
          <p>{monthLabel(month)}{totals.length > 0 ? ` · ${totals.map((t) => formatMoney(t._sum.amountMinor ?? 0, t.currency)).join(" · ")}` : ""}</p>
        </div>
        {/* Plain <a>, not <Link>: prefetching a download would count against the export limit. */}
        <div className="actions">
          <Link className="btn soft small" href="/import"><IconUpload />Import CSV</Link>
          <a className="btn soft small" href={`/expenses/export?month=${month}`}><IconDownload />This month CSV</a>
          <a className="btn soft small" href="/expenses/export?all=1"><IconDownload />All CSV</a>
        </div>
      </div>

      <details className="add" open={openAdd}>
        <summary>Add an expense</summary>
        <div className="body">
          <ActionForm action={createExpense} submitLabel="Add expense" className="stack" resetOnSuccess>
            <div className="row">
              <label>Amount
                <input name="amount" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" placeholder="0.00" required />
              </label>
              <label>Date
                <input name="spentOn" type="date" defaultValue={today.iso} max={today.iso} required />
              </label>
            </div>
            <label>Description
              <input name="description" maxLength={120} required />
            </label>
            <div className="row">
              <label>Category
                <select name="categoryId" defaultValue="">
                  <option value="">Uncategorised</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label>Paid with
              <select name="paymentMethod" defaultValue="">
                <option value="">Not set</option>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </label>
            </div>
            <label>Note (optional)
              <textarea name="note" maxLength={500} rows={2} />
            </label>
          </ActionForm>
        </div>
      </details>

      {byMethod.size > 0 && (
        <div className="card section">
          <h2>Paid with</h2>
          <p className="muted">Tick expenses as matched when you have found them on your bank or card statement; what is left is not matched yet.</p>
          <div className="method-grid">
            {[...byMethod.entries()].map(([key, v]) => (
              <Link
                key={key}
                className="method-card"
                href={buildHref("/expenses", { month, pm: key === "NONE" ? undefined : key })}
              >
                <strong>{key === "NONE" ? "Not set" : paymentLabel(key)}</strong>
                <span className="amt">{formatMoney(v.total, currency)}</span>
                <span className="muted">{v.count} expense{v.count === 1 ? "" : "s"}{v.open > 0 ? ` · ${formatMoney(v.open, currency)} not matched` : " · all matched"}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters only (no credentials). SoftForm updates just the records grid, not the whole page. */}
      <SoftForm
        key={[month, q, categoryId, paymentMethod, reconciled].join("|")}
        className="card row filters"
        action="/expenses"
        busyId="records"
        label="Filter expenses"
      >
        <label>Month<input type="month" name="month" defaultValue={month} max={today.month} /></label>
        <label>Search
          <span className="search">
            <input type="search" name="q" maxLength={60} defaultValue={q ?? ""} placeholder="Description or note" />
            {q && (
              <Link className="clear" href={clearSearchHref} aria-label="Clear search" title="Clear search">×</Link>
            )}
          </span>
        </label>
        <label>Category
          <select name="categoryId" defaultValue={categoryId ?? ""}>
            <option value="">All</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Paid with
          <select name="pm" defaultValue={paymentMethod ?? ""}>
            <option value="">All</option>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label>Statement
          <select name="rec" defaultValue={reconciled ?? ""}>
            <option value="">All</option>
            <option value="no">Not matched yet</option>
            <option value="yes">Matched</option>
          </select>
        </label>
        {keep.sort && <input type="hidden" name="sort" value={keep.sort} />}
        {keep.dir && <input type="hidden" name="dir" value={keep.dir} />}
        {keep.pp && <input type="hidden" name="pp" value={keep.pp} />}
        <button className="btn" type="submit">Apply</button>
        {hasFilter && (
          <Link className="btn ghost" href={buildHref("/expenses", { month })}>Reset</Link>
        )}
      </SoftForm>

      <div className="card section region" id="records">
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
                <SortHeader label="Date" column="date" sort={sort} dir={dir} basePath="/expenses" params={sortParams} />
                <SortHeader label="Description" column="description" sort={sort} dir={dir} basePath="/expenses" params={sortParams} />
                <SortHeader label="Category" column="category" sort={sort} dir={dir} basePath="/expenses" params={sortParams} />
                <th>Paid with</th>
                <SortHeader label="Amount" column="amount" sort={sort} dir={dir} basePath="/expenses" params={sortParams} className="num" />
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td data-label="Date">{e.spentOn.toISOString().slice(0, 10)}</td>
                  <td data-label="Description">
                    <span className="name-block">
                      <span className="name-cell">
                        <span className="nm">{e.description}</span>
                        {e.recurringRuleId && <span className="tag">Recurring</span>}
                      </span>
                      {e.note && <span className="muted note">{e.note}</span>}
                    </span>
                  </td>
                  <td data-label="Category"><CategoryTag name={e.category?.name} color={e.category?.color} /></td>
                  <td data-label="Paid with">
                    <span>{e.paymentMethod ? paymentLabel(e.paymentMethod) : <span className="muted">—</span>}</span>
                  </td>
                  <td className="num" data-label="Amount">{formatMoney(e.amountMinor, e.currency)}</td>
                  <td className="nolabel">
                    <div className="cell-actions">
                      <ActionForm action={setReconciled} submitLabel={e.reconciled ? "✓ Matched" : "Match"} className={e.reconciled ? "matched" : undefined}>
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="reconciled" value={e.reconciled ? "0" : "1"} />
                      </ActionForm>
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
        <Pager
          basePath="/expenses"
          params={{ month, q, categoryId, pm: paymentMethod, rec: reconciled, sort: keep.sort, dir: keep.dir }}
          page={page}
          perPage={perPage}
          hasNext={hasNext}
          rowCount={rows.length}
        />
      </div>
    </>
  );
}
