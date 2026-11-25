import { niceMax } from "@/lib/chart-math";
import { formatCompact, formatMoney, monthLabel } from "@/lib/money";

const W = 560;
const H = 240;
const PAD = { top: 16, right: 14, bottom: 28, left: 52 };

/**
 * Spending per day of the selected month. The biggest day is highlighted. Hovering a day
 * highlights its column and shows the amount, its share of the month and how it compares
 * with the daily average.
 */
export function DailyBars({ daily, month, currency }: { daily: number[]; month: string; currency: string }) {
  const max = niceMax(Math.max(...daily, 1));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / daily.length;
  const barW = Math.max(2, slot - 3);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const peak = Math.max(...daily);
  const peakIndex = peak > 0 ? daily.indexOf(peak) : -1;
  const total = daily.reduce((a, b) => a + b, 0);
  const avg = daily.length ? total / daily.length : 0;

  return (
    <svg className="barchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Spending per day in ${monthLabel(month)}`}>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line className="grid-line" x1={PAD.left} x2={W - PAD.right} y1={y(t * max)} y2={y(t * max)} />
          <text className="axis-text" x={PAD.left - 6} y={y(t * max) + 3} textAnchor="end">{formatCompact(t * max, currency)}</text>
        </g>
      ))}
      {daily.map((v, i) => {
        const share = total > 0 ? Math.round((v * 100) / total) : 0;
        const comparison =
          v === 0
            ? "No spending"
            : avg > 0
              ? `${v > avg ? "Above" : "Below"} the daily average of ${formatMoney(avg, currency)}`
              : "";
        return (
          <g key={i}>
            <rect
              className={i === peakIndex ? "bar-peak" : "bar-day"}
              x={PAD.left + slot * i + 1.5}
              y={y(v)}
              width={barW}
              height={Math.max(PAD.top + innerH - y(v), v > 0 ? 1 : 0)}
              rx="2"
              aria-hidden="true"
            />
            <rect className="hit-col" x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH}>
              <title>
                {[
                  `${monthLabel(month, true)} ${i + 1}`,
                  `Spent: ${formatMoney(v, currency)}`,
                  `${share}% of the month`,
                  comparison,
                ]
                  .filter(Boolean)
                  .join("\n")}
              </title>
            </rect>
          </g>
        );
      })}
      {avg > 0 && <line className="avg-line" x1={PAD.left} x2={W - PAD.right} y1={y(avg)} y2={y(avg)} strokeDasharray="4 4" />}
      {[1, 5, 10, 15, 20, 25, daily.length].filter((d, i, a) => a.indexOf(d) === i && d <= daily.length).map((d) => (
        <text key={d} className="axis-text" x={PAD.left + slot * (d - 1) + slot / 2} y={H - 6} textAnchor="middle">{d}</text>
      ))}
    </svg>
  );
}
