import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { monthRange } from "@/lib/queries";
import { bucketByMonth, monthKeys } from "@/lib/chart-math";
import { getUserCurrency } from "@/lib/preferences";

// Every query: session first, userId in where, explicit select.

export async function getDashboardData(month: string) {
  const { userId } = await requireSession();
  const { start, end } = monthRange(month);
  // The currency comes from Settings (database), never from the URL or the client.
  const currency = await getUserCurrency();

  const keys = monthKeys(month, 6);
  const trendStart = new Date(`${keys[0] ?? month}-01T00:00:00Z`);

  // Entries recorded in some other currency are not mixed into the totals; they are counted so
  // the page can say so instead of silently hiding money. All queries run in parallel.
  const [spentAgg, incomeAgg, byCategory, expTrend, incTrend, otherExp, otherInc, cats] = await Promise.all([
    prisma.expense.aggregate({
      where: { userId, currency, spentOn: { gte: start, lt: end } },
      _sum: { amountMinor: true },
      _count: { _all: true },
    }),
    prisma.income.aggregate({
      where: { userId, currency, receivedOn: { gte: start, lt: end } },
      _sum: { amountMinor: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { userId, currency, spentOn: { gte: start, lt: end } },
      _sum: { amountMinor: true },
      _count: { _all: true },
    }),
    prisma.expense.groupBy({
      by: ["spentOn"],
      where: { userId, currency, spentOn: { gte: trendStart, lt: end } },
      _sum: { amountMinor: true },
    }),
    prisma.income.groupBy({
      by: ["receivedOn"],
      where: { userId, currency, receivedOn: { gte: trendStart, lt: end } },
      _sum: { amountMinor: true },
    }),
    prisma.expense.count({ where: { userId, currency: { not: currency } } }),
    prisma.income.count({ where: { userId, currency: { not: currency } } }),
    prisma.category.findMany({ where: { userId }, take: 50, select: { id: true, name: true, color: true } }),
  ]);
  const byId = new Map(cats.map((c) => [c.id, c]));

  // Day-by-day spending for the selected month, taken from the same rows as the trend.
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const daily = Array.from({ length: daysInMonth }, () => 0);
  for (const r of expTrend) {
    if (r.spentOn >= start && r.spentOn < end) {
      const i = r.spentOn.getUTCDate() - 1;
      daily[i] = (daily[i] ?? 0) + (r._sum.amountMinor ?? 0);
    }
  }

  return {
    currency,
    otherCurrencyEntries: otherExp + otherInc,
    spentMinor: spentAgg._sum.amountMinor ?? 0,
    incomeMinor: incomeAgg._sum.amountMinor ?? 0,
    expenseCount: spentAgg._count._all,
    categories: byCategory.map((r) => {
      const c = r.categoryId ? byId.get(r.categoryId) : undefined;
      return {
        id: r.categoryId,
        label: r.categoryId ? (c?.name ?? "Other") : "Uncategorised",
        color: c?.color ?? 0,
        value: r._sum.amountMinor ?? 0,
        count: r._count._all,
      };
    }),
    daily,
    trend: {
      months: keys,
      spent: bucketByMonth(
        expTrend.map((r) => ({ date: r.spentOn, minor: r._sum.amountMinor ?? 0 })),
        keys,
      ),
      income: bucketByMonth(
        incTrend.map((r) => ({ date: r.receivedOn, minor: r._sum.amountMinor ?? 0 })),
        keys,
      ),
    },
  };
}

/** One page of the month's expenses for the dashboard list (same currency as the totals). */
export async function listRecentExpenses(month: string, page: number, perPage: number) {
  const { userId } = await requireSession();
  const currency = await getUserCurrency();
  const { start, end } = monthRange(month);
  const rows = await prisma.expense.findMany({
    where: { userId, currency, spentOn: { gte: start, lt: end } },
    orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * perPage,
    take: perPage + 1,
    select: {
      id: true,
      amountMinor: true,
      description: true,
      spentOn: true,
      category: { select: { name: true, color: true } },
    },
  });
  return { rows: rows.slice(0, perPage), hasNext: rows.length > perPage, currency };
}

export async function listIncome(month: string, page: number, perPage: number) {
  const { userId } = await requireSession();
  const { start, end } = monthRange(month);
  const where = { userId, receivedOn: { gte: start, lt: end } };
  const [rows, totals] = await Promise.all([
    prisma.income.findMany({
      where,
      orderBy: [{ receivedOn: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage + 1,
      select: {
        id: true,
        amountMinor: true,
        currency: true,
        source: true,
        note: true,
        receivedOn: true,
        recurringRuleId: true,
        paymentKind: true,
        job: { select: { id: true, title: true, client: { select: { name: true } } } },
      },
    }),
    prisma.income.groupBy({ by: ["currency"], where, _sum: { amountMinor: true } }),
  ]);
  return { rows: rows.slice(0, perPage), hasNext: rows.length > perPage, totals };
}

export async function getIncome(id: string) {
  const { userId } = await requireSession();
  return prisma.income.findFirst({
    where: { id, userId },
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      source: true,
      note: true,
      receivedOn: true,
    },
  });
}

/** Largest expenses and spending per payment method for the month (dashboard cards). */
export async function getMonthHighlights(month: string) {
  const { userId } = await requireSession();
  const currency = await getUserCurrency();
  const { start, end } = monthRange(month);
  const where = { userId, currency, spentOn: { gte: start, lt: end } };
  const [top, payments] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: [{ amountMinor: "desc" }, { spentOn: "desc" }],
      take: 10,
      select: { description: true, amountMinor: true, spentOn: true, category: { select: { name: true } } },
    }),
    prisma.expense.groupBy({ by: ["paymentMethod"], where, _sum: { amountMinor: true }, _count: { _all: true } }),
  ]);
  return {
    top: top.map((t) => ({
      description: t.description,
      amountMinor: t.amountMinor,
      sub: `${t.spentOn.toISOString().slice(0, 10)} · ${t.category?.name ?? "Uncategorised"}`,
    })),
    payments: payments
      .map((p) => ({ method: p.paymentMethod, value: p._sum.amountMinor ?? 0, count: p._count._all }))
      .sort((a, b) => b.value - a.value),
  };
}

/** Has this person recorded anything yet? Drives the getting-started card. */
export async function getLifetimeCounts() {
  const { userId } = await requireSession();
  const [expenses, income] = await Promise.all([
    prisma.expense.count({ where: { userId }, take: 1 }),
    prisma.income.count({ where: { userId }, take: 1 }),
  ]);
  return { expenses, income };
}
