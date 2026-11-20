"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { notFound, safely, type ActionResult, limitReached } from "@/lib/errors";
import { getUserCurrency } from "@/lib/preferences";
import { assertOwnCategory } from "@/lib/ownership";
import { checkBudgetAlert } from "@/lib/notify";
import { expenseCreate, expenseUpdate, formToObject, idInput, reconcileInput } from "@/lib/validation";

const MAX_EXPENSES_PER_USER = 50_000;

export async function createExpense(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`expense:create:${userId}`, 60, 60);
    const input = expenseCreate.parse(formToObject(fd));
    await assertOwnCategory(userId, input.categoryId);

    const total = await prisma.expense.count({ where: { userId } });
    if (total >= MAX_EXPENSES_PER_USER) throw limitReached("expenses", MAX_EXPENSES_PER_USER);

    try {
    await prisma.expense.create({
      data: {
        userId,
        clientRef: input.clientRef ?? null,
        categoryId: input.categoryId ?? null,
        amountMinor: input.amount,
        currency: await getUserCurrency(),
        description: input.description,
        note: input.note ?? null,
        spentOn: input.spentOn,
        paymentMethod: input.paymentMethod ?? null,
      },
      select: { id: true },
    });
    } catch (err) {
      // Same offline entry sent again (retry after a dropped connection): already stored.
      if ((err as { code?: string }).code === "P2002" && input.clientRef) return undefined;
      throw err;
    }
    // After the response: a failed alert must never fail or slow the save.
    after(() => checkBudgetAlert(userId, input.categoryId, input.spentOn).catch(() => console.error("[budget-alert-error]")));
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return undefined;
  });
}

export async function updateExpense(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`expense:update:${userId}`, 60, 60);
    const input = expenseUpdate.parse(formToObject(fd));
    await assertOwnCategory(userId, input.categoryId);

    // userId in WHERE: an attacker cannot touch another tenant's row by guessing an id.
    const res = await prisma.expense.updateMany({
      where: { id: input.id, userId },
      data: {
        categoryId: input.categoryId ?? null,
        amountMinor: input.amount,
        // currency is intentionally not editable: it was fixed when the entry was created
        description: input.description,
        note: input.note ?? null,
        spentOn: input.spentOn,
        paymentMethod: input.paymentMethod ?? null,
      },
    });
    if (res.count !== 1) throw notFound();
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return undefined;
  });
}

/** Mark an expense as matched (or not) against a bank or card statement. */
export async function setReconciled(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`expense:reconcile:${userId}`, 120, 60);
    const input = reconcileInput.parse(formToObject(fd));
    const res = await prisma.expense.updateMany({
      where: { id: input.id, userId },
      data: { reconciled: input.reconciled === "1" },
    });
    if (res.count !== 1) throw notFound();
    revalidatePath("/expenses");
    return undefined;
  });
}

export async function deleteExpense(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`expense:delete:${userId}`, 60, 60);
    const { id } = idInput.parse(formToObject(fd));
    const res = await prisma.expense.deleteMany({ where: { id, userId } });
    if (res.count !== 1) throw notFound();
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return undefined;
  });
}
