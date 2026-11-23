/**
 * Phone numbers are stored in a clean form: digits with an optional leading "+". Pure, no imports.
 * Accepts spaces, dashes, dots and brackets while typing; rejects letters and anything that is
 * not 7 to 15 digits (the international maximum).
 */
export function normalizePhone(raw: string): string | null {
  const s = raw.trim();
  if (!/^\+?[\d\s\-().]+$/.test(s)) return null;
  const hasPlus = s.startsWith("+");
  const digits = s.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `${hasPlus ? "+" : ""}${digits}`;
}
