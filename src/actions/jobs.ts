"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError, notFound, safely, type ActionResult, limitReached } from "@/lib/errors";
import { getUserCurrency } from "@/lib/preferences";
import { assertOwnClient } from "@/lib/ownership";
import { formToObject, idInput, jobInput, jobStatusInput, jobUpdate } from "@/lib/validation";

const MAX_JOBS = 20_000;

function refresh(jobId?: string, clientId?: string) {
  revalidatePath("/jobs");
  if (jobId) revalidatePath(`/jobs/${jobId}`);
  if (clientId) revalidatePath(`/clients/${clientId}`);
}

export async function createJob(fd: FormData): Promise<ActionResult<{ id: string }>> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`job:create:${userId}`, 60, 60);
    const input = jobInput.parse(formToObject(fd));
    await assertOwnClient(userId, input.clientId);
    if ((await prisma.job.count({ where: { userId } })) >= MAX_JOBS) throw limitReached("jobs", MAX_JOBS);
    const created = await prisma.job.create({
      data: {
        userId,
        clientId: input.clientId,
        title: input.title,
        serviceType: input.serviceType ?? null,
        eventDate: input.eventDate,
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        location: input.location ?? null,
        status: input.status,
        agreedAmountMinor: input.agreed,
        currency: await getUserCurrency(),
        notes: input.notes ?? null,
      },
      select: { id: true },
    });
    refresh(undefined, input.clientId);
    return { id: created.id };
  });
}

export async function updateJob(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`job:update:${userId}`, 60, 60);
    const input = jobUpdate.parse(formToObject(fd));
    await assertOwnClient(userId, input.clientId);
    const before = await prisma.job.findFirst({ where: { id: input.id, userId }, select: { clientId: true } });
    if (!before) throw notFound();
    const res = await prisma.job.updateMany({
      where: { id: input.id, userId },
      data: {
        clientId: input.clientId,
        title: input.title,
        serviceType: input.serviceType ?? null,
        eventDate: input.eventDate,
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        location: input.location ?? null,
        status: input.status,
        agreedAmountMinor: input.agreed,
        notes: input.notes ?? null,
      },
    });
    if (res.count !== 1) throw notFound();
    refresh(input.id, input.clientId);
    if (before.clientId !== input.clientId) revalidatePath(`/clients/${before.clientId}`);
    return undefined;
  });
}

/** Quick status change (mark completed, cancel, reopen) from the list and the job page. */
export async function setJobStatus(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`job:status:${userId}`, 120, 60);
    const input = jobStatusInput.parse(formToObject(fd));
    const job = await prisma.job.findFirst({ where: { id: input.id, userId }, select: { clientId: true } });
    if (!job) throw notFound();
    const res = await prisma.job.updateMany({ where: { id: input.id, userId }, data: { status: input.status } });
    if (res.count !== 1) throw notFound();
    refresh(input.id, job.clientId);
    return undefined;
  });
}

/** Deletes a job. A job with payments is refused (cancel it instead) so money history is never orphaned. */
export async function deleteJob(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`job:delete:${userId}`, 30, 60);
    const { id } = idInput.parse(formToObject(fd));
    const job = await prisma.job.findFirst({ where: { id, userId }, select: { clientId: true } });
    if (!job) throw notFound();
    const payments = await prisma.income.count({ where: { userId, jobId: id } });
    if (payments > 0) {
      throw new HttpError(400, "This job has payments. Cancel the job instead, or delete its payments first.");
    }
    const res = await prisma.job.deleteMany({ where: { id, userId } });
    if (res.count !== 1) throw notFound();
    refresh(id, job.clientId);
    return undefined;
  });
}

