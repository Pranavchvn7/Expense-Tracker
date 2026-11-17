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
  currency: currencySchema.default("INR"),
  description: cleanText(120),
  note: optionalCleanText(500),
  spentOn: dateSchema,
  categoryId: uuid.optional(),
});

export const expenseUpdate = expenseInput.extend({ id: uuid });

export const categoryInput = z.object({ name: cleanText(40) });

export const idInput = z.object({ id: uuid });

export const shareInput = z.object({
  month: monthSchema,
  days: z.coerce.number().int().min(1).max(30).default(7),
});

export const incomeInput = z.object({
  amount: amountSchema,
  currency: currencySchema.default("INR"),
  source: cleanText(80),
  note: optionalCleanText(500),
  receivedOn: dateSchema,
});

export const incomeUpdate = incomeInput.extend({ id: uuid });

/** ?cur= query value: a known currency or undefined. */
export function parseCurrencyParam(v: string | string[] | undefined) {
  const r = currencySchema.safeParse(Array.isArray(v) ? v[0] : v);
  return r.success ? r.data : undefined;
}

export const budgetInput = z.object({
  categoryId: uuid,
  amount: amountSchema,
  currency: currencySchema.default("INR"),
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
