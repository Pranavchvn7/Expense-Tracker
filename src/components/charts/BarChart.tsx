import { niceMax } from "@/lib/chart-math";
import { formatCompact, formatMoney, monthLabel } from "@/lib/money";

const W = 560;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 48 };

/** Server-rendered income-vs-spend bars for the last months. Pure SVG, classes for colour. */
export function BarChart({
  months,
  income,
  spent,
  currency,
}: {
  months: string[];
  income: number[];
  spent: number[];
  currency: string;
}) {
  const max = niceMax(Math.max(...income, ...spent, 1));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const groupW = innerW / months.length;
  const barW = Math.min(22, groupW / 3);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  return (
    <svg
      className="barchart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Income and spending for the last ${months.length} months`}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid-line" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
          <text className="axis-text" x={PAD.left - 6} y={y(t) + 3} textAnchor="end">
            {formatCompact(t, currency)}
          </text>
        </g>
      ))}
      {months.map((m, i) => {
        const cx = PAD.left + groupW * i + groupW / 2;
        const inc = income[i] ?? 0;
        const sp = spent[i] ?? 0;
        return (
          <g key={m}>
            <rect className="bar-income" x={cx - barW - 1} y={y(inc)} width={barW} height={Math.max(PAD.top + innerH - y(inc), 0)} rx="3">
              <title>{`${monthLabel(m)} income: ${formatMoney(inc, currency)}`}</title>
            </rect>
            <rect className="bar-spend" x={cx + 1} y={y(sp)} width={barW} height={Math.max(PAD.top + innerH - y(sp), 0)} rx="3">
              <title>{`${monthLabel(m)} spent: ${formatMoney(sp, currency)}`}</title>
            </rect>
            <text className="axis-text" x={cx} y={H - 8} textAnchor="middle">
              {monthLabel(m, true)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
