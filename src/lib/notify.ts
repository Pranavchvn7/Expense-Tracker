import "server-only";
import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";
import { addDaysIso, budgetLevel, budgetMessage, countJobsTomorrow, isRenewalReminderDay, jobReminderMessage, renewalMessage } from "@/lib/notify-math";
import { todayIso } from "@/lib/tz";

/** Record that an alert is being sent. False if it was already sent (so it goes out only once). */
async function claim(userId: string, key: string): Promise<boolean> {
  try {
    await prisma.notificationLog.create({ data: { userId, key }, select: { id: true } });
    return true;
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") return false;
    throw err;
  }
}

/**
 * Called after an expense is added or edited. If the category's monthly spending has reached
 * 80% (or gone over) its budget, send one push per level per month. Every query is scoped to
 * the user; failures are swallowed by the caller.
 */
export async function checkBudgetAlert(userId: string, categoryId: string | null | undefined, spentOn: Date): Promise<void> {
  if (!categoryId) return;
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { currency: true, timezone: true, notifyBudget: true, _count: { select: { pushSubscriptions: true } } },
  });
  if (!user || !user.notifyBudget || user._count.pushSubscriptions === 0) return;

  const month = spentOn.toISOString().slice(0, 7);
  // Only the current month raises alerts; back-dating an old expense stays quiet.
  if (month !== todayIso(user.timezone ?? "UTC").slice(0, 7)) return;

  const budget = await prisma.budget.findFirst({
    where: { userId, categoryId, currency: user.currency },
    select: { id: true, amountMinor: true, category: { select: { name: true } } },
  });
  if (!budget) return;

  const start = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const agg = await prisma.expense.aggregate({
    where: { userId, categoryId, currency: user.currency, spentOn: { gte: start, lt: end } },
    _sum: { amountMinor: true },
  });
  const spent = agg._sum.amountMinor ?? 0;
  const level = budgetLevel(spent, budget.amountMinor);
  if (level === "none") return;

  const key = `${level === "over100" ? "budget100" : "budget80"}:${budget.id}:${month}`;
  if (!(await claim(userId, key))) return;
  const msg = budgetMessage(budget.category.name, level, spent, budget.amountMinor);
  await sendPushToUser(userId, { ...msg, url: "/budgets", tag: key });
}

/**
 * Daily job: remind people two days before a recurring expense renews. "Today" is each
 * person's own local date, so the reminder is right in every timezone. Bounded work.
 */
export async function runRenewalReminders(now = new Date()): Promise<{ checked: number; sent: number }> {
  const utcToday = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const from = new Date(utcToday.getTime() + 1 * 86_400_000);
  const to = new Date(utcToday.getTime() + 3 * 86_400_000);
  const rules = await prisma.recurringRule.findMany({
    where: {
      active: true,
      kind: "EXPENSE",
      nextDue: { gte: from, lte: to },
      user: { notifyRenewals: true, pushSubscriptions: { some: {} } },
    },
    take: 2000,
    select: { id: true, userId: true, label: true, nextDue: true, endDate: true, user: { select: { timezone: true } } },
  });

  let sent = 0;
  for (const r of rules) {
    if (r.endDate && r.nextDue > r.endDate) continue;
    const due = r.nextDue.toISOString().slice(0, 10);
    if (!isRenewalReminderDay(due, todayIso(r.user.timezone ?? "UTC", now), 2)) continue;
    if (!(await claim(r.userId, `renewal:${r.id}:${due}`))) continue;
    const msg = renewalMessage(r.label, 2);
    sent += await sendPushToUser(r.userId, { ...msg, url: "/recurring", tag: `renewal:${r.id}` });
  }
  // Housekeeping: forget alerts older than 90 days.
  await prisma.notificationLog.deleteMany({ where: { sentAt: { lt: new Date(now.getTime() - 90 * 86_400_000) } } });
  return { checked: rules.length, sent };
}

/**
 * Daily job: tell freelancers how many booked jobs they have tomorrow (their own local tomorrow).
 * One push per person per day, deduplicated by NotificationLog. The text never names a client.
 * Bounded: one query, at most 5,000 jobs.
 */
export async function runJobReminders(now = new Date()): Promise<{ checked: number; sent: number }> {
  const utcToday = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  // A user's local "tomorrow" is between UTC today and UTC today + 2 in every timezone.
  const to = new Date(utcToday.getTime() + 2 * 86_400_000);
  const jobs = await prisma.job.findMany({
    where: {
      status: "BOOKED",
      eventDate: { gte: utcToday, lte: to },
      user: { notifyJobs: true, workMode: { not: "SALARIED" }, pushSubscriptions: { some: {} } },
    },
    take: 5000,
    select: { userId: true, eventDate: true, user: { select: { timezone: true } } },
  });

  const byUser = new Map<string, { tz: string; dates: string[] }>();
  for (const j of jobs) {
    const cur = byUser.get(j.userId) ?? { tz: j.user.timezone ?? "UTC", dates: [] };
    cur.dates.push(j.eventDate.toISOString().slice(0, 10));
    byUser.set(j.userId, cur);
  }

  let sent = 0;
  for (const [userId, v] of byUser) {
    const today = todayIso(v.tz, now);
    const count = countJobsTomorrow(v.dates, today);
    if (count === 0) continue;
    const day = addDaysIso(today, 1);
    if (!(await claim(userId, `jobs:${day}`))) continue;
    const msg = jobReminderMessage(count);
    sent += await sendPushToUser(userId, { ...msg, url: `/calendar?month=${day.slice(0, 7)}&day=${day}`, tag: `jobs:${day}` });
  }
  return { checked: byUser.size, sent };
}
