"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError, notFound, safely, type ActionResult, limitReached } from "@/lib/errors";
import { getUserCurrency } from "@/lib/preferences";
import { assertOwnCategory } from "@/lib/ownership";
import { budgetInput, formToObject, idInput } from "@/lib/validation";

const MAX_BUDGETS = 100;

/** Create or update the monthly budget for one category and currency. */
export async function setBudget(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`budget:set:${userId}`, 30, 60);
    const input = budgetInput.parse(formToObject(fd));
    await assertOwnCategory(userId, input.categoryId);
    const currency = await getUserCurrency();

    const count = await prisma.budget.count({ where: { userId } });
    if (count >= MAX_BUDGETS) throw limitReached("budgets", MAX_BUDGETS);

    await prisma.budget.upsert({
      where: {
        userId_categoryId_currency: {
          userId,
          categoryId: input.categoryId,
          currency,
        },
      },
      create: {
        userId,
        categoryId: input.categoryId,
        currency,
        amountMinor: input.amount,
      },
      update: { amountMinor: input.amount },
      select: { id: true },
    });
    revalidatePath("/settings");
    revalidatePath("/budgets");
    revalidatePath("/dashboard");
    return undefined;
  });
}

export async function deleteBudget(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`budget:delete:${userId}`, 30, 60);
    const { id } = idInput.parse(formToObject(fd));
    const res = await prisma.budget.deleteMany({ where: { id, userId } });
    if (res.count !== 1) throw notFound();
    revalidatePath("/settings");
    revalidatePath("/budgets");
    revalidatePath("/dashboard");
    return undefined;
  });
}
