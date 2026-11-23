/** Job payment rules that need no database. Pure, no imports, covered by a node test. */

export const PAYMENT_KINDS = ["ADVANCE", "PARTIAL", "FINAL"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export const KIND_LABEL: Record<PaymentKind, string> = {
  ADVANCE: "Advance",
  PARTIAL: "Part payment",
  FINAL: "Final payment",
};

export type PayState = "none" | "unpaid" | "part" | "paid" | "over";

export interface PaySummary {
  state: PayState;
  paidMinor: number;
  balanceMinor: number; // what is still owed, never negative
  overMinor: number; // paid beyond the agreed amount, never negative
  label: string;
}

/** What has been paid against the agreed amount. agreed 0 means "no price agreed yet". */
export function paySummary(agreedMinor: number, paidMinor: number): PaySummary {
  const agreed = Math.max(0, Math.trunc(agreedMinor) || 0);
  const paid = Math.max(0, Math.trunc(paidMinor) || 0);
  if (agreed === 0) {
    return { state: "none", paidMinor: paid, balanceMinor: 0, overMinor: 0, label: paid > 0 ? "Paid, no price set" : "No price set" };
  }
  if (paid === 0) return { state: "unpaid", paidMinor: 0, balanceMinor: agreed, overMinor: 0, label: "Unpaid" };
  if (paid < agreed) return { state: "part", paidMinor: paid, balanceMinor: agreed - paid, overMinor: 0, label: "Part paid" };
  if (paid === agreed) return { state: "paid", paidMinor: paid, balanceMinor: 0, overMinor: 0, label: "Paid in full" };
  return { state: "over", paidMinor: paid, balanceMinor: 0, overMinor: paid - agreed, label: "Overpaid" };
}

/** Pre-selected kind for the next payment: the first is an advance, later ones are part payments. */
export function suggestKind(paidSoFarMinor: number): PaymentKind {
  return paidSoFarMinor > 0 ? "PARTIAL" : "ADVANCE";
}

/** Amount to pre-fill: what is left to pay, or empty when nothing is owed or no price is set. */
export function suggestAmountMinor(agreedMinor: number, paidMinor: number): number {
  return Math.max(0, Math.trunc(agreedMinor) - Math.trunc(paidMinor)) || 0;
}

/** "250.00" form value from minor units. */
export function toDecimalString(minor: number): string {
  const m = Math.max(0, Math.trunc(minor) || 0);
  return `${Math.floor(m / 100)}.${String(m % 100).padStart(2, "0")}`;
}

/** The Income "source" text stored for a payment: "Client · Job", cut to the 80-character column. */
export function paymentSource(clientName: string, jobTitle: string): string {
  const s = `${clientName} · ${jobTitle}`;
  return s.length <= 80 ? s : `${s.slice(0, 79)}…`;
}

/** Sum rows of {jobId, minor} into a plain map keyed by job id. */
export function sumByJob(rows: { jobId: string | null; minor: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) if (r.jobId) out[r.jobId] = (out[r.jobId] ?? 0) + r.minor;
  return out;
}

export const COST_KINDS = ["TRAVEL", "ASSISTANT", "PRODUCTS", "OTHER"] as const;
export type CostKind = (typeof COST_KINDS)[number];

export const COST_LABEL: Record<CostKind, string> = {
  TRAVEL: "Travel",
  ASSISTANT: "Assistant / helper",
  PRODUCTS: "Products",
  OTHER: "Other",
};

/** Expense description for a job cost: what the user typed, else "Kind – payee" or just the kind. */
export function costDescription(kind: CostKind, payee?: string | null, what?: string | null): string {
  const w = what?.trim();
  const base = w || (payee?.trim() ? `${COST_LABEL[kind]} – ${payee.trim()}` : COST_LABEL[kind]);
  return base.length <= 120 ? base : `${base.slice(0, 119)}…`;
}

export interface ProfitSummary {
  profitMinor: number; // received minus costs so far (can be negative)
  expectedMinor: number | null; // agreed minus costs, null when no price is agreed
}

/** Money kept so far, and what would be kept once the agreed amount is paid. */
export function profitSummary(agreedMinor: number, receivedMinor: number, costsMinor: number): ProfitSummary {
  const agreed = Math.max(0, Math.trunc(agreedMinor) || 0);
  const rec = Math.max(0, Math.trunc(receivedMinor) || 0);
  const costs = Math.max(0, Math.trunc(costsMinor) || 0);
  return { profitMinor: rec - costs, expectedMinor: agreed > 0 ? agreed - costs : null };
}
