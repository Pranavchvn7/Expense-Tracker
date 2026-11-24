import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getUserCurrency } from "@/lib/preferences";
import { countBy, mergeById, topN, totalsOf, type Ranked } from "@/lib/freelance-math";
import { paySummary } from "@/lib/pay-math";
import { paidByJob, costsByJob, paymentsDue } from "@/lib/job-queries";

// Every query: session first, userId in every where, explicit select, bounded row counts.

/** Freelance numbers for a date range: jobs, clients handled, money received and spent on jobs. */
export async function freelanceSummary(range: { start: Date; end: Date }) {
  const { userId } = await requireSession();
  const currency = await getUserCurrency();
  const jobWhere = { userId, eventDate: { gte: range.start, lt: range.end } };
  const incomeWhere = { userId, currency, jobId: { not: null }, receivedOn: { gte: range.start, lt: range.end } };
  const costWhere = { userId, currency, jobId: { not: null }, spentOn: { gte: range.start, lt: range.end } };

  const [jobs, received, costs, byJob] = await Promise.all([
    prisma.job.findMany({ where: jobWhere, take: 2000, select: { status: true, clientId: true, serviceType: true } }),
    prisma.income.aggregate({ where: incomeWhere, _sum: { amountMinor: true }, _count: { _all: true } }),
    prisma.expense.aggregate({ where: costWhere, _sum: { amountMinor: true }, _count: { _all: true } }),
    prisma.income.groupBy({ by: ["jobId"], where: incomeWhere, orderBy: { jobId: "asc" }, _sum: { amountMinor: true }, take: 2000 }),
  ]);

  // Who paid: map each paying job to its client (one extra query, ids come from our own rows).
  const jobIds = byJob.flatMap((r) => (r.jobId ? [r.jobId] : []));
  const owners = jobIds.length
    ? await prisma.job.findMany({
        where: { userId, id: { in: jobIds } },
        take: 2000,
        select: { id: true, client: { select: { id: true, name: true } } },
      })
    : [];
  const ownerOf = new Map(owners.map((o) => [o.id, o.client]));
  const ranked: Ranked[] = [];
  for (const r of byJob) {
    const c = r.jobId ? ownerOf.get(r.jobId) : undefined;
    if (c) ranked.push({ id: c.id, label: c.name, value: r._sum.amountMinor ?? 0 });
  }

  const counted = jobs.filter((j) => j.status !== "CANCELLED");
  const receivedMinor = received._sum.amountMinor ?? 0;
  const costsMinor = costs._sum.amountMinor ?? 0;
  return {
    currency,
    jobsCompleted: jobs.filter((j) => j.status === "COMPLETED").length,
    jobsPending: jobs.filter((j) => j.status === "ENQUIRY" || j.status === "BOOKED").length,
    jobsCancelled: jobs.filter((j) => j.status === "CANCELLED").length,
    clientsHandled: new Set(counted.map((j) => j.clientId)).size,
    receivedMinor,
    paymentCount: received._count._all,
    costsMinor,
    costCount: costs._count._all,
    profitMinor: receivedMinor - costsMinor,
    topClients: topN(mergeById(ranked), 5),
    services: countBy(counted.map((j) => j.serviceType), 5),
  };
}
export type FreelanceSummary = Awaited<ReturnType<typeof freelanceSummary>>;

/** All-time money still owed on completed jobs, and how many jobs owe it. */
export async function outstanding() {
  const rows = await paymentsDue(500);
  return { count: rows.length, totalMinor: rows.reduce((n, r) => n + r.balanceMinor, 0), currency: rows[0]?.currency ?? null };
}

/** For the first-steps checklist on a Freelance dashboard. */
export async function freelanceLifetime() {
  const { userId } = await requireSession();
  const [clients, jobs, payments] = await Promise.all([
    prisma.client.count({ where: { userId } }),
    prisma.job.count({ where: { userId } }),
    prisma.income.count({ where: { userId, jobId: { not: null } } }),
  ]);
  return { clients, jobs, payments };
}

