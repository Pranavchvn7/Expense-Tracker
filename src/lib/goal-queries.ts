import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

/**
 * Goals with the amount saved so far (sum of contributions). `recent` adds each goal's last
 * three contributions. Every query is scoped to the session user.
 */
export async function listGoals(opts: { limit?: number; recent?: boolean } = {}) {
  const { userId } = await requireSession();
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 50,
    select: { id: true, name: true, targetMinor: true, currency: true, targetDate: true },
  });
  if (goals.length === 0) return [];
  const ids = goals.map((g) => g.id);

  const [sums, recent] = await Promise.all([
    prisma.goalContribution.groupBy({
      by: ["goalId"],
      where: { userId, goalId: { in: ids } },
      _sum: { amountMinor: true },
    }),
    opts.recent
      ? prisma.goalContribution.findMany({
          where: { userId, goalId: { in: ids } },
          orderBy: [{ contributedOn: "desc" }, { createdAt: "desc" }],
          take: 150,
          select: { id: true, goalId: true, amountMinor: true, contributedOn: true },
        })
      : Promise.resolve([]),
  ]);

  const saved = new Map(sums.map((s) => [s.goalId, s._sum.amountMinor ?? 0]));
  return goals.map((g) => ({
    ...g,
    savedMinor: saved.get(g.id) ?? 0,
    recent: recent.filter((r) => r.goalId === g.id).slice(0, 3),
  }));
}

export async function getGoal(id: string) {
  const { userId } = await requireSession();
  return prisma.savingsGoal.findFirst({
    where: { id, userId },
    select: { id: true, name: true, targetMinor: true, targetDate: true },
  });
}
