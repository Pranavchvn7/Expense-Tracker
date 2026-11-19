import { monotonePath, niceMax } from "@/lib/chart-math";
import { formatCompact, formatMoney, monthLabel } from "@/lib/money";

const W = 560;
const H = 240;
const PAD = { top: 16, right: 14, bottom: 28, left: 52 };

/**
 * Income vs spending as two smooth gradient areas. Server-rendered SVG: colours and gradients
 * come from CSS classes (no inline styles), values appear in hover/tap tooltips.
 */
export function AreaChart({
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
  const base = PAD.top + innerH;
  const x = (i: number) => PAD.left + (months.length === 1 ? innerW / 2 : (innerW * i) / (months.length - 1));
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const pts = (arr: number[]) => arr.map((v, i) => ({ x: x(i), y: y(v) }));
  const incPts = pts(income);
  const spPts = pts(spent);
  const area = (p: { x: number; y: number }[]) =>
    p.length ? `${monotonePath(p)} L ${p[p.length - 1]!.x} ${base} L ${p[0]!.x} ${base} Z` : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  return (
    <svg className="areachart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Income and spending over the last ${months.length} months`}>
      <defs>
        <linearGradient id="grad-income" x1="0" y1="0" x2="0" y2="1">
          <stop className="stop-income" offset="0%" stopOpacity="0.38" />
          <stop className="stop-income" offset="100%" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="grad-spend" x1="0" y1="0" x2="0" y2="1">
          <stop className="stop-spend" offset="0%" stopOpacity="0.38" />
          <stop className="stop-spend" offset="100%" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid-line" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
          <text className="axis-text" x={PAD.left - 8} y={y(t) + 3} textAnchor="end">{formatCompact(t, currency)}</text>
        </g>
      ))}
      <path d={area(incPts)} fill="url(#grad-income)" />
      <path d={area(spPts)} fill="url(#grad-spend)" />
      <path className="line-income" d={monotonePath(incPts)} fill="none" strokeWidth="2.5" strokeLinecap="round" />
      <path className="line-spend" d={monotonePath(spPts)} fill="none" strokeWidth="2.5" strokeLinecap="round" />
      {months.map((m, i) => (
        <g key={m}>
          <text className="axis-text" x={x(i)} y={H - 8} textAnchor="middle">{monthLabel(m, true)}</text>
          <circle className="dot-income" cx={x(i)} cy={y(income[i] ?? 0)} r="4">
            <title>{`${monthLabel(m)} income: ${formatMoney(income[i] ?? 0, currency)}`}</title>
          </circle>
          <circle className="dot-spend" cx={x(i)} cy={y(spent[i] ?? 0)} r="4">
            <title>{`${monthLabel(m)} spent: ${formatMoney(spent[i] ?? 0, currency)}`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}
