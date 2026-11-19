import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getUserCurrency } from "@/lib/preferences";
import { bucketByMonth } from "@/lib/chart-math";
import type { ReportRange } from "@/lib/report-range";

export const NO_CATEGORY = "none";

/**
 * Everything one report needs. Session first, userId in every filter, the user's own currency
 * only, explicit selects, and bounded work (range is capped at ~3 years by resolveRange).
 * `categoryIds` are untrusted: they only ever narrow the user's own rows.
 */
export async function getReport(range: ReportRange, categoryIds: string[], includeUncategorised: boolean) {
  const { userId } = await requireSession();
  const currency = await getUserCurrency();
  const filtered = categoryIds.length > 0 || includeUncategorised;

  const expenseWhere: Prisma.ExpenseWhereInput = {
    userId,
    currency,
    spentOn: { gte: range.start, lt: range.end },
    ...(filtered
      ? {
          OR: [
            ...(categoryIds.length ? [{ categoryId: { in: categoryIds } }] : []),
            ...(includeUncategorised ? [{ categoryId: null }] : []),
          ],
        }
      : {}),
  };
  const incomeWhere = { userId, currency, receivedOn: { gte: range.start, lt: range.end } };

  const [spent, income, byCategory, byPayment, expDaily, incDaily, top, cats] = await Promise.all([
    prisma.expense.aggregate({ where: expenseWhere, _sum: { amountMinor: true }, _count: { _all: true } }),
    prisma.income.aggregate({ where: incomeWhere, _sum: { amountMinor: true } }),
    prisma.expense.groupBy({ by: ["categoryId"], where: expenseWhere, _sum: { amountMinor: true }, _count: { _all: true } }),
    prisma.expense.groupBy({ by: ["paymentMethod"], where: expenseWhere, _sum: { amountMinor: true }, _count: { _all: true } }),
    prisma.expense.groupBy({ by: ["spentOn"], where: expenseWhere, _sum: { amountMinor: true } }),
    prisma.income.groupBy({ by: ["receivedOn"], where: incomeWhere, _sum: { amountMinor: true } }),
    prisma.expense.findMany({
      where: expenseWhere,
      orderBy: [{ amountMinor: "desc" }, { spentOn: "desc" }],
      take: 10,
      select: { id: true, description: true, amountMinor: true, spentOn: true, category: { select: { name: true, color: true } } },
    }),
    prisma.category.findMany({ where: { userId }, orderBy: { name: "asc" }, take: 50, select: { id: true, name: true, color: true } }),
  ]);

  const byId = new Map(cats.map((c) => [c.id, c]));
  const totalSpent = spent._sum.amountMinor ?? 0;
  const totalIncome = income._sum.amountMinor ?? 0;

  return {
    currency,
    allCategories: cats,
    filtered,
    spentMinor: totalSpent,
    incomeMinor: totalIncome,
    expenseCount: spent._count._all,
    categories: byCategory
      .map((r) => {
        const c = r.categoryId ? byId.get(r.categoryId) : undefined;
        return {
          label: r.categoryId ? (c?.name ?? "Other") : "Uncategorised",
          color: c?.color ?? 0,
          value: r._sum.amountMinor ?? 0,
          count: r._count._all,
        };
      })
      .sort((a, b) => b.value - a.value),
    payments: byPayment
      .map((r) => ({ method: r.paymentMethod, value: r._sum.amountMinor ?? 0, count: r._count._all }))
      .sort((a, b) => b.value - a.value),
    months: range.months,
    monthlySpent: bucketByMonth(expDaily.map((r) => ({ date: r.spentOn, minor: r._sum.amountMinor ?? 0 })), range.months),
    monthlyIncome: bucketByMonth(incDaily.map((r) => ({ date: r.receivedOn, minor: r._sum.amountMinor ?? 0 })), range.months),
    top: top.map((t) => ({
      description: t.description,
      amountMinor: t.amountMinor,
      date: t.spentOn.toISOString().slice(0, 10),
      category: t.category?.name ?? "Uncategorised",
    })),
  };
}

export type ReportData = Awaited<ReturnType<typeof getReport>>;
