import { z } from "zod";

// Strip control characters and normalise whitespace. Output encoding is handled
// by React (no dangerouslySetInnerHTML anywhere); this keeps stored data clean.
const CONTROL = /[\u0000-\u001F\u007F-\u009F‪-‮⁦-⁩]/g;
const cleanText = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(CONTROL, "").replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1).max(max));

const optionalCleanText = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(CONTROL, "").trim())
    .pipe(z.string().max(max))
    .optional()
    .transform((s) => (s ? s : undefined));

export const uuid = z.string().uuid();

/** An optional id from a <select>: the empty option ("Uncategorised") arrives as "" and means "none". */
export const optionalUuid = z.preprocess((v) => (v === "" ? undefined : v), uuid.optional());

/** "123.45" -> 12345 (integer minor units). Rejects >2 decimals, negatives, zero, absurd values. */
export const amountSchema = z
  .string()
  .trim()
  .regex(/^\d{1,9}(\.\d{1,2})?$/, "Invalid amount")
  .transform((s) => Math.round(Number(s) * 100))
  .pipe(z.number().int().min(1).max(999_999_999));

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "Invalid date")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`).getTime();
    const now = Date.now();
    return d <= now + 86_400_000 && d >= Date.UTC(2000, 0, 1);
  }, "Date out of range")
  .transform((s) => new Date(`${s}T00:00:00Z`));

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const currencySchema = z.enum(["INR", "USD", "EUR", "GBP"]);

export const expenseInput = z.object({
  amount: amountSchema,
  description: cleanText(120),
  note: optionalCleanText(500),
  spentOn: dateSchema,
  categoryId: optionalUuid,
});

export const expenseUpdate = expenseInput.extend({ id: uuid });

export const categoryInput = z.object({ name: cleanText(40) });

/** Currency is chosen once in Settings; entry forms never send one. */
export const currencyInput = z.object({ currency: currencySchema });

export const idInput = z.object({ id: uuid });

export const shareInput = z.object({
  month: monthSchema,
  days: z.coerce.number().int().min(1).max(30).default(7),
});

export const incomeInput = z.object({
  amount: amountSchema,
  source: cleanText(80),
  note: optionalCleanText(500),
  receivedOn: dateSchema,
});

export const incomeUpdate = incomeInput.extend({ id: uuid });

/** Recurring start date: at most a year back or ahead, so a rule cannot backfill thousands of rows. */
const ruleDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "Invalid date")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`).getTime();
    const now = Date.now();
    return Math.abs(d - now) <= 366 * 86_400_000;
  }, "Date out of range")
  .transform((s) => new Date(`${s}T00:00:00Z`));

const optionalRuleDate = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.union([z.literal(""), ruleDateSchema]))
  .optional()
  .transform((d) => (d instanceof Date ? d : undefined));

export const recurringCreate = z
  .object({
    kind: z.enum(["EXPENSE", "INCOME"]),
    amount: amountSchema,
    label: cleanText(80),
    note: optionalCleanText(500),
    categoryId: optionalUuid,
    frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
    startDate: ruleDateSchema,
    endDate: optionalRuleDate,
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: "End date is before start date",
    path: ["endDate"],
  });

/** Editing keeps kind, frequency and start date fixed; amount, label, category, note, end date change. */
export const recurringUpdate = z
  .object({
    id: uuid,
    amount: amountSchema,
    label: cleanText(80),
    note: optionalCleanText(500),
    categoryId: optionalUuid,
    endDate: optionalRuleDate,
  });

/** Goal target date: any day up to 50 years ahead (optional; empty string means none). */
const goalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "Invalid date")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`).getTime();
    return d >= Date.UTC(2000, 0, 1) && d <= Date.now() + 50 * 366 * 86_400_000;
  }, "Date out of range")
  .transform((s) => new Date(`${s}T00:00:00Z`));

const optionalGoalDate = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.union([z.literal(""), goalDateSchema]))
  .optional()
  .transform((d) => (d instanceof Date ? d : undefined));

export const goalInput = z.object({
  name: cleanText(80),
  target: amountSchema,
  targetDate: optionalGoalDate,
});

export const goalUpdate = goalInput.extend({ id: uuid });

export const contributionInput = z.object({
  goalId: uuid,
  amount: amountSchema,
  contributedOn: dateSchema,
});

/** CSV import. 80k characters keeps the request under the 100 kb server-action limit. */
export const importInput = z.object({
  kind: z.enum(["EXPENSE", "INCOME"]),
  dateFormat: z.enum(["YMD", "DMY", "MDY"]),
  csv: z.string().min(1).max(80_000),
});

export const budgetInput = z.object({
  categoryId: uuid,
  amount: amountSchema,
});

/**
 * Parse the expense list query string. Each field is validated on its own and falls back
 * to a safe default, so a tampered URL never throws and never reaches the database unchecked.
 */
type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseListQuery(sp: SearchParams, defaultMonth: string) {
  const month = monthSchema.safeParse(first(sp.month));
  const categoryId = uuid.safeParse(first(sp.categoryId));
  const page = z.coerce.number().int().min(1).max(400).safeParse(first(sp.page));
  const rawQ = first(sp.q);
  const q =
    typeof rawQ === "string" ? rawQ.replace(CONTROL, "").trim().slice(0, 60) : "";
  return {
    month: month.success ? month.data : defaultMonth,
    categoryId: categoryId.success ? categoryId.data : undefined,
    page: page.success ? page.data : 1,
    q: q || undefined,
  };
}

export const sessionRefInput = z.object({ ref: z.string().regex(/^[a-f0-9]{24}$/) });

export const deleteAccountInput = z.object({
  confirm: z.literal("DELETE"),
});

/** Convert FormData to a plain object of strings only (ignores files/unknown shapes). */
export function formToObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && k.length <= 40 && !k.startsWith("$ACTION")) out[k] = v;
  }
  return out;
}
