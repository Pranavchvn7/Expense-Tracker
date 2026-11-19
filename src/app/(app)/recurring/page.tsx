import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { createRule, deleteRule, toggleRule } from "@/actions/recurring";
import { listRules } from "@/lib/recurring-queries";
import { listCategories } from "@/lib/queries";
import { formatMoney } from "@/lib/money";
import { IconRepeat } from "@/components/icons";
import { getUserToday } from "@/lib/preferences";
import { parsePaging } from "@/lib/paging";
import { Pager } from "@/components/Pager";
import { CategoryTag } from "@/components/CategoryTag";

const FREQ = { WEEKLY: "Every week", MONTHLY: "Every month", YEARLY: "Every year" } as const;

export default async function RecurringPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { page, perPage } = parsePaging(sp);
  const [{ rows: rules, hasNext }, cats, { iso: today }] = await Promise.all([
    listRules(page, perPage),
    listCategories(),
    getUserToday(),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Recurring</h1>
          <p>Rent, subscriptions, salary: added automatically when they fall due</p>
        </div>
      </div>

      <details className="add">
        <summary>Add a recurring item</summary>
        <div className="body">
          <ActionForm action={createRule} submitLabel="Save recurring item" className="stack" resetOnSuccess>
            <div className="row">
              <label>Type
                <select name="kind" defaultValue="EXPENSE">
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
              </label>
              <label>Amount
                <input name="amount" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" placeholder="0.00" required />
              </label>
              <label>Repeats
                <select name="frequency" defaultValue="MONTHLY">
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </label>
            </div>
            <label>Name (description or income source)
              <input name="label" maxLength={80} placeholder="Rent, Netflix, Salary…" required />
            </label>
            <div className="row">
              <label>First date
                <input name="startDate" type="date" defaultValue={today} required />
              </label>
              <label>Ends on (optional)
                <input name="endDate" type="date" />
              </label>
              <label>Category (expenses only)
                <select name="categoryId" defaultValue="">
                  <option value="">Uncategorised</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>
            <label>Note (optional)
              <textarea name="note" maxLength={500} rows={2} />
            </label>
            <p className="muted">
              The first date can be up to a year back or ahead. Items dated in the past are filled in
              the next time you open the app. Monthly items on the 29th–31st use the last day of
              shorter months.
            </p>
          </ActionForm>
        </div>
      </details>

      <div className="card section">
        {rules.length === 0 ? (
          <div className="empty">
            <IconRepeat />
            <strong>No recurring items yet</strong>
            <span>Add rent, a subscription or your salary once and it is recorded for you every time.</span>
          </div>
        ) : (
          <table className="responsive">
            <thead>
              <tr><th>Name</th><th>Repeats</th><th>Next</th><th className="num">Amount</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td data-label="Name">
                    <span>
                      {r.label}{" "}
                      <span className="tag">{r.kind === "INCOME" ? "Income" : "Expense"}</span>
                      {!r.active && <> <span className="tag">{r.endDate && r.nextDue > r.endDate ? "Ended" : "Paused"}</span></>}
                      {r.category && <div><CategoryTag name={r.category.name} color={r.category.color} /></div>}
                    </span>
                  </td>
                  <td data-label="Repeats">{FREQ[r.frequency]}</td>
                  <td data-label="Next">{r.active ? r.nextDue.toISOString().slice(0, 10) : "–"}</td>
                  <td className={`num ${r.kind === "INCOME" ? "income" : ""}`} data-label="Amount">
                    {r.kind === "INCOME" ? "+" : ""}{formatMoney(r.amountMinor, r.currency)}
                  </td>
                  <td className="nolabel">
                    <div className="cell-actions">
                      <Link className="btn ghost small" href={`/recurring/${r.id}/edit`}>Edit</Link>
                      {(r.active || !(r.endDate && r.nextDue > r.endDate)) && (
                        <ActionForm action={toggleRule} submitLabel={r.active ? "Pause" : "Resume"}>
                          <input type="hidden" name="id" value={r.id} />
                        </ActionForm>
                      )}
                      <ActionForm
                        action={deleteRule}
                        submitLabel="Delete"
                        danger
                        confirmMessage="Delete this recurring item? Entries already created are kept."
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
        <Pager basePath="/recurring" params={{}} page={page} perPage={perPage} hasNext={hasNext} rowCount={rules.length} />
      </div>
    </>
  );
}
