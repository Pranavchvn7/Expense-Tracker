"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { safely, type ActionResult } from "@/lib/errors";
import { analyzeImport } from "@/lib/import";
import { getUserCurrency } from "@/lib/preferences";
import { formToObject, importInput } from "@/lib/validation";

export type ImportPreview = {
  totalRows: number;
  importable: number;
  duplicates: number;
  errorCount: number;
  errors: { line: number; message: string }[];
  unmatchedCategories: string[];
  sample: { date: string; text: string; minor: number; category: string }[];
};

/** Validate and summarise a CSV without saving anything. */
export async function previewImport(fd: FormData): Promise<ActionResult<ImportPreview>> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`import:preview:${userId}`, 30, 3600);
    const input = importInput.parse(formToObject(fd));
    const a = await analyzeImport(input);
    return {
      totalRows: a.totalRows,
      importable: a.toInsert.length,
      duplicates: a.duplicates,
      errorCount: a.errors.length,
      errors: a.errors.slice(0, 10),
      unmatchedCategories: a.unmatchedCategories,
      sample: a.toInsert.slice(0, 8).map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        text: r.text,
        minor: r.minor,
        category: r.category,
      })),
    };
  });
}

/** Re-validate the CSV from scratch and save every importable row in one transaction. */
export async function commitImport(fd: FormData): Promise<ActionResult<{ imported: number }>> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`import:commit:${userId}`, 10, 3600);
    const input = importInput.parse(formToObject(fd));
    const a = await analyzeImport(input);
    const currency = await getUserCurrency();

    const chunks: (typeof a.toInsert)[] = [];
    for (let i = 0; i < a.toInsert.length; i += 500) chunks.push(a.toInsert.slice(i, i + 500));

    await prisma.$transaction(
      chunks.map((rows) =>
        a.kind === "EXPENSE"
          ? prisma.expense.createMany({
              data: rows.map((r) => ({
                userId,
                categoryId: r.categoryId,
                amountMinor: r.minor,
                currency,
                description: r.text,
                note: r.note || null,
                spentOn: r.date,
              })),
            })
          : prisma.income.createMany({
              data: rows.map((r) => ({
                userId,
                amountMinor: r.minor,
                currency,
                source: r.text,
                note: r.note || null,
                receivedOn: r.date,
              })),
            }),
      ),
    );

    revalidatePath("/expenses");
    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { imported: a.toInsert.length };
  });
}
