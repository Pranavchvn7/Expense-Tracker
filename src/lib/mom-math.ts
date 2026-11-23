/** Month-over-month comparison used by the dashboard hint. Pure, no imports. */
export type MomChange = { pct: number; direction: "lower" | "higher" | "same" };

/** null when there is nothing to compare against (no spending last month). */
export function compareSpending(current: number, previous: number): MomChange | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0 || current < 0) return null;
  const pct = Math.round((Math.abs(current - previous) / previous) * 100);
  if (pct === 0) return { pct: 0, direction: "same" };
  return { pct, direction: current < previous ? "lower" : "higher" };
}

export function momText(change: MomChange | null, prevLabel: string): string | null {
  if (!change) return null;
  if (change.direction === "same") return `About the same as ${prevLabel}`;
  return `${change.pct}% ${change.direction} than ${prevLabel}`;
}
