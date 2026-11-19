// Pure notification rules (no imports).

export type BudgetLevel = "none" | "warn80" | "over100";

/** Which alert level a category has reached. Percentages are of the monthly limit. */
export function budgetLevel(spentMinor: number, limitMinor: number): BudgetLevel {
  if (limitMinor <= 0) return "none";
  if (spentMinor > limitMinor) return "over100";
  if (spentMinor * 100 >= limitMinor * 80) return "warn80";
  return "none";
}

/** Add whole days to a YYYY-MM-DD string. */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** True when a renewal falls exactly `daysAhead` days after the user's local today. */
export function isRenewalReminderDay(nextDueIso: string, userTodayIso: string, daysAhead = 2): boolean {
  return nextDueIso === addDaysIso(userTodayIso, daysAhead);
}

/** Notification text. Deliberately no amounts: lock screens are visible to other people. */
export function budgetMessage(category: string, level: Exclude<BudgetLevel, "none">, spentMinor: number, limitMinor: number) {
  const pct = Math.round((spentMinor * 100) / Math.max(limitMinor, 1));
  const title = level === "over100" ? "Budget exceeded" : "Budget at 80%";
  const body =
    level === "over100"
      ? `You have gone over your ${category} budget this month (${pct}%).`
      : `${category} is at ${pct}% of this month's budget.`;
  return { title, body };
}

export function renewalMessage(label: string, daysAhead: number) {
  return { title: "Renewal coming up", body: `${label} renews in ${daysAhead} day${daysAhead === 1 ? "" : "s"}.` };
}
