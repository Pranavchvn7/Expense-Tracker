import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { monthRange } from "@/lib/queries";
import { getUserCurrency } from "@/lib/preferences";

/**
 * Everything the Budgets page needs for one month, in the user's currency. Session first;
 * every query is scoped by userId; explicit selects.
 */
export async function getBudgetCards(month: string) {
  const { userId } = await requireSession();
  const currency = await getUserCurrency();
  const { start, end } = monthRange(month);

  const [budgets, spent, categories] = await Promise.all([
    prisma.budget.findMany({
      where: { userId, currency },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: { id: true, amountMinor: true, category: { select: { id: true, name: true, color: true } } },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { userId, currency, spentOn: { gte: start, lt: end } },
      _sum: { amountMinor: true },
      _count: { _all: true },
      _max: { amountMinor: true },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      take: 50,
      select: { id: true, name: true, color: true },
    }),
  ]);

  const byCat = new Map(
    spent.filter((r) => r.categoryId).map((r) => [r.categoryId as string, r]),
  );
  const budgetedIds = new Set(budgets.map((b) => b.category.id));

  const cards = budgets.map((b) => {
    const s = byCat.get(b.category.id);
    return {
      id: b.id,
      category: b.category,
      limitMinor: b.amountMinor,
      spentMinor: s?._sum.amountMinor ?? 0,
      count: s?._count._all ?? 0,
      largestMinor: s?._max.amountMinor ?? 0,
    };
  });

  return {
    currency,
    cards,
    // Categories that have no budget yet (offered in the add form) and what was spent in them.
    unbudgeted: categories
      .filter((c) => !budgetedIds.has(c.id))
      .map((c) => ({ ...c, spentMinor: byCat.get(c.id)?._sum.amountMinor ?? 0 })),
  };
}
