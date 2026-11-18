// Pure mapping/validation of parsed CSV rows into typed records. No imports, no I/O.

export type Kind = "EXPENSE" | "INCOME";
export type DateFormat = "YMD" | "DMY" | "MDY";

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

const ALIASES = {
  date: ["date", "transactiondate", "txndate", "spenton", "receivedon", "day", "valuedate", "posteddate", "bookingdate"],
  text: ["description", "desc", "details", "narration", "memo", "merchant", "payee", "name", "particulars", "transactiondetails", "source", "from", "title"],
  amount: ["amount", "amt", "value", "total", "sum"],
  category: ["category", "cat"],
  note: ["note", "notes", "remarks", "comment", "comments"],
} as const;

export type Columns = { date: number; text: number; amount: number; category: number; note: number };

/** Find each column by header name. Returns an error message when a required one is missing. */
export function mapColumns(header: string[], kind: Kind): { cols: Columns } | { error: string } {
  const names = header.map(norm);
  const find = (list: readonly string[], prefer?: string) => {
    if (prefer) {
      const p = names.indexOf(prefer);
      if (p >= 0) return p;
    }
    return names.findIndex((n) => list.includes(n));
  };
  const date = find(ALIASES.date);
  const text = find(ALIASES.text, kind === "INCOME" ? "source" : "description");
  const amount = find(ALIASES.amount);
  const missing: string[] = [];
  if (date < 0) missing.push("Date");
  if (text < 0) missing.push(kind === "INCOME" ? "Source (or Description)" : "Description");
  if (amount < 0) missing.push("Amount");
  if (missing.length) return { error: `Missing column: ${missing.join(", ")}` };
  return { cols: { date, text, amount, category: find(ALIASES.category), note: find(ALIASES.note) } };
}

/** "1,234.50", "₹ 1,23,456.00", "$12" -> minor units. Rejects zero, negatives and junk. */
export function parseAmount(raw: string): { minor: number } | { error: string } {
  let s = raw.trim().replace(/^[₹$€£]\s*/, "").replace(/\s*(INR|USD|EUR|GBP)$/i, "").replace(/^\+/, "");
  if (s.startsWith("-") || /^\(.*\)$/.test(s)) return { error: "Negative amounts are not imported" };
  // Thousands separators only: 1,234.50 (western) or 1,23,456.50 (Indian). "12,34" stays invalid.
  if (/^(\d{1,3}(,\d{3})+|\d{1,2}(,\d{2})*,\d{3})(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return { error: "Amount is not a valid number" };
  const minor = Math.round(Number(s) * 100);
  if (minor < 1 || minor > 999_999_999) return { error: "Amount out of range" };
  return { minor };
}

/** Parse a date in the chosen format (separators / - . accepted). Must be a real day from 2000 to tomorrow. */
export function parseDate(raw: string, fmt: DateFormat, now = new Date()): { date: Date } | { error: string } {
  const m = raw.trim().match(/^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})$/);
  if (!m) return { error: "Date format not recognised" };
  const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let y: number, mo: number, d: number;
  if (fmt === "YMD") [y, mo, d] = [a, b, c];
  else if (fmt === "DMY") [d, mo, y] = [a, b, c];
  else [mo, d, y] = [a, b, c];
  if (String(y).length !== 4 && !(fmt === "YMD" ? m[1]!.length === 4 : m[3]!.length === 4)) {
    return { error: "Year must have 4 digits" };
  }
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
    return { error: "Not a real date" };
  }
  if (date.getTime() < Date.UTC(2000, 0, 1) || date.getTime() > now.getTime() + 86_400_000) {
    return { error: "Date out of range" };
  }
  return { date };
}

const CONTROL = /[\u0000-\u001F\u007F-\u009F‪-‮⁦-⁩]/g;

/** Strip control characters, collapse spaces, undo the export's formula-guard apostrophe, cap the length. */
export function cleanCell(raw: string, max: number): string {
  let s = raw.replace(CONTROL, " ").replace(/\s+/g, " ").trim();
  if (/^'[=+\-@]/.test(s)) s = s.slice(1);
  return s.slice(0, max);
}

export type ImportRow = {
  line: number;
  date: Date;
  minor: number;
  text: string;
  category: string;
  note: string;
};

export type RowError = { line: number; message: string };

export function mapRows(
  rows: string[][],
  cols: Columns,
  kind: Kind,
  fmt: DateFormat,
  now = new Date(),
): { ok: ImportRow[]; errors: RowError[] } {
  const ok: ImportRow[] = [];
  const errors: RowError[] = [];
  const textMax = kind === "INCOME" ? 80 : 120;
  rows.forEach((r, i) => {
    const line = i + 2; // header is line 1
    const cell = (idx: number) => (idx >= 0 ? (r[idx] ?? "") : "");
    const date = parseDate(cell(cols.date), fmt, now);
    if ("error" in date) return void errors.push({ line, message: date.error });
    const amount = parseAmount(cell(cols.amount));
    if ("error" in amount) return void errors.push({ line, message: amount.error });
    const text = cleanCell(cell(cols.text), textMax);
    if (!text) return void errors.push({ line, message: "Description is empty" });
    ok.push({
      line,
      date: date.date,
      minor: amount.minor,
      text,
      category: cleanCell(cell(cols.category), 40),
      note: cleanCell(cell(cols.note), 500),
    });
  });
  return { ok, errors };
}
