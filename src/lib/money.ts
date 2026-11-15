export function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(minor / 100);
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}
