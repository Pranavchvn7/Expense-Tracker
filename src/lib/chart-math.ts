// Pure helpers for the server-rendered SVG charts. No imports so they can be tested with plain node.

export type Slice = { value: number; dash: number; offset: number; share: number };

/** Turn values into donut arcs on a circle of the given circumference. */
export function donutSlices(values: number[], circumference: number): Slice[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  let acc = 0;
  return values.map((value) => {
    const share = value / total;
    const dash = share * circumference;
    const slice = { value, dash, offset: -acc, share };
    acc += dash;
    return slice;
  });
}

/** Round a maximum up to a "nice" axis top (1, 2, 2.5, 5 x 10^n). Never returns less than 1. */
export function niceMax(max: number): number {
  if (!Number.isFinite(max) || max <= 1) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (max <= step * pow) return step * pow;
  }
  return 10 * pow;
}

export function addMonthsKey(month: string, delta: number): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1;
  const d = new Date(Date.UTC(y, m + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** `count` consecutive month keys ending at endMonth, oldest first. */
export function monthKeys(endMonth: string, count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(addMonthsKey(endMonth, -i));
  return out;
}

/** Sum rows (date + minor units) into the given month keys. Rows outside the keys are ignored. */
export function bucketByMonth(
  rows: { date: Date; minor: number }[],
  keys: string[],
): number[] {
  const index = new Map(keys.map((k, i) => [k, i]));
  const totals = keys.map(() => 0);
  for (const r of rows) {
    const i = index.get(r.date.toISOString().slice(0, 7));
    if (i !== undefined) totals[i] = (totals[i] ?? 0) + r.minor;
  }
  return totals;
}

/** Keep the largest `max - 1` items and fold the rest into one "Other" item. */
export function collapseTop<T extends { label: string; value: number }>(
  items: T[],
  max: number,
): { label: string; value: number; other: boolean }[] {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  if (sorted.length <= max) return sorted.map((i) => ({ label: i.label, value: i.value, other: false }));
  const head = sorted.slice(0, max - 1).map((i) => ({ label: i.label, value: i.value, other: false }));
  const rest = sorted.slice(max - 1).reduce((a, b) => a + b.value, 0);
  return [...head, { label: "Other", value: rest, other: true }];
}
