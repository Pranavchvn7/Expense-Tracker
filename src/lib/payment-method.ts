// Pure module (no imports): the payment methods an expense can be tagged with.

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CREDIT_CARD", label: "Credit card" },
  { value: "DEBIT_CARD", label: "Debit card" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "WALLET", label: "Wallet" },
  { value: "OTHER", label: "Other" },
] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"];
export const PAYMENT_METHOD_VALUES = PAYMENT_METHODS.map((m) => m.value) as [PaymentMethodValue, ...PaymentMethodValue[]];

export function isPaymentMethod(v: unknown): v is PaymentMethodValue {
  return typeof v === "string" && PAYMENT_METHODS.some((m) => m.value === v);
}

export function paymentLabel(v: string | null | undefined): string {
  return PAYMENT_METHODS.find((m) => m.value === v)?.label ?? "Not set";
}
