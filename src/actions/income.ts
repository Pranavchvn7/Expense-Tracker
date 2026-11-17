"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { notFound, safely, type ActionResult } from "@/lib/errors";
import { formToObject, idInput, incomeInput, incomeUpdate } from "@/lib/validation";

const MAX_INCOME_PER_USER = 20_000;

function refresh() {
  revalidatePath("/income");
  revalidatePath("/dashboard");
}

export async function createIncome(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`income:create:${userId}`, 60, 60);
    const input = incomeInput.parse(formToObject(fd));

    const total = await prisma.income.count({ where: { userId } });
    if (total >= MAX_INCOME_PER_USER) throw notFound();

    await prisma.income.create({
      data: {
        userId,
        amountMinor: input.amount,
        currency: input.currency,
        source: input.source,
        note: input.note ?? null,
        receivedOn: input.receivedOn,
      },
      select: { id: true },
    });
    refresh();
    return undefined;
  });
}

export async function updateIncome(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`income:update:${userId}`, 60, 60);
    const input = incomeUpdate.parse(formToObject(fd));
    const res = await prisma.income.updateMany({
      where: { id: input.id, userId },
      data: {
        amountMinor: input.amount,
        currency: input.currency,
        source: input.source,
        note: input.note ?? null,
        receivedOn: input.receivedOn,
      },
    });
    if (res.count !== 1) throw notFound();
    refresh();
    return undefined;
  });
}

export async function deleteIncome(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`income:delete:${userId}`, 60, 60);
    const { id } = idInput.parse(formToObject(fd));
    const res = await prisma.income.deleteMany({ where: { id, userId } });
    if (res.count !== 1) throw notFound();
    refresh();
    return undefined;
  });
}
