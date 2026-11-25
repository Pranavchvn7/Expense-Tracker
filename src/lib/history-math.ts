// Pure helpers for the client history, busiest months and lead-source summaries. No I/O here.

export interface MonthCount {
  month: string; // YYYY-MM
  count: number;
}

/** Most-booked months from job dates (YYYY-MM-DD). Ties go to the later month. */
export function busiestMonths(dates: string[], n: number): MonthCount[] {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const m = d.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(m)) continue;
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  return [...counts]
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => b.count - a.count || (a.month < b.month ? 1 : a.month > b.month ? -1 : 0))
    .slice(0, Math.max(0, n));
}

/** Newest first, grouped under their year. Items must carry a YYYY-MM-DD `date`. */
export function groupByYear<T extends { date: string }>(items: T[]): { year: string; items: T[] }[] {
  const sorted = [...items].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const out: { year: string; items: T[] }[] = [];
  for (const it of sorted) {
    const year = it.date.slice(0, 4);
    const last = out[out.length - 1];
    if (last && last.year === year) last.items.push(it);
    else out.push({ year, items: [it] });
  }
  return out;
}
