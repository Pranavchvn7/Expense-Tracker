// Pure goal-suggestion maths (no imports). Money in integer minor units. Guidance only:
// these are rules of thumb, not financial advice.

/** Emergency fund: 3 to 6 months of essential spending. */
export function emergencyFund(avgMonthlyMinor: number) {
  const m = Math.max(0, Math.round(avgMonthlyMinor));
  return { threeMonths: m * 3, sixMonths: m * 6 };
}

/** Level monthly payment on a loan. Annual rate in percent; 0 means interest-free. */
export function loanPayment(principalMinor: number, annualRatePct: number, months: number): number {
  if (principalMinor <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r <= 0) return Math.round(principalMinor / months);
  const f = Math.pow(1 + r, months);
  return Math.round((principalMinor * r * f) / (f - 1));
}

/**
 * The 20/4/10 rule for buying a car: at least 20% down, a loan of at most 4 years, and total
 * car costs (loan payment, insurance, fuel) of at most 10% of gross monthly income.
 */
export function carRule(priceMinor: number, annualRatePct: number) {
  const price = Math.max(0, Math.round(priceMinor));
  const downPayment = Math.round(price * 0.2);
  const loan = price - downPayment;
  const monthlyPayment = loanPayment(loan, annualRatePct, 48);
  return {
    downPayment,
    loan,
    termMonths: 48,
    monthlyPayment,
    // Income at which the loan payment alone is 10% of gross income (insurance and fuel come on top).
    minMonthlyIncome: monthlyPayment * 10,
  };
}

/** Typical house deposit: 20% avoids extra mortgage insurance in many countries. */
export function homeDeposit(priceMinor: number) {
  return Math.round(Math.max(0, priceMinor) * 0.2);
}

export type StaticTemplate = { id: string; name: string; blurb: string };

export const STATIC_TEMPLATES: StaticTemplate[] = [
  { id: "vacation", name: "Vacation", blurb: "Flights, stay and spending money. Add a target date to see the monthly amount." },
  { id: "education", name: "Education fund", blurb: "Fees or a course. Starting early keeps the monthly amount small." },
  { id: "gadget", name: "New laptop or phone", blurb: "Save instead of borrowing for something that loses value." },
  { id: "wedding", name: "Wedding or big celebration", blurb: "Agree a budget first, then work backwards from the date." },
  { id: "debt", name: "Debt-free fund", blurb: "A lump sum to clear a card or loan faster and cut interest." },
];
