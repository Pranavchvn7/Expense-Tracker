import { listCategories, monthTotalsByCategory } from "@/lib/queries";
import { currentMonth, formatMoney } from "@/lib/money";

export default async function DashboardPage() {
  const month = currentMonth();
  const [totals, cats] = await Promise.all([monthTotalsByCategory(month), listCategories()]);
  const names = new Map(cats.map((c) => [c.id, c.name]));

  return (
    <>
      <h1>This month ({month})</h1>
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
