import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getUserCurrency } from "@/lib/preferences";

const GOAL_SELECT = { id: true, name: true, targetMinor: true, currency: true, targetDate: true } as const;
const MAX_CONTRIBUTIONS_PER_GOAL = 100;

async function withSaved<T extends { id: string }>(userId: string, goals: T[], includeContributions: boolean) {
  if (goals.length === 0) return [];
  const ids = goals.map((g) => g.id);
  const [sums, contributions] = await Promise.all([
    prisma.goalContribution.groupBy({
      by: ["goalId"],
      where: { userId, goalId: { in: ids } },
      _sum: { amountMinor: true },
    }),
    includeContributions
      ? prisma.goalContribution.findMany({
          where: { userId, goalId: { in: ids } },
          orderBy: [{ contributedOn: "desc" }, { createdAt: "desc" }],
          take: ids.length * MAX_CONTRIBUTIONS_PER_GOAL,
          select: { id: true, goalId: true, amountMinor: true, contributedOn: true },
        })
      : Promise.resolve([]),
  ]);
  const saved = new Map(sums.map((s) => [s.goalId, s._sum.amountMinor ?? 0]));
  return goals.map((g) => ({
    ...g,
    savedMinor: saved.get(g.id) ?? 0,
    contributions: contributions.filter((c) => c.goalId === g.id).slice(0, MAX_CONTRIBUTIONS_PER_GOAL),
  }));
}

/** A page of goals with every contribution (newest first, scrollable in the UI). */
export async function listGoalsPage(page: number, perPage: number) {
  const { userId } = await requireSession();
  const rows = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * perPage,
    take: perPage + 1,
    select: GOAL_SELECT,
  });
  const goals = await withSaved(userId, rows.slice(0, perPage), true);
  return { goals, hasNext: rows.length > perPage };
}

/** Compact list for the dashboard carousel (no contributions). */
export async function listGoals(limit = 12) {
  const { userId } = await requireSession();
  const rows = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: limit,
    select: GOAL_SELECT,
  });
  return withSaved(userId, rows, false);
}

export async function getGoal(id: string) {
  const { userId } = await requireSession();
  return prisma.savingsGoal.findFirst({
    where: { id, userId },
    select: { id: true, name: true, targetMinor: true, targetDate: true },
  });
}

/**
 * Average monthly spending over the last three complete months (user's currency), used to size
 * an emergency fund. Returns null when there is no history yet.
 */
export async function averageMonthlySpend(currentMonth: string): Promise<number | null> {
  const { userId } = await requireSession();
  const currency = await getUserCurrency();
  const end = new Date(`${currentMonth}-01T00:00:00Z`);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 3, 1));
  const agg = await prisma.expense.aggregate({
    where: { userId, currency, spentOn: { gte: start, lt: end } },
    _sum: { amountMinor: true },
  });
  const total = agg._sum.amountMinor ?? 0;
  return total > 0 ? Math.round(total / 3) : null;
}
