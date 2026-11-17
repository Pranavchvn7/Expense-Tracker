export function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(minor / 100);
}

/** Short form for chart axes: 1.2L / 45K style via Intl compact notation. */
export function formatCompact(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(minor / 100);
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11" -> "Nov 2026" (or "Nov" when short). Input is validated upstream. */
export function monthLabel(month: string, short = false): string {
  const y = month.slice(0, 4);
  const m = Number(month.slice(5, 7));
  const name = MONTHS[m - 1] ?? month;
  return short ? name : `${name} ${y}`;
}