/** Everything the client report needs. Null when the client is not the caller's. */
export async function clientReport(clientId: string) {
  const { userId } = await requireSession();
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
    select: { id: true, name: true },
  });
  if (!client) return null;
  const jobs = await prisma.job.findMany({
    where: { userId, clientId },
    orderBy: [{ eventDate: "desc" }, { id: "asc" }],
    take: 500,
    select: { id: true, title: true, serviceType: true, eventDate: true, status: true, agreedAmountMinor: true, currency: true },
  });
  const ids = jobs.map((j) => j.id);
  const [paid, costs, payments, costRows] = await Promise.all([
    paidByJob(ids),
    costsByJob(ids),
    ids.length
      ? prisma.income.findMany({
          where: { userId, jobId: { in: ids } },
          orderBy: [{ receivedOn: "asc" }, { createdAt: "asc" }],
          take: 1000,
          select: { id: true, amountMinor: true, currency: true, receivedOn: true, paymentKind: true, job: { select: { title: true } } },
        })
      : Promise.resolve([]),
    ids.length
      ? prisma.expense.findMany({
          where: { userId, jobId: { in: ids } },
          orderBy: [{ spentOn: "asc" }, { createdAt: "asc" }],
          take: 1000,
          select: { id: true, amountMinor: true, currency: true, spentOn: true, costKind: true, description: true, job: { select: { title: true } } },
        })
      : Promise.resolve([]),
  ]);
  const rows = jobs.map((j) => {
    const received = paid[j.id] ?? 0;
    const cost = costs[j.id] ?? 0;
    return { ...j, receivedMinor: received, costsMinor: cost, profitMinor: received - cost, pay: paySummary(j.agreedAmountMinor, received) };
  });
  const totals = totalsOf(rows.filter((r) => r.status !== "CANCELLED").map((r) => ({ agreedMinor: r.agreedAmountMinor, receivedMinor: r.receivedMinor, costsMinor: r.costsMinor })));
  // Money on cancelled jobs (a kept deposit) still counts as received and as cost.
  const cancelled = rows.filter((r) => r.status === "CANCELLED");
  const receivedAll = totals.receivedMinor + cancelled.reduce((n, r) => n + r.receivedMinor, 0);
  const costsAll = totals.costsMinor + cancelled.reduce((n, r) => n + r.costsMinor, 0);
  return {
    client,
    rows,
    payments,
    costRows,
    totals: { ...totals, receivedMinor: receivedAll, costsMinor: costsAll, profitMinor: receivedAll - costsAll },
    currency: jobs[0]?.currency ?? (await getUserCurrency()),
  };
}
export type ClientReport = NonNullable<Awaited<ReturnType<typeof clientReport>>>;

/** Everything the job report needs. Null when the job is not the caller's. */
export async function jobReport(jobId: string) {
  const { userId } = await requireSession();
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
    select: {
      id: true, title: true, serviceType: true, eventDate: true, startTime: true, endTime: true, location: true,
      status: true, agreedAmountMinor: true, currency: true, client: { select: { id: true, name: true } },
    },
  });
  if (!job) return null;
  const [payments, costs] = await Promise.all([
    prisma.income.findMany({
      where: { userId, jobId },
      orderBy: [{ receivedOn: "asc" }, { createdAt: "asc" }],
      take: 200,
      select: { id: true, amountMinor: true, currency: true, receivedOn: true, paymentKind: true, note: true },
    }),
    prisma.expense.findMany({
      where: { userId, jobId },
      orderBy: [{ spentOn: "asc" }, { createdAt: "asc" }],
      take: 200,
      select: { id: true, amountMinor: true, currency: true, spentOn: true, costKind: true, payee: true, description: true },
    }),
  ]);
  const received = payments.reduce((n, p) => n + p.amountMinor, 0);
  const costTotal = costs.reduce((n, c) => n + c.amountMinor, 0);
  return { job, payments, costs, receivedMinor: received, costsMinor: costTotal, profitMinor: received - costTotal, pay: paySummary(job.agreedAmountMinor, received) };
}
export type JobReport = NonNullable<Awaited<ReturnType<typeof jobReport>>>;

