// Pure budget maths (no imports). All money is integer minor units.

export type BudgetStatus = "ok" | "warn" | "over";

export type BudgetStats = {
  pct: number; // may exceed 100
  remaining: number; // negative when over
  over: boolean;
  status: BudgetStatus;
  dailyAverage: number; // spent so far / days elapsed
  projected: number; // spending at the current pace by month end (current month only)
  safePerDay: number | null; // what can still be spent per remaining day (current month only)
  daysLeft: number | null;
};

/**
 * `dayOfMonth` is the 1-based day for the month being viewed when it is the current month,
 * or null for a finished month (no projection is made then).
 */
export function budgetStats(limit: number, spent: number, daysInMonth: number, dayOfMonth: number | null): BudgetStats {
  const safeLimit = Math.max(limit, 1);
  const pct = Math.round((spent * 100) / safeLimit);
  const remaining = limit - spent;
  const over = spent > limit;
  const status: BudgetStatus = over ? "over" : pct >= 80 ? "warn" : "ok";
  const elapsed = dayOfMonth === null ? daysInMonth : Math.min(Math.max(dayOfMonth, 1), daysInMonth);
  const dailyAverage = Math.round(spent / elapsed);
  if (dayOfMonth === null) {
    return { pct, remaining, over, status, dailyAverage, projected: spent, safePerDay: null, daysLeft: null };
  }
  const daysLeft = daysInMonth - elapsed;
  return {
    pct,
    remaining,
    over,
    status,
    dailyAverage,
    projected: Math.round((spent / elapsed) * daysInMonth),
    safePerDay: daysLeft > 0 && remaining > 0 ? Math.floor(remaining / daysLeft) : remaining > 0 ? remaining : 0,
    daysLeft,
  };
}
