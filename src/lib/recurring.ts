import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { dueOccurrences } from "@/lib/recurrence";
import { getUserPrefs } from "@/lib/preferences";
import { todayDate } from "@/lib/tz";

const MAX_PER_RULE_PER_RUN = 120;
const MAX_EXPENSES = 50_000; // same caps as manual entry
const MAX_INCOME = 20_000;

/**
 * Create the expenses/income that have fallen due since the owner last opened the app.
 *
 * - Session first; only the caller's own rules are read.
 * - Idempotent under concurrency: each rule is "claimed" by an updateMany that only matches
 *   if nextDue is still the value we read, inside the same transaction as the inserts. A second
 *   tab that races us matches 0 rows and does nothing. (rule, date) is also unique in the
 *   database as a second line of defence.
 * - Never throws into the page: a failure is logged without data and the page renders anyway.
 */
export async function materializeRecurring(): Promise<void> {
  try {
    const { userId } = await requireSession();
    // "Due today" means today in the user's own timezone (Profile), not UTC.
    const { timezone } = await getUserPrefs();
    const today = todayDate(timezone);
    const rules = await prisma.recurringRule.findMany({
      where: { userId, active: true, nextDue: { lte: today } },
      take: 50,
      select: {
        id: true,
        kind: true,
        amountMinor: true,
        currency: true,
        label: true,
        note: true,
        categoryId: true,
        frequency: true,
        anchorDay: true,
        endDate: true,
        nextDue: true,
      },
    });
    if (rules.length === 0) return;

    for (const rule of rules) {
      const { dates, next, finished } = dueOccurrences({
        nextDue: rule.nextDue,
        frequency: rule.frequency,
        anchorDay: rule.anchorDay,
        today,
        endDate: rule.endDate,
        cap: MAX_PER_RULE_PER_RUN,
      });

      await prisma.$transaction(async (tx) => {
        if (dates.length > 0) {
          const total =
            rule.kind === "EXPENSE"
              ? await tx.expense.count({ where: { userId } })
              : await tx.income.count({ where: { userId } });
          const limit = rule.kind === "EXPENSE" ? MAX_EXPENSES : MAX_INCOME;
          if (total + dates.length > limit) return; // over the account cap: leave the rule untouched
        }

        const claimed = await tx.recurringRule.updateMany({
          where: { id: rule.id, userId, active: true, nextDue: rule.nextDue },
          data: { nextDue: next, active: !finished, lastRunAt: new Date() },
        });
        if (claimed.count !== 1 || dates.length === 0) return;

        if (rule.kind === "EXPENSE") {
          await tx.expense.createMany({
            data: dates.map((d) => ({
              userId,
              categoryId: rule.categoryId,
              amountMinor: rule.amountMinor,
              currency: rule.currency,
              description: rule.label,
              note: rule.note,
              spentOn: d,
              recurringRuleId: rule.id,
            })),
            skipDuplicates: true,
          });
        } else {
          await tx.income.createMany({
            data: dates.map((d) => ({
              userId,
              amountMinor: rule.amountMinor,
              currency: rule.currency,
              source: rule.label,
              note: rule.note,
              receivedOn: d,
              recurringRuleId: rule.id,
            })),
            skipDuplicates: true,
          });
        }
      });
    }
  } catch {
    console.error("recurring: generation failed");
  }
}
