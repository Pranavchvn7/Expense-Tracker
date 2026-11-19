// Pure debt maths (no imports). Money in integer minor units; rates in basis points
// (1250 = 12.50% a year). Guidance only: your lender's statement is the source of truth.

export type DebtTerms = { originalMinor: number; aprBp: number; startDate: Date };
export type PaymentIn = { id: string; paidOn: Date; amountMinor: number; interestOverrideMinor: number | null };

export type LedgerRow = {
  id: string;
  paidOn: Date;
  amountMinor: number;
  interestMinor: number;
  principalMinor: number; // can be negative when a payment does not cover the interest
  balanceAfterMinor: number;
  days: number;
};

const DAY = 86_400_000;
export const daysBetween = (a: Date, b: Date) => Math.max(0, Math.round((b.getTime() - a.getTime()) / DAY));

/** Simple daily interest: balance x rate x days / 365. */
export function accruedInterest(balanceMinor: number, aprBp: number, from: Date, to: Date): number {
  if (balanceMinor <= 0) return 0;
  return Math.round((balanceMinor * (aprBp / 10_000) * daysBetween(from, to)) / 365);
}

/**
 * Replay the payments in date order. Each payment pays the interest that built up since the
 * previous payment first (or the exact interest from the statement if the user entered it);
 * the rest reduces the principal. Recomputed from scratch each time, so back-dated entries and
 * deletions can never leave stale numbers behind.
 */
export function buildLedger(debt: DebtTerms, payments: PaymentIn[]) {
  let balance = debt.originalMinor;
  let prev = debt.startDate;
  let overpaid = false;
  const rows: LedgerRow[] = [];
  for (const p of payments) {
    const days = daysBetween(prev, p.paidOn);
    let interest =
      p.interestOverrideMinor !== null
        ? Math.min(Math.max(p.interestOverrideMinor, 0), p.amountMinor)
        : accruedInterest(balance, debt.aprBp, prev, p.paidOn);
    let principal = p.amountMinor - interest;
    if (principal > balance) {
      overpaid = true;
      principal = Math.max(balance, 0);
      interest = p.amountMinor - principal;
    }
    balance -= principal;
    rows.push({ id: p.id, paidOn: p.paidOn, amountMinor: p.amountMinor, interestMinor: interest, principalMinor: principal, balanceAfterMinor: balance, days });
    if (p.paidOn > prev) prev = p.paidOn;
  }
  const totalPaid = rows.reduce((a, r) => a + r.amountMinor, 0);
  const totalInterest = rows.reduce((a, r) => a + r.interestMinor, 0);
  return {
    rows,
    balanceMinor: balance,
    totalPaidMinor: totalPaid,
    totalInterestMinor: totalInterest,
    totalPrincipalMinor: totalPaid - totalInterest,
    overpaid,
    lastPaymentOn: rows.length ? (rows[rows.length - 1] as LedgerRow).paidOn : debt.startDate,
  };
}

/** Percentage of the original amount repaid (0-100). */
export function paidOffPercent(originalMinor: number, balanceMinor: number): number {
  if (originalMinor <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round(((originalMinor - balanceMinor) * 100) / originalMinor)));
}

export type Projection = { months: number | null; totalInterestMinor: number; neverPaysOff: boolean };

/** Months and total interest to clear `balance` paying a fixed amount each month (monthly compounding). */
export function projectPayoff(balanceMinor: number, aprBp: number, monthlyMinor: number, maxMonths = 600): Projection {
  if (balanceMinor <= 0) return { months: 0, totalInterestMinor: 0, neverPaysOff: false };
  const r = aprBp / 10_000 / 12;
  let balance = balanceMinor;
  let interestTotal = 0;
  for (let m = 1; m <= maxMonths; m++) {
    const interest = Math.round(balance * r);
    if (monthlyMinor <= interest && m === 1 && r > 0) return { months: null, totalInterestMinor: 0, neverPaysOff: true };
    balance += interest;
    interestTotal += interest;
    const pay = Math.min(monthlyMinor, balance);
    balance -= pay;
    if (balance <= 0) return { months: m, totalInterestMinor: interestTotal, neverPaysOff: false };
  }
  return { months: null, totalInterestMinor: interestTotal, neverPaysOff: true };
}

/** What paying `extra` more each month saves, compared with the current payment. */
export function whatIf(balanceMinor: number, aprBp: number, monthlyMinor: number, extraMinor: number) {
  const base = projectPayoff(balanceMinor, aprBp, monthlyMinor);
  const faster = projectPayoff(balanceMinor, aprBp, monthlyMinor + Math.max(extraMinor, 0));
  const ok = base.months !== null && faster.months !== null;
  return {
    base,
    faster,
    monthsSaved: ok ? (base.months as number) - (faster.months as number) : null,
    interestSavedMinor: ok ? base.totalInterestMinor - faster.totalInterestMinor : null,
  };
}

/** Avalanche: highest rate first (cheapest overall). Snowball: smallest balance first (quick wins). */
export function orderDebts<T extends { aprBp: number; balanceMinor: number }>(debts: T[], strategy: "avalanche" | "snowball"): T[] {
  return [...debts]
    .filter((d) => d.balanceMinor > 0)
    .sort((a, b) => (strategy === "avalanche" ? b.aprBp - a.aprBp || a.balanceMinor - b.balanceMinor : a.balanceMinor - b.balanceMinor || b.aprBp - a.aprBp));
}

/** Add whole months to a date (UTC), clamping to the end of shorter months. */
export function addMonths(d: Date, n: number): Date {
  const day = d.getUTCDate();
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(day, last));
  return t;
}
