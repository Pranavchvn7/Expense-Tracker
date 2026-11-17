import { donutSlices, collapseTop } from "@/lib/chart-math";
import { formatMoney } from "@/lib/money";

const R = 42;
const C = 2 * Math.PI * R;

/** Server-rendered SVG donut. Colours come from CSS classes (c1..c8), never inline styles. */
export function DonutChart({
  items,
  currency,
}: {
  items: { label: string; value: number }[];
  currency: string;
}) {
  const data = collapseTop(
    items.filter((i) => i.value > 0),
    8,
  );
  const total = data.reduce((a, b) => a + b.value, 0);
  const slices = donutSlices(
    data.map((d) => d.value),
    C,
  );
  // The "Other" bucket always gets the neutral grey (c8).
  const cls = (i: number, other: boolean) => `c${other ? 8 : (i % 7) + 1}`;

  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox="0 0 100 100" role="img" aria-label={`Spending by category, total ${formatMoney(total, currency)}`}>
        <circle className="track" cx="50" cy="50" r={R} strokeWidth="14" />
        <g transform="rotate(-90 50 50)">
          {slices.map((s, i) => (
            <circle
              key={i}
              className={`slice ${cls(i, data[i]?.other ?? false)}`}
              cx="50"
              cy="50"
              r={R}
              strokeWidth="14"
              strokeDasharray={`${Math.max(s.dash - 0.8, 0.01)} ${C}`}
              strokeDashoffset={s.offset}
            >
              <title>{`${data[i]?.label}: ${formatMoney(s.value, currency)}`}</title>
            </circle>
          ))}
        </g>
        <text className="centre-num" x="50" y="51">{data.length}</text>
        <text className="centre-sub" x="50" y="62">{data.length === 1 ? "category" : "categories"}</text>
      </svg>
      <ul className="legend">
        {data.map((d, i) => (
          <li key={d.label}>
            <span className={`dot ${cls(i, d.other)}`} />
            <span className="name">{d.label}</span>
            <span className="amt">{formatMoney(d.value, currency)}</span>
            <span className="pct">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
