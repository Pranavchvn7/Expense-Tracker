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
