import { CardHead } from "@/components/cards/CardHead";
import { CategoryTag } from "@/components/CategoryTag";
import { formatMoney } from "@/lib/money";

// Shared by Reports and Dashboard so both show the same cards: five rows tall, then the list
// scrolls with an invisible scrollbar. Server components; no client JavaScript.

export function CategoryDetailCard({
  categories,
  spentMinor,
  currency,
}: {
  categories: { label: string; color: number; value: number; count: number }[];
  spentMinor: number;
  currency: string;
}) {
  return (
    <div className="card panel">
      <CardHead title="Category detail" />
      <div className="rows-head cols-cat" aria-hidden="true">
        <span>Category</span><span className="r">Expenses</span><span className="r">Amount</span><span className="r">Share</span>
      </div>
      <ul className="rows cols-cat limit5 hide-scroll">
        {categories.map((c) => (
          <li key={c.label}>
            <span className="main"><CategoryTag name={c.label === "Uncategorised" ? null : c.label} color={c.color} /></span>
            <span className="r">{c.count}</span>
            <span className="r amt">{formatMoney(c.value, currency)}</span>
            <span className="r muted">{spentMinor > 0 ? Math.round((c.value / spentMinor) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
      <div className="rows-foot cols-cat">
        <span>Total</span>
        <span className="r">{categories.reduce((a, c) => a + c.count, 0)}</span>
        <span className="r amt">{formatMoney(spentMinor, currency)}</span>
        <span />
      </div>
    </div>
  );
}

export function TopExpensesCard({
  rows,
  currency,
}: {
  rows: { description: string; sub: string; amountMinor: number }[];
  currency: string;
}) {
  return (
    <div className="card panel">
      <CardHead title="Largest expenses" />
      {rows.length === 0 ? (
        <p className="muted">No expenses in this period.</p>
      ) : (
        <ul className="rows cols-2 limit5 hide-scroll">
          {rows.map((t, i) => (
            <li key={i}>
              <span className="stack-sm">
                <span className="nm">{t.description}</span>
                <span className="muted sub">{t.sub}</span>
              </span>
              <span className="r amt">{formatMoney(t.amountMinor, currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PaymentMethodsCard({
  rows,
  currency,
}: {
  rows: { label: string; count: number; value: number }[];
  currency: string;
}) {
  return (
    <div className="card panel">
      <CardHead title="Paid with" />
      {rows.length === 0 ? (
        <p className="muted">No expenses in this period.</p>
      ) : (
        <ul className="rows cols-2 limit5 hide-scroll">
          {rows.map((p) => (
            <li key={p.label}>
              <span className="stack-sm">
                <span className="nm">{p.label}</span>
                <span className="muted sub">{p.count} expense{p.count === 1 ? "" : "s"}</span>
              </span>
              <span className="r amt">{formatMoney(p.value, currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
