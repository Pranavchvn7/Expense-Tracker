import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function listRules() {
  const { userId } = await requireSession();
  return prisma.recurringRule.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { nextDue: "asc" }],
    take: 50,
    select: {
      id: true,
      kind: true,
      amountMinor: true,
      currency: true,
      label: true,
      frequency: true,
      nextDue: true,
      endDate: true,
      active: true,
      category: { select: { name: true } },
    },
  });
}

export async function getRule(id: string) {
  const { userId } = await requireSession();
  return prisma.recurringRule.findFirst({
    where: { id, userId },
    select: {
      id: true,
      kind: true,
      amountMinor: true,
      label: true,
      note: true,
      categoryId: true,
      frequency: true,
      startDate: true,
      endDate: true,
    },
  });
}
