"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { safely, type ActionResult, limitReached } from "@/lib/errors";
import { getUserCurrency } from "@/lib/preferences";
import { assertOwnJob } from "@/lib/ownership";
import { costDescription, paymentSource } from "@/lib/pay-math";
import { formToObject, jobCostInput, jobPaymentInput } from "@/lib/validation";

const MAX_INCOME_PER_USER = 20_000;

/**
 * Records money received for a job. It is stored as an ordinary Income row (so the dashboard,
 * budgets, reports and CSV include it) with a link to the job. Deleting or editing the payment
 * is done from the job page or the Income page with the existing income actions.
 */
export async function addJobPayment(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`jobpay:create:${userId}`, 60, 60);
    const input = jobPaymentInput.parse(formToObject(fd));
    const job = await assertOwnJob(userId, input.jobId);
    if ((await prisma.income.count({ where: { userId } })) >= MAX_INCOME_PER_USER) {
      throw limitReached("income entries", MAX_INCOME_PER_USER);
    }
    await prisma.income.create({
      data: {
        userId,
        jobId: job.id,
        paymentKind: input.kind,
        amountMinor: input.amount,
        currency: await getUserCurrency(),
        source: paymentSource(job.client.name, job.title),
        note: input.note ?? null,
        receivedOn: input.receivedOn,
      },
      select: { id: true },
    });
    revalidatePath(`/jobs/${job.id}`);
    revalidatePath("/jobs");
    revalidatePath(`/clients/${job.clientId}`);
    revalidatePath("/income");
    revalidatePath("/dashboard");
    return undefined;
  });
}

const MAX_EXPENSES_PER_USER = 50_000;

/**
 * Records a cost of doing a job (travel, assistant payment, products). Stored as an ordinary
 * Expense with a link to the job, so the dashboard, budgets and reports include it.
 */
export async function addJobCost(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`jobcost:create:${userId}`, 60, 60);
    const input = jobCostInput.parse(formToObject(fd));
    const job = await assertOwnJob(userId, input.jobId);
    if ((await prisma.expense.count({ where: { userId } })) >= MAX_EXPENSES_PER_USER) {
      throw limitReached("expenses", MAX_EXPENSES_PER_USER);
    }
    await prisma.expense.create({
      data: {
        userId,
        jobId: job.id,
        costKind: input.kind,
        payee: input.payee ?? null,
        amountMinor: input.amount,
        currency: await getUserCurrency(),
        description: costDescription(input.kind, input.payee, input.description),
        spentOn: input.spentOn,
      },
      select: { id: true },
    });
    revalidatePath(`/jobs/${job.id}`);
    revalidatePath("/jobs");
    revalidatePath(`/clients/${job.clientId}`);
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return undefined;
  });
}
