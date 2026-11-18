"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError, notFound, safely, type ActionResult, limitReached } from "@/lib/errors";
import { getUserCurrency } from "@/lib/preferences";
import { contributionInput, formToObject, goalInput, goalUpdate, idInput } from "@/lib/validation";

const MAX_GOALS = 50;
const MAX_CONTRIBUTIONS = 5_000;

function refresh() {
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function createGoal(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`goal:create:${userId}`, 20, 60);
    const input = goalInput.parse(formToObject(fd));
    if ((await prisma.savingsGoal.count({ where: { userId } })) >= MAX_GOALS) {
      throw limitReached("savings goals", MAX_GOALS);
    }
    await prisma.savingsGoal.create({
      data: {
        userId,
        name: input.name,
        targetMinor: input.target,
        currency: await getUserCurrency(),
        targetDate: input.targetDate ?? null,
      },
      select: { id: true },
    });
    refresh();
    return undefined;
  });
}

export async function updateGoal(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`goal:update:${userId}`, 30, 60);
    const input = goalUpdate.parse(formToObject(fd));
    const res = await prisma.savingsGoal.updateMany({
      where: { id: input.id, userId },
      data: { name: input.name, targetMinor: input.target, targetDate: input.targetDate ?? null },
    });
    if (res.count !== 1) throw notFound();
    refresh();
    return undefined;
  });
}

export async function deleteGoal(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`goal:delete:${userId}`, 30, 60);
    const { id } = idInput.parse(formToObject(fd));
    // Contributions are removed with the goal by the database cascade.
    const res = await prisma.savingsGoal.deleteMany({ where: { id, userId } });
    if (res.count !== 1) throw notFound();
    refresh();
    return undefined;
  });
}

export async function addContribution(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`goal:contribute:${userId}`, 60, 60);
    const input = contributionInput.parse(formToObject(fd));
    // The goal id came from the client: it must be one of the caller's own goals.
    const goal = await prisma.savingsGoal.findFirst({
      where: { id: input.goalId, userId },
      select: { id: true },
    });
    if (!goal) throw notFound();
    if ((await prisma.goalContribution.count({ where: { userId } })) >= MAX_CONTRIBUTIONS) {
      throw limitReached("contributions", MAX_CONTRIBUTIONS);
    }
    await prisma.goalContribution.create({
      data: {
        userId,
        goalId: goal.id,
        amountMinor: input.amount,
        contributedOn: input.contributedOn,
      },
      select: { id: true },
    });
    refresh();
    return undefined;
  });
}

export async function deleteContribution(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`goal:uncontribute:${userId}`, 60, 60);
    const { id } = idInput.parse(formToObject(fd));
    const res = await prisma.goalContribution.deleteMany({ where: { id, userId } });
    if (res.count !== 1) throw notFound();
    refresh();
    return undefined;
  });
}
