"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError, notFound, safely, type ActionResult, limitReached } from "@/lib/errors";
import { getUserCurrency } from "@/lib/preferences";
import { buildLedger } from "@/lib/debt-math";
import { debtInput, debtPaymentInput, debtUpdate, formToObject, idInput } from "@/lib/validation";

const MAX_DEBTS = 30;
const MAX_PAYMENTS_PER_DEBT = 2_000;

function refresh() {
  revalidatePath("/debts");
}

export async function createDebt(fd: FormData): Promise<ActionResult<{ id: string }>> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`debt:create:${userId}`, 20, 60);
    const input = debtInput.parse(formToObject(fd));
    if ((await prisma.debt.count({ where: { userId } })) >= MAX_DEBTS) throw limitReached("debts", MAX_DEBTS);
    const created = await prisma.debt.create({
      data: {
        userId,
        name: input.name,
        kind: input.kind,
        currency: await getUserCurrency(),
        originalMinor: input.original,
        aprBp: input.apr,
        minPaymentMinor: input.minPayment,
        startDate: input.startDate,
      },
      select: { id: true },
    });
    refresh();
    return { id: created.id };
  });
}

export async function updateDebt(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`debt:update:${userId}`, 30, 60);
    const input = debtUpdate.parse(formToObject(fd));
    const res = await prisma.debt.updateMany({
      where: { id: input.id, userId },
      data: {
        name: input.name,
        kind: input.kind,
        originalMinor: input.original,
        aprBp: input.apr,
        minPaymentMinor: input.minPayment,
        startDate: input.startDate,
      },
    });
    if (res.count !== 1) throw notFound();
    refresh();
    return undefined;
  });
}

export async function deleteDebt(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`debt:delete:${userId}`, 30, 60);
    const { id } = idInput.parse(formToObject(fd));
    // Payments go with the debt through the database cascade.
    const res = await prisma.debt.deleteMany({ where: { id, userId } });
    if (res.count !== 1) throw notFound();
    refresh();
    return undefined;
  });
}

export async function addDebtPayment(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`debt:pay:${userId}`, 60, 60);
    const input = debtPaymentInput.parse(formToObject(fd));

    // The debt id came from the client: it must be one of the caller's own debts.
    const debt = await prisma.debt.findFirst({
      where: { id: input.debtId, userId },
      select: { id: true, originalMinor: true, aprBp: true, startDate: true, currency: true },
    });
    if (!debt) throw notFound();
    if (input.paidOn < debt.startDate) {
      throw new HttpError(400, `The payment date is before the debt started (${debt.startDate.toISOString().slice(0, 10)}). Pick a later date or change the start date of the debt.`);
    }
    if (input.interest !== undefined && input.interest > input.amount) {
      throw new HttpError(400, "The interest part cannot be more than the payment itself.");
    }

    const existing = await prisma.debtPayment.findMany({
      where: { userId, debtId: debt.id },
      orderBy: [{ paidOn: "asc" }, { createdAt: "asc" }],
      take: MAX_PAYMENTS_PER_DEBT + 1,
      select: { id: true, paidOn: true, amountMinor: true, interestOverrideMinor: true },
    });
    if (existing.length >= MAX_PAYMENTS_PER_DEBT) throw limitReached("payments for one debt", MAX_PAYMENTS_PER_DEBT);

    // Replay with the new payment: a payment larger than what is still owed is refused.
    const probe = buildLedger(debt, [
      ...existing,
      { id: "new", paidOn: input.paidOn, amountMinor: input.amount, interestOverrideMinor: input.interest ?? null },
    ].sort((a, b) => a.paidOn.getTime() - b.paidOn.getTime()));
    if (probe.overpaid) {
      throw new HttpError(400, "That payment is more than you still owe on this debt (including interest). Lower the amount or check the interest part.");
    }

    await prisma.debtPayment.create({
      data: {
        userId,
        debtId: debt.id,
        paidOn: input.paidOn,
        amountMinor: input.amount,
        interestOverrideMinor: input.interest ?? null,
        note: input.note ?? null,
      },
      select: { id: true },
    });
    refresh();
    return undefined;
  });
}

export async function deleteDebtPayment(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`debt:unpay:${userId}`, 60, 60);
    const { id } = idInput.parse(formToObject(fd));
    const res = await prisma.debtPayment.deleteMany({ where: { id, userId } });
    if (res.count !== 1) throw notFound();
    refresh();
    return undefined;
  });
}
