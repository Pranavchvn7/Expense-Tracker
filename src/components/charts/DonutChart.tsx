import { donutSlices } from "@/lib/chart-math";
import { colorClass } from "@/lib/category-color";
import { formatMoney } from "@/lib/money";

const R = 42;
const C = 2 * Math.PI * R;

type Item = { label: string; value: number; color: number };

/**
 * Server-rendered SVG donut. A category keeps the colour stored on it, so the same colour
 * appears on its tags everywhere. Small categories beyond the top seven fold into grey "Other".
 */
export function DonutChart({ items, currency }: { items: Item[]; currency: string }) {
  const sorted = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const data: { label: string; value: number; cls: string }[] =
    sorted.length <= 8
      ? sorted.map((i) => ({ label: i.label, value: i.value, cls: colorClass(i.color) }))
      : [
          ...sorted.slice(0, 7).map((i) => ({ label: i.label, value: i.value, cls: colorClass(i.color) })),
          { label: "Other", value: sorted.slice(7).reduce((a, b) => a + b.value, 0), cls: "c8" },
        ];
  const total = data.reduce((a, b) => a + b.value, 0);
  const slices = donutSlices(data.map((d) => d.value), C);

  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox="0 0 100 100" role="img" aria-label={`Spending by category, total ${formatMoney(total, currency)}`}>
        <circle className="track" cx="50" cy="50" r={R} strokeWidth="13" />
        <g transform="rotate(-90 50 50)">
          {slices.map((s, i) => (
            <circle
              key={i}
              className={`slice ${data[i]?.cls}`}
              cx="50"
              cy="50"
              r={R}
              strokeWidth="13"
              strokeDasharray={`${Math.max(s.dash - 0.8, 0.01)} ${C}`}
              strokeDashoffset={s.offset}
            >
              <title>{`${data[i]?.label}: ${formatMoney(s.value, currency)}`}</title>
            </circle>
          ))}
        </g>
        <text className="centre-num" x="50" y="50">{data.length}</text>
        <text className="centre-sub" x="50" y="62">{data.length === 1 ? "category" : "categories"}</text>
      </svg>
      <ul className="legend">
        {data.map((d) => (
          <li key={d.label}>
            <span className={`dot ${d.cls}`} />
            <span className="name">{d.label}</span>
            <span className="amt">{formatMoney(d.value, currency)}</span>
            <span className="pct">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
