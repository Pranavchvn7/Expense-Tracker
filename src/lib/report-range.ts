// Pure module (no imports): turn untrusted ?period=&month=&year=&from=&to= into a safe date range.

export type ReportKind = "month" | "year" | "custom";

export type ReportRange = {
  kind: ReportKind;
  start: Date; // inclusive, UTC midnight
  end: Date; // exclusive, UTC midnight
  startIso: string;
  endIso: string; // inclusive last day shown
  label: string;
  months: string[]; // YYYY-MM keys from start to end (never beyond today's month)
};

export type RangeInput = { period?: string; month?: string; year?: string; from?: string; to?: string };

const MAX_DAYS = 1100;
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

function parseDate(s: string | undefined): Date | null {
  const m = s ? DATE.exec(s) : null;
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
  const date = utc(y, mo, d);
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo || date.getUTCDate() !== d) return null;
  return y >= 2000 ? date : null;
}

function monthsBetween(start: Date, lastDay: Date): string[] {
  const out: string[] = [];
  let y = start.getUTCFullYear(), m = start.getUTCMonth();
  const endKey = lastDay.getUTCFullYear() * 12 + lastDay.getUTCMonth();
  while (y * 12 + m <= endKey && out.length < 40) {
    out.push(`${y}-${String(m + 1).padStart(2, "0")}`);
    m += 1;
    if (m === 12) { m = 0; y += 1; }
  }
  return out;
}

function build(kind: ReportKind, start: Date, lastDay: Date, label: string, todayIso: string): ReportRange {
  const shownLast = iso(lastDay) > todayIso ? (parseDate(todayIso) as Date) : lastDay;
  return {
    kind,
    start,
    end: utc(lastDay.getUTCFullYear(), lastDay.getUTCMonth(), lastDay.getUTCDate() + 1),
    startIso: iso(start),
    endIso: iso(lastDay),
    label,
    months: monthsBetween(start, shownLast < start ? start : shownLast),
  };
}

/** Always returns a usable range. `notice` explains a fallback so the page can tell the user why. */
export function resolveRange(input: RangeInput, todayIso: string): { range: ReportRange; notice?: string } {
  const today = parseDate(todayIso) as Date;
  const thisMonth = todayIso.slice(0, 7);
  const monthRange = (key: string) => {
    const [y, m] = [Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1];
    return build("month", utc(y, m, 1), utc(y, m + 1, 0), `${MONTH_NAMES[m]} ${y}`, todayIso);
  };
  const fallback = (notice: string) => ({ range: monthRange(thisMonth), notice });

  if (input.period === "year") {
    const y = /^\d{4}$/.test(input.year ?? "") ? Number(input.year) : today.getUTCFullYear();
    if (y < 2000 || y > today.getUTCFullYear()) return fallback("Choose a year between 2000 and this year.");
    return { range: build("year", utc(y, 0, 1), utc(y, 11, 31), String(y), todayIso) };
  }

  if (input.period === "custom") {
    const from = parseDate(input.from);
    const to = parseDate(input.to);
    if (!from || !to) return fallback("Enter both dates of the custom range, for example 2026-04-01.");
    if (from > to) return fallback("The start date must be on or before the end date.");
    const clamped = to > today ? today : to;
    if (from > clamped) return fallback("The range starts in the future, so there is nothing to report yet.");
    const days = Math.round((clamped.getTime() - from.getTime()) / 86_400_000) + 1;
    if (days > MAX_DAYS) return fallback("Custom ranges can cover at most about three years. Use a shorter range.");
    return {
      range: build("custom", from, clamped, `${iso(from)} to ${iso(clamped)}`, todayIso),
      notice: to > today ? "The end date was in the future, so the report stops at today." : undefined,
    };
  }

  // Month (default)
  if (input.month === undefined || input.month === "") return { range: monthRange(thisMonth) };
  const m = MONTH.exec(input.month);
  if (!m) return fallback("Choose a month in the form 2026-04.");
  if (input.month > thisMonth) return fallback("That month has not happened yet, so this month is shown.");
  if (Number(m[1]) < 2000) return fallback("Choose a month from the year 2000 onwards.");
  return { range: monthRange(input.month) };
}

/**
 * Standard PDF fonts only cover Latin-1. Anything else (rupee sign, emoji, other scripts) would
 * make the PDF library throw, so unsupported characters become "?" and control characters go.
 */
export function pdfSafe(text: string): string {
  let out = "";
  for (const ch of text) {
    const c = ch.codePointAt(0) as number;
    if (c === 0x20 || (c > 0x20 && c < 0x7f) || (c >= 0xa1 && c <= 0xff)) out += ch;
    else if (c === 0xa0 || c === 0x09) out += " ";
    else if (c < 0x20 || c === 0x7f || (c >= 0x80 && c < 0xa0)) out += "";
    else out += "?";
  }
  return out;
}

/** Plain-ASCII money for PDFs: "INR 1,23,456.00" (currency symbols are outside Latin-1). */
export function pdfMoney(minor: number, currency: string): string {
  const neg = minor < 0;
  const n = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(minor) / 100);
  return `${neg ? "-" : ""}${pdfSafe(currency)} ${n}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Read the report filters from a query string. Everything is shape-checked; junk is dropped. */
export function parseReportQuery(sp: SP): { input: RangeInput; categoryIds: string[]; includeNone: boolean } {
  const raw = sp.cat === undefined ? [] : Array.isArray(sp.cat) ? sp.cat : [sp.cat];
  const ids = new Set<string>();
  let includeNone = false;
  for (const c of raw.slice(0, 60)) {
    if (c === "none") includeNone = true;
    else if (UUID.test(c)) ids.add(c.toLowerCase());
  }
  const clip = (v: string | undefined) => (v ?? "").slice(0, 10);
  return {
    input: { period: one(sp.period), month: clip(one(sp.month)), year: clip(one(sp.year)), from: clip(one(sp.from)), to: clip(one(sp.to)) },
    categoryIds: [...ids].slice(0, 50),
    includeNone,
  };
}
