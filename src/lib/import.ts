import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { HttpError } from "@/lib/errors";
import { parseCsv } from "@/lib/csv-parse";
import { mapColumns, mapRows, type DateFormat, type ImportRow, type Kind, type RowError } from "@/lib/import-map";

export const MAX_IMPORT_ROWS = 1000;
const MAX_EXPENSES = 50_000;
const MAX_INCOME = 20_000;

export type Analysis = {
  userId: string;
  kind: Kind;
  /** Rows that will be inserted (valid and not already in the account). */
  toInsert: (ImportRow & { categoryId: string | null })[];
  errors: RowError[];
  duplicates: number;
  unmatchedCategories: string[];
  totalRows: number;
};

/**
 * Parse, validate and de-duplicate an uploaded CSV for the signed-in user. Used by both the
 * preview and the commit: the commit never trusts what the preview showed, it re-runs this.
 * Nothing in the file is executed or stored as-is: every cell is cleaned and length-capped.
 */
export async function analyzeImport(input: { kind: Kind; dateFormat: DateFormat; csv: string }): Promise<Analysis> {
  const { userId } = await requireSession();
  const { rows, tooManyRows } = parseCsv(input.csv, MAX_IMPORT_ROWS);
  if (tooManyRows) throw new HttpError(400, `The file has more than ${MAX_IMPORT_ROWS.toLocaleString("en-US")} rows. Split it into smaller files and import them one at a time.`);
  const [header, ...data] = rows;
  if (!header || data.length === 0) throw new HttpError(400, "The file has a header row but no data rows. Add at least one row below the column names.");

  const mapped = mapColumns(header, input.kind);
  if ("error" in mapped) throw new HttpError(400, mapped.error);
  const { ok, errors } = mapRows(data, mapped.cols, input.kind, input.dateFormat);

  // Categories apply to expenses only. Match by name (case-insensitive) against the user's own.
  const catIds = new Map<string, string>();
  if (input.kind === "EXPENSE") {
    const cats = await prisma.category.findMany({ where: { userId }, select: { id: true, name: true } });
    for (const c of cats) catIds.set(c.name.toLowerCase(), c.id);
  }
  const unmatched = new Set<string>();
  const withCat = ok.map((r) => {
    const id = input.kind === "EXPENSE" && r.category ? (catIds.get(r.category.toLowerCase()) ?? null) : null;
    if (input.kind === "EXPENSE" && r.category && !id) unmatched.add(r.category);
    return { ...r, categoryId: id };
  });

  // Skip rows already in the account (same date, amount and text), counting repeats so two
  // identical purchases in the file are still both imported when none exist yet.
  let duplicates = 0;
  let toInsert = withCat;
  if (withCat.length > 0) {
    const from = new Date(Math.min(...withCat.map((r) => r.date.getTime())));
    const to = new Date(Math.max(...withCat.map((r) => r.date.getTime())));
    const existing =
      input.kind === "EXPENSE"
        ? (
            await prisma.expense.findMany({
              where: { userId, spentOn: { gte: from, lte: to } },
              select: { spentOn: true, amountMinor: true, description: true },
              take: 20_000,
            })
          ).map((e) => ({ date: e.spentOn, minor: e.amountMinor, text: e.description }))
        : (
            await prisma.income.findMany({
              where: { userId, receivedOn: { gte: from, lte: to } },
              select: { receivedOn: true, amountMinor: true, source: true },
              take: 20_000,
            })
          ).map((e) => ({ date: e.receivedOn, minor: e.amountMinor, text: e.source }));
    const key = (d: Date, m: number, t: string) => `${d.toISOString().slice(0, 10)}|${m}|${t.toLowerCase()}`;
    const counts = new Map<string, number>();
    for (const e of existing) counts.set(key(e.date, e.minor, e.text), (counts.get(key(e.date, e.minor, e.text)) ?? 0) + 1);
    toInsert = withCat.filter((r) => {
      const k = key(r.date, r.minor, r.text);
      const n = counts.get(k) ?? 0;
      if (n > 0) {
        counts.set(k, n - 1);
        duplicates++;
        return false;
      }
      return true;
    });
  }

  // Same per-account caps as manual entry.
  const current =
    input.kind === "EXPENSE"
      ? await prisma.expense.count({ where: { userId } })
      : await prisma.income.count({ where: { userId } });
  if (current + toInsert.length > (input.kind === "EXPENSE" ? MAX_EXPENSES : MAX_INCOME)) {
    throw new HttpError(400, "Importing this file would take you over the entry limit for your account. Delete old entries or import fewer rows.");
  }

  return {
    userId,
    kind: input.kind,
    toInsert,
    errors,
    duplicates,
    unmatchedCategories: [...unmatched].slice(0, 10),
    totalRows: data.length,
  };
}
