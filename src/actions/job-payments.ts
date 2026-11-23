"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { safely, type ActionResult, limitReached } from "@/lib/errors";
import { getUserCurrency } from "@/lib/preferences";
import { assertOwnJob } from "@/lib/ownership";
import { paymentSource } from "@/lib/pay-math";
import { formToObject, jobPaymentInput } from "@/lib/validation";

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
