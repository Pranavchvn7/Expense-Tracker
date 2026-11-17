import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { monthRange } from "@/lib/queries";
import { bucketByMonth, monthKeys } from "@/lib/chart-math";

// Every query: session first, userId in where, explicit select.

const CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;
type Currency = (typeof CURRENCIES)[number];

export async function getDashboardData(month: string, preferred?: Currency) {
  const { userId } = await requireSession();
  const { start, end } = monthRange(month);

  // Which currencies has this user used at all? (drives the currency chips)
  const [expCur, incCur] = await Promise.all([
    prisma.expense.groupBy({ by: ["currency"], where: { userId }, _count: { _all: true } }),
    prisma.income.groupBy({ by: ["currency"], where: { userId }, _count: { _all: true } }),
  ]);
  const used = new Set<string>([...expCur, ...incCur].map((r) => r.currency));
  const currencies = CURRENCIES.filter((c) => used.has(c));
  const currency: Currency =
    preferred && used.has(preferred) ? preferred : (currencies[0] ?? "INR");

  const keys = monthKeys(month, 6);
  const trendStart = new Date(`${keys[0] ?? month}-01T00:00:00Z`);

  const [spentAgg, incomeAgg, byCategory, expTrend, incTrend, recent] = await Promise.all([
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
    prisma.expense.findMany({
      where: { userId, currency, spentOn: { gte: start, lt: end } },
      orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        amountMinor: true,
        description: true,
        spentOn: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  const cats = await prisma.category.findMany({
    where: {
      userId,
      id: { in: byCategory.map((r) => r.categoryId).filter((x): x is string => !!x) },
    },
    select: { id: true, name: true },
  });
  const names = new Map(cats.map((c) => [c.id, c.name]));

  const spentMinor = spentAgg._sum.amountMinor ?? 0;
  const incomeMinor = incomeAgg._sum.amountMinor ?? 0;

  return {
    currency,
    currencies,
    spentMinor,
    incomeMinor,
    expenseCount: spentAgg._count._all,
    categories: byCategory.map((r) => ({
      id: r.categoryId,
      label: r.categoryId ? (names.get(r.categoryId) ?? "Other") : "Uncategorised",
      value: r._sum.amountMinor ?? 0,
    })),
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
    recent,
  };
}

export async function listIncome(month: string) {
  const { userId } = await requireSession();
  const { start, end } = monthRange(month);
  const where = { userId, receivedOn: { gte: start, lt: end } };
  const [rows, totals] = await Promise.all([
    prisma.income.findMany({
      where,
      orderBy: [{ receivedOn: "desc" }, { createdAt: "desc" }],
      take: 200,
      select: {
        id: true,
        amountMinor: true,
        currency: true,
        source: true,
        note: true,
        receivedOn: true,
      },
    }),
    prisma.income.groupBy({ by: ["currency"], where, _sum: { amountMinor: true } }),
  ]);
  return { rows, totals };
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
