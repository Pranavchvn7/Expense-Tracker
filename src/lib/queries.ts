import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

// Explicit select blocks everywhere: nothing but what the UI needs leaves the server.

export const PAGE_SIZE = 25;

export function monthRange(month: string) {
  const start = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return { start, end };
}

export async function listExpenses(opts: {
  month: string;
  q?: string;
  categoryId?: string;
  page: number;
}) {
  const { userId } = await requireSession();
  const { start, end } = monthRange(opts.month);

  // userId is always part of the filter, so a tampered categoryId cannot cross tenants.
  const where: Prisma.ExpenseWhereInput = {
    userId,
    spentOn: { gte: start, lt: end },
    ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
    ...(opts.q
      ? {
          OR: [
            { description: { contains: opts.q, mode: "insensitive" } },
            { note: { contains: opts.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, totals] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
      skip: (opts.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1, // one extra row tells us whether a next page exists
      select: {
        id: true,
        amountMinor: true,
        currency: true,
        description: true,
        note: true,
        spentOn: true,
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.expense.groupBy({
      by: ["currency"],
      where,
      _sum: { amountMinor: true },
    }),
  ]);

  return { rows: rows.slice(0, PAGE_SIZE), hasNext: rows.length > PAGE_SIZE, totals };
}

export async function getExpense(id: string) {
  const { userId } = await requireSession();
  return prisma.expense.findFirst({
    where: { id, userId },
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      description: true,
      note: true,
      spentOn: true,
      categoryId: true,
    },
  });
}

export async function listCategories() {
  const { userId } = await requireSession();
  return prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    take: 50,
    select: { id: true, name: true },
  });
}

export async function monthTotalsByCategory(month: string) {
  const { userId } = await requireSession();
  const { start, end } = monthRange(month);
  return prisma.expense.groupBy({
    by: ["categoryId", "currency"],
    where: { userId, spentOn: { gte: start, lt: end } },
    _sum: { amountMinor: true },
  });
}

export async function listBudgets() {
  const { userId } = await requireSession();
  return prisma.budget.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      category: { select: { id: true, name: true } },
    },
  });
}

export async function listShares() {
  const { userId } = await requireSession();
  return prisma.sharedReport.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, month: true, expiresAt: true },
  });
}

/**
 * PUBLIC read (no session): filters isPublic + not expired, returns aggregates only –
 * no descriptions, notes, user ids or emails.
 */
export async function getPublicReport(id: string) {
  const share = await prisma.sharedReport.findFirst({
    where: { id, isPublic: true, expiresAt: { gt: new Date() } },
    select: { userId: true, month: true, expiresAt: true },
  });
  if (!share) return null;
  const { start, end } = monthRange(share.month);
  const rows = await prisma.expense.groupBy({
    by: ["categoryId", "currency"],
    where: { userId: share.userId, spentOn: { gte: start, lt: end } },
    _sum: { amountMinor: true },
  });
  const cats = await prisma.category.findMany({
    where: {
      userId: share.userId,
      id: { in: rows.map((r) => r.categoryId).filter((x): x is string => !!x) },
    },
    select: { id: true, name: true },
  });
  const names = new Map(cats.map((c) => [c.id, c.name]));
  return {
    month: share.month,
    lines: rows.map((r) => ({
      category: r.categoryId ? (names.get(r.categoryId) ?? "Other") : "Uncategorised",
      currency: r.currency,
      totalMinor: r._sum.amountMinor ?? 0,
    })),
  };
}
