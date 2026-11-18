import Link from "next/link";
import { materializeRecurring } from "@/lib/recurring";
import { ActionForm } from "@/components/ActionForm";
import { createIncome, deleteIncome } from "@/actions/income";
import { listIncome } from "@/lib/finance-queries";
import { currentMonth, formatMoney, monthLabel } from "@/lib/money";
import { addMonthsKey } from "@/lib/chart-math";
import { monthSchema } from "@/lib/validation";
import { IconChevronLeft, IconChevronRight, IconWallet } from "@/components/icons";

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const now = currentMonth();
  const parsed = monthSchema.safeParse(Array.isArray(sp.month) ? sp.month[0] : sp.month);
  const month = parsed.success && parsed.data <= now ? parsed.data : now;
  // Create anything that fell due since the last visit before reading the data.
  await materializeRecurring();
  const { rows, totals } = await listIncome(month);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Income</h1>
          <p>
            {monthLabel(month)}
            {totals.length > 0 ? ` · ${totals.map((t) => formatMoney(t._sum.amountMinor ?? 0, t.currency)).join(" · ")}` : ""}
          </p>
        </div>
        <div className="month-nav" aria-label="Choose month">
          <Link href={`/income?month=${addMonthsKey(month, -1)}`} aria-label="Previous month"><IconChevronLeft /></Link>
          <span className="current">{monthLabel(month)}</span>
          <Link
            href={`/income?month=${addMonthsKey(month, 1)}`}
            aria-label="Next month"
            aria-disabled={month >= now}
            tabIndex={month >= now ? -1 : undefined}
          >
            <IconChevronRight />
          </Link>
        </div>
      </div>

      <details className="add">
        <summary>Add income</summary>
        <div className="body">
          <ActionForm action={createIncome} submitLabel="Add income" className="stack" resetOnSuccess>
            <div className="row">
              <label>Amount
                <input name="amount" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" placeholder="0.00" required />
              </label>
              <label>Date received
                <input name="receivedOn" type="date" defaultValue={today} max={today} required />
              </label>
            </div>
            <label>Source
              <input name="source" maxLength={80} placeholder="Salary, refund, gift…" required />
            </label>
            <label>Note (optional)
              <textarea name="note" maxLength={500} rows={2} />
            </label>
          </ActionForm>
        </div>
      </details>

      <div className="card">
        {rows.length === 0 ? (
          <div className="empty">
            <IconWallet />
            <strong>No income recorded for {monthLabel(month)}</strong>
            <span>Add your salary or other money received to see your balance on the dashboard.</span>
          </div>
        ) : (
          <table className="responsive">
            <thead>
              <tr><th>Date</th><th>Source</th><th className="num">Amount</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="Date">{r.receivedOn.toISOString().slice(0, 10)}</td>
                  <td data-label="Source">
                    <span>
                      {r.source}{r.recurringRuleId && <> <span className="tag">Recurring</span></>}
                      {r.note && <div className="muted">{r.note}</div>}
                    </span>
                  </td>
                  <td className="num income" data-label="Amount">+{formatMoney(r.amountMinor, r.currency)}</td>
                  <td className="nolabel">
                    <div className="cell-actions">
                      <Link className="btn ghost small" href={`/income/${r.id}/edit`}>Edit</Link>
                      <ActionForm
                        action={deleteIncome}
                        submitLabel="Delete"
                        danger
                        confirmMessage="Delete this income entry?"
                      >
                        <input type="hidden" name="id" value={r.id} />
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
