// Pure helpers for savings goals (no imports; tested with plain node).

/** Whole months from today to the target date, at least 1. Null when there is no date or it has passed. */
export function monthsLeft(targetDate: Date | null, today: Date): number | null {
  if (!targetDate) return null;
  const days = (targetDate.getTime() - today.getTime()) / 86_400_000;
  if (days <= 0) return null;
  return Math.max(1, Math.ceil(days / 30.4375));
}

/** Minor units to set aside per month to reach the target on time; null if done, no date, or overdue. */
export function monthlyNeeded(remainingMinor: number, targetDate: Date | null, today: Date): number | null {
  if (remainingMinor <= 0) return null;
  const m = monthsLeft(targetDate, today);
  return m === null ? null : Math.ceil(remainingMinor / m);
}

/** 0..100 integer percentage, capped. */
export function percent(savedMinor: number, targetMinor: number): number {
  if (targetMinor <= 0) return 0;
  return Math.min(100, Math.floor((savedMinor * 100) / targetMinor));
}
