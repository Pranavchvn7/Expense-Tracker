"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError, notFound, safely, type ActionResult } from "@/lib/errors";
import { assertOwnCategory } from "@/lib/ownership";
import { getUserCurrency } from "@/lib/preferences";
import { formToObject, idInput, recurringCreate, recurringUpdate } from "@/lib/validation";

const MAX_RULES = 50;

function refresh() {
  revalidatePath("/recurring");
  revalidatePath("/expenses");
  revalidatePath("/income");
  revalidatePath("/dashboard");
}

export async function createRule(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`rule:create:${userId}`, 20, 60);
    const input = recurringCreate.parse(formToObject(fd));
    // A category only makes sense (and is only stored) for expenses.
    const categoryId = input.kind === "EXPENSE" ? input.categoryId : undefined;
    await assertOwnCategory(userId, categoryId);

    const count = await prisma.recurringRule.count({ where: { userId } });
    if (count >= MAX_RULES) throw new HttpError(400, "Recurring limit reached");

    await prisma.recurringRule.create({
      data: {
        userId,
        kind: input.kind,
        amountMinor: input.amount,
        currency: await getUserCurrency(),
        label: input.label,
        note: input.note ?? null,
        categoryId: categoryId ?? null,
        frequency: input.frequency,
        anchorDay: input.startDate.getUTCDate(),
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        nextDue: input.startDate,
      },
      select: { id: true },
    });
    refresh();
    return undefined;
  });
}

export async function updateRule(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`rule:update:${userId}`, 30, 60);
    const input = recurringUpdate.parse(formToObject(fd));

    const rule = await prisma.recurringRule.findFirst({
      where: { id: input.id, userId },
      select: { kind: true, startDate: true },
    });
    if (!rule) throw notFound();
    const categoryId = rule.kind === "EXPENSE" ? input.categoryId : undefined;
    await assertOwnCategory(userId, categoryId);
    if (input.endDate && input.endDate < rule.startDate) throw new HttpError(400, "Invalid input");

    // Only future occurrences change; rows already generated are left alone.
    const res = await prisma.recurringRule.updateMany({
      where: { id: input.id, userId },
      data: {
        amountMinor: input.amount,
        label: input.label,
        note: input.note ?? null,
        categoryId: categoryId ?? null,
        endDate: input.endDate ?? null,
      },
    });
    if (res.count !== 1) throw notFound();
    refresh();
    return undefined;
  });
}

export async function toggleRule(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`rule:toggle:${userId}`, 30, 60);
    const { id } = idInput.parse(formToObject(fd));
    const rule = await prisma.recurringRule.findFirst({
      where: { id, userId },
      select: { active: true },
    });
    if (!rule) throw notFound();
    // Resuming does not back-fill the paused time: nextDue stays where it was, so overdue
    // occurrences are generated on the next open. Delete and recreate to start fresh.
    const res = await prisma.recurringRule.updateMany({
      where: { id, userId },
      data: { active: !rule.active },
    });
    if (res.count !== 1) throw notFound();
    refresh();
    return undefined;
  });
}

export async function deleteRule(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`rule:delete:${userId}`, 30, 60);
    const { id } = idInput.parse(formToObject(fd));
    // Entries already generated stay (their link is cleared by the database).
    const res = await prisma.recurringRule.deleteMany({ where: { id, userId } });
    if (res.count !== 1) throw notFound();
    refresh();
    return undefined;
  });
}
