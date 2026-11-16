import { listBudgets, listCategories, monthTotalsByCategory } from "@/lib/queries";
import { currentMonth, formatMoney } from "@/lib/money";

export default async function DashboardPage() {
  const month = currentMonth();
  const [totals, cats, budgets] = await Promise.all([
    monthTotalsByCategory(month),
    listCategories(),
    listBudgets(),
  ]);
  const names = new Map(cats.map((c) => [c.id, c.name]));

  const spent = new Map<string, number>();
  for (const t of totals) {
    if (t.categoryId) spent.set(`${t.categoryId}|${t.currency}`, t._sum.amountMinor ?? 0);
  }

  return (
    <>
      <h1>This month ({month})</h1>

      {budgets.length > 0 && (
        <>
          <h2>Budgets</h2>
          <div className="card stack">
            {budgets.map((b) => {
              const used = spent.get(`${b.category.id}|${b.currency}`) ?? 0;
              const over = used > b.amountMinor;
              const pct = Math.round((used * 100) / b.amountMinor);
              return (
                <div key={b.id}>
                  <div className="row between">
                    <strong>{b.category.name}</strong>
                    <span className={over ? "error" : "muted"}>
                      {formatMoney(used, b.currency)} of {formatMoney(b.amountMinor, b.currency)} ({pct}%)
                      {over ? ` — over by ${formatMoney(used - b.amountMinor, b.currency)}` : ""}
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
        </>
      )}

      <h2>Spending by category</h2>
      {totals.length === 0 ? (
        <p className="muted">No expenses yet this month.</p>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr><th>Category</th><th className="num">Total</th></tr>
            </thead>
            <tbody>
              {totals.map((t) => (
                <tr key={`${t.categoryId ?? "none"}-${t.currency}`}>
                  <td>{t.categoryId ? (names.get(t.categoryId) ?? "Other") : "Uncategorised"}</td>
                  <td className="num">{formatMoney(t._sum.amountMinor ?? 0, t.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
