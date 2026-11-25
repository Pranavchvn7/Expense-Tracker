/** The currencies a user can choose. One list for validation, the Settings picker and the type. */
export const CURRENCY_CODES = ["INR", "USD", "EUR", "GBP"] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const CURRENCY_OPTIONS: ReadonlyArray<{ code: CurrencyCode; name: string; symbol: string }> = [
  { code: "INR", name: "Indian rupee", symbol: "₹" },
  { code: "USD", name: "US dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British pound", symbol: "£" },
];
