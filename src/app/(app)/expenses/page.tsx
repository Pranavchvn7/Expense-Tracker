import { ActionForm } from "@/components/ActionForm";
import { createExpense, deleteExpense } from "@/actions/expenses";
import { listCategories, listExpenses } from "@/lib/queries";
import { currentMonth, formatMoney } from "@/lib/money";
import { monthSchema } from "@/lib/validation";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const parsed = monthSchema.safeParse(sp.month);
  const month = parsed.success ? parsed.data : currentMonth();
  const [expenses, cats] = await Promise.all([listExpenses(month), listCategories()]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <h1>Expenses</h1>

      <ActionForm action={createExpense} submitLabel="Add expense" className="card stack">
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

      <h2>{month}</h2>
      <form className="row" method="get">
        <label>Month<input type="month" name="month" defaultValue={month} /></label>
        <button className="btn ghost" type="submit">View</button>
      </form>

      {expenses.length === 0 ? (
        <p className="muted">Nothing recorded for this month.</p>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr><th>Date</th><th>Description</th><th>Category</th><th className="num">Amount</th><th /></tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>{e.spentOn.toISOString().slice(0, 10)}</td>
                  <td>
                    {e.description}
                    {e.note && <div className="muted">{e.note}</div>}
                  </td>
                  <td>{e.category?.name ?? "—"}</td>
                  <td className="num">{formatMoney(e.amountMinor, e.currency)}</td>
                  <td>
                    <ActionForm action={deleteExpense} submitLabel="Delete" danger>
                      <input type="hidden" name="id" value={e.id} />
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
