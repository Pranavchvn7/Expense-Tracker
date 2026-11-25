/** Freelance report maths that need no database. Pure, no imports, covered by a node test. */

export interface Ranked {
  id: string;
  label: string;
  value: number;
}

/** Largest first, ties by label then id, at most n rows, zero and negative values dropped. */
export function topN(rows: Ranked[], n: number): Ranked[] {
  return rows
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, n));
}

/** Merge rows that share an id (several jobs of one client) by adding their values. */
export function mergeById(rows: Ranked[]): Ranked[] {
  const m = new Map<string, Ranked>();
  for (const r of rows) {
    const cur = m.get(r.id);
    if (cur) cur.value += r.value;
    else m.set(r.id, { ...r });
  }
  return [...m.values()];
}

export interface JobMoney {
  agreedMinor: number;
  receivedMinor: number;
  costsMinor: number;
}

export interface MoneyTotals {
  agreedMinor: number;
  receivedMinor: number;
  costsMinor: number;
  profitMinor: number; // received minus costs
  balanceMinor: number; // agreed minus received, per job, never negative, summed
}

/** Totals across jobs. Cancelled jobs should be filtered out by the caller when they owe nothing. */
export function totalsOf(jobs: JobMoney[]): MoneyTotals {
  const t: MoneyTotals = { agreedMinor: 0, receivedMinor: 0, costsMinor: 0, profitMinor: 0, balanceMinor: 0 };
  for (const j of jobs) {
    t.agreedMinor += j.agreedMinor;
    t.receivedMinor += j.receivedMinor;
    t.costsMinor += j.costsMinor;
    t.balanceMinor += Math.max(0, j.agreedMinor - j.receivedMinor);
  }
  t.profitMinor = t.receivedMinor - t.costsMinor;
  return t;
}

/** Share of a whole as a whole-number percent; 0 when the whole is 0. */
export function sharePct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part * 100) / whole) : 0;
}

/** Count items by a label, most common first (ties by label); blank labels are skipped. */
export function countBy(labels: (string | null | undefined)[], n: number): { label: string; count: number }[] {
  const m = new Map<string, number>();
  for (const l of labels) {
    const k = l?.trim();
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, Math.max(0, n));
}
