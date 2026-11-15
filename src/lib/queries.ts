import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

// Explicit select blocks everywhere: nothing but what the UI needs leaves the server.

export async function listExpenses(month: string) {
  const { userId } = await requireSession();
  const start = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return prisma.expense.findMany({
    where: { userId, spentOn: { gte: start, lt: end } },
    orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
    take: 500,
    select: {
      id: true,
      amountMinor: true,
      currency: true,
      description: true,
      note: true,
      spentOn: true,
      category: { select: { id: true, name: true } },
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
  const start = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const groups = await prisma.expense.groupBy({
    by: ["categoryId", "currency"],
    where: { userId, spentOn: { gte: start, lt: end } },
    _sum: { amountMinor: true },
  });
  return groups;
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
  const start = new Date(`${share.month}-01T00:00:00Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const rows = await prisma.expense.groupBy({
    by: ["categoryId", "currency"],
    where: { userId: share.userId, spentOn: { gte: start, lt: end } },
    _sum: { amountMinor: true },
  });
  const cats = await prisma.category.findMany({
    where: { userId: share.userId, id: { in: rows.map((r) => r.categoryId).filter((x): x is string => !!x) } },
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
