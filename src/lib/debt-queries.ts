import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { buildLedger } from "@/lib/debt-math";

const MAX_PAYMENTS = 2_000;
const DEBT_SELECT = {
  id: true,
  name: true,
  kind: true,
  currency: true,
  originalMinor: true,
  aprBp: true,
  minPaymentMinor: true,
  startDate: true,
} as const;

/**
 * One page of debts with their replayed ledger. Session first, userId on every query,
 * explicit selects, bounded work (30 debts x 2,000 payments at most).
 */
export async function listDebtsPage(page: number, perPage: number) {
  const { userId } = await requireSession();
  const rows = await prisma.debt.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * perPage,
    take: perPage + 1,
    select: DEBT_SELECT,
  });
  const debts = rows.slice(0, perPage);
  const payments = debts.length
    ? await prisma.debtPayment.findMany({
        where: { userId, debtId: { in: debts.map((d) => d.id) } },
        orderBy: [{ paidOn: "asc" }, { createdAt: "asc" }],
        take: debts.length * MAX_PAYMENTS,
        select: { id: true, debtId: true, paidOn: true, amountMinor: true, interestOverrideMinor: true, note: true },
      })
    : [];
  return {
    hasNext: rows.length > perPage,
    debts: debts.map((d) => {
      const mine = payments.filter((p) => p.debtId === d.id);
      const ledger = buildLedger(d, mine);
      const notes = new Map(mine.map((p) => [p.id, p.note]));
      return { ...d, ledger: { ...ledger, rows: ledger.rows.map((r) => ({ ...r, note: notes.get(r.id) ?? null })) } };
    }),
  };
}

/** Compact totals for every debt (summary card and payoff order), without the ledgers' detail. */
export async function debtOverview() {
  const { userId } = await requireSession();
  const debts = await prisma.debt.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, take: 30, select: DEBT_SELECT });
  if (debts.length === 0) return [];
  const payments = await prisma.debtPayment.findMany({
    where: { userId, debtId: { in: debts.map((d) => d.id) } },
    orderBy: [{ paidOn: "asc" }, { createdAt: "asc" }],
    take: debts.length * MAX_PAYMENTS,
    select: { id: true, debtId: true, paidOn: true, amountMinor: true, interestOverrideMinor: true },
  });
  return debts.map((d) => {
    const l = buildLedger(d, payments.filter((p) => p.debtId === d.id));
    return { ...d, balanceMinor: l.balanceMinor, totalInterestMinor: l.totalInterestMinor, totalPrincipalMinor: l.totalPrincipalMinor, totalPaidMinor: l.totalPaidMinor };
  });
}

export async function getDebt(id: string) {
  const { userId } = await requireSession();
  return prisma.debt.findFirst({ where: { id, userId }, select: DEBT_SELECT });
}
