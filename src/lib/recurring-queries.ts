import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function listRules(page: number, perPage: number) {
  const { userId } = await requireSession();
  const rows = await prisma.recurringRule.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { nextDue: "asc" }, { id: "asc" }],
    skip: (page - 1) * perPage,
    take: perPage + 1,
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
      category: { select: { name: true, color: true } },
    },
  });
  return { rows: rows.slice(0, perPage), hasNext: rows.length > perPage };
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
