import "server-only";
import type { PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { nextColor } from "@/lib/category-color";

// Explicit select blocks everywhere: nothing but what the UI needs leaves the server.

export function monthRange(month: string) {
  const start = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return { start, end };
}

/** Whitelisted sort orders: the column name never comes straight from the URL. */
function expenseOrder(
  sort: "date" | "amount" | "description" | "category",
  dir: "asc" | "desc",
): Prisma.ExpenseOrderByWithRelationInput[] {
  const byDate: Prisma.ExpenseOrderByWithRelationInput = { spentOn: "desc" };
  switch (sort) {
    case "amount":
      return [{ amountMinor: dir }, byDate];
    case "description":
      return [{ description: dir }, byDate];
    case "category":
      return [{ category: { name: dir } }, byDate];
    default:
      return [{ spentOn: dir }, { createdAt: dir }];
  }
}

export async function listExpenses(opts: {
  month: string;
  q?: string;
  categoryId?: string;
  page: number;
  perPage: number;
  sort: "date" | "amount" | "description" | "category";
  dir: "asc" | "desc";
  paymentMethod?: PaymentMethod;
  reconciled?: "yes" | "no";
  jobId?: string;
  clientId?: string;
}) {
  const { userId } = await requireSession();
  const { start, end } = monthRange(opts.month);

  // userId is always part of the filter, so a tampered categoryId cannot cross tenants.
  const where: Prisma.ExpenseWhereInput = {
    userId,
    // Filtering by a job or client shows every month, so the whole job is visible at once.
    ...(opts.jobId || opts.clientId ? {} : { spentOn: { gte: start, lt: end } }),
    ...(opts.jobId ? { jobId: opts.jobId } : {}),
    ...(opts.clientId ? { job: { clientId: opts.clientId, userId } } : {}),
    ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
    ...(opts.paymentMethod ? { paymentMethod: opts.paymentMethod } : {}),
    ...(opts.reconciled ? { reconciled: opts.reconciled === "yes" } : {}),
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
      orderBy: expenseOrder(opts.sort, opts.dir),
      skip: (opts.page - 1) * opts.perPage,
      take: opts.perPage + 1, // one extra row tells us whether a next page exists
      select: {
        id: true,
        amountMinor: true,
        currency: true,
        description: true,
        note: true,
        spentOn: true,
        recurringRuleId: true,
        paymentMethod: true,
        reconciled: true,
        costKind: true,
        payee: true,
        job: { select: { id: true, title: true, client: { select: { name: true } } } },
        category: { select: { id: true, name: true, color: true } },
      },
    }),
    prisma.expense.groupBy({
      by: ["currency"],
      where,
      _sum: { amountMinor: true },
    }),
  ]);

  return { rows: rows.slice(0, opts.perPage), hasNext: rows.length > opts.perPage, totals };
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
      paymentMethod: true,
    },
  });
}

export async function listCategories() {
  const { userId } = await requireSession();
  const cats = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    take: 50,
    select: { id: true, name: true, color: true, createdAt: true },
  });
  // Categories made before colours existed get a permanent slot the first time they are read.
  if (cats.some((c) => c.color === 0)) {
    const assigned = cats.filter((c) => c.color !== 0).length;
    const missing = cats.filter((c) => c.color === 0).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    await prisma.$transaction(
      missing.map((c, i) =>
        prisma.category.updateMany({ where: { id: c.id, userId, color: 0 }, data: { color: nextColor(assigned + i) } }),
      ),
    );
    missing.forEach((c, i) => (c.color = nextColor(assigned + i)));
  }
  return cats.map(({ id, name, color }) => ({ id, name, color }));
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

/** Month spending per payment method (user's currency only), for reconciling statements. */
export async function paymentBreakdown(month: string, currency: string) {
  const { userId } = await requireSession();
  const { start, end } = monthRange(month);
  const rows = await prisma.expense.groupBy({
    by: ["paymentMethod", "reconciled"],
    where: { userId, currency, spentOn: { gte: start, lt: end } },
    _sum: { amountMinor: true },
    _count: { _all: true },
  });
  return rows.map((r) => ({
    method: r.paymentMethod,
    reconciled: r.reconciled,
    totalMinor: r._sum.amountMinor ?? 0,
    count: r._count._all,
  }));
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
      category: { select: { id: true, name: true, color: true } },
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
