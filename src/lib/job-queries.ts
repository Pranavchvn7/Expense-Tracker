import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { monthRange } from "@/lib/queries";
import { summarize, type JobStatus } from "@/lib/job-math";
import { dueJobs, sumByJob } from "@/lib/pay-math";

// Every query: session first, userId in where, explicit select.
export type JobFilter = "all" | "pending" | "completed" | "cancelled";
export type JobSort = "date" | "amount";

const JOB_SELECT = {
  id: true,
  clientId: true,
  title: true,
  serviceType: true,
  eventDate: true,
  startTime: true,
  endTime: true,
  location: true,
  status: true,
  agreedAmountMinor: true,
  currency: true,
  notes: true,
  createdAt: true,
  client: { select: { id: true, name: true, archived: true } },
} as const;

const STATUS_SETS: Record<JobFilter, JobStatus[] | null> = {
  all: null,
  pending: ["ENQUIRY", "BOOKED"],
  completed: ["COMPLETED"],
  cancelled: ["CANCELLED"],
};

export async function listJobs(opts: {
  month: string;
  filter: JobFilter;
  clientId?: string;
  q?: string;
  sort: JobSort;
  dir: "asc" | "desc";
  page: number;
  perPage: number;
}) {
  const { userId } = await requireSession();
  const { start, end } = monthRange(opts.month);
  const statuses = STATUS_SETS[opts.filter];
  const where = {
    userId,
    eventDate: { gte: start, lt: end },
    ...(statuses ? { status: { in: statuses } } : {}),
    ...(opts.clientId ? { clientId: opts.clientId } : {}),
    ...(opts.q
      ? {
          OR: [
            { title: { contains: opts.q, mode: "insensitive" as const } },
            { location: { contains: opts.q, mode: "insensitive" as const } },
            { serviceType: { contains: opts.q, mode: "insensitive" as const } },
            { client: { name: { contains: opts.q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const orderBy =
    opts.sort === "amount"
      ? [{ agreedAmountMinor: opts.dir }, { eventDate: "asc" as const }, { id: "asc" as const }]
      : [{ eventDate: opts.dir }, { startTime: { sort: opts.dir, nulls: "last" as const } }, { id: "asc" as const }];
  const rows = await prisma.job.findMany({
    where,
    orderBy,
    skip: (opts.page - 1) * opts.perPage,
    take: opts.perPage + 1,
    select: JOB_SELECT,
  });
  return { rows: rows.slice(0, opts.perPage), hasNext: rows.length > opts.perPage };
}

/** Completed / pending / cancelled counts for a month (and how many pending ones are overdue). */
export async function monthJobCounts(month: string, todayIso: string) {
  const { userId } = await requireSession();
  const { start, end } = monthRange(month);
  const rows = await prisma.job.findMany({
    where: { userId, eventDate: { gte: start, lt: end } },
    take: 2000,
    select: { status: true, eventDate: true },
  });
  return summarize(
    rows.map((r) => ({ status: r.status, eventDate: r.eventDate.toISOString().slice(0, 10) })),
    todayIso,
  );
}

export async function getJob(id: string) {
  const { userId } = await requireSession();
  return prisma.job.findFirst({ where: { id, userId }, select: JOB_SELECT });
}

/** The client's jobs, newest first (for the client page). */
export async function jobsForClient(clientId: string, limit = 100) {
  const { userId } = await requireSession();
  return prisma.job.findMany({
    where: { userId, clientId },
    orderBy: [{ eventDate: "desc" }, { id: "asc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      serviceType: true,
      eventDate: true,
      startTime: true,
      status: true,
      agreedAmountMinor: true,
      currency: true,
    },
  });
}

/** Clients to choose from in forms: active ones, by name. */
export async function clientOptions() {
  const { userId } = await requireSession();
  return prisma.client.findMany({
    where: { userId, archived: false },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: 500,
    select: { id: true, name: true },
  });
}

/** Money received per job, for a page of jobs (one grouped query, no per-row lookups). */
export async function paidByJob(jobIds: string[]): Promise<Record<string, number>> {
  const { userId } = await requireSession();
  if (jobIds.length === 0) return {};
  const rows = await prisma.income.groupBy({
    by: ["jobId"],
    where: { userId, jobId: { in: jobIds.slice(0, 500) } },
    _sum: { amountMinor: true },
  });
  return sumByJob(rows.map((r) => ({ jobId: r.jobId, minor: r._sum.amountMinor ?? 0 })));
}

/** The payments recorded for one job, oldest first. */
export async function jobPayments(jobId: string) {
  const { userId } = await requireSession();
  return prisma.income.findMany({
    where: { userId, jobId },
    orderBy: [{ receivedOn: "asc" }, { createdAt: "asc" }],
    take: 200,
    select: { id: true, amountMinor: true, currency: true, receivedOn: true, paymentKind: true, note: true },
  });
}

/** Everything a client has paid across all their jobs, per currency. */
export async function clientPaidTotal(clientId: string) {
  const { userId } = await requireSession();
  const agg = await prisma.income.aggregate({
    where: { userId, job: { clientId, userId } },
    _sum: { amountMinor: true },
  });
  return agg._sum.amountMinor ?? 0;
}

/** Costs per job, for a page of jobs (one grouped query). */
export async function costsByJob(jobIds: string[]): Promise<Record<string, number>> {
  const { userId } = await requireSession();
  if (jobIds.length === 0) return {};
  const rows = await prisma.expense.groupBy({
    by: ["jobId"],
    where: { userId, jobId: { in: jobIds.slice(0, 500) } },
    _sum: { amountMinor: true },
  });
  return sumByJob(rows.map((r) => ({ jobId: r.jobId, minor: r._sum.amountMinor ?? 0 })));
}

/** The costs recorded for one job, oldest first. */
export async function jobCosts(jobId: string) {
  const { userId } = await requireSession();
  return prisma.expense.findMany({
    where: { userId, jobId },
    orderBy: [{ spentOn: "asc" }, { createdAt: "asc" }],
    take: 200,
    select: { id: true, amountMinor: true, currency: true, spentOn: true, costKind: true, payee: true, description: true },
  });
}

const dayDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Jobs shown in a month grid (including the padding days of the neighbouring months). */
export async function calendarJobs(fromIso: string, toIso: string) {
  const { userId } = await requireSession();
  return prisma.job.findMany({
    where: { userId, eventDate: { gte: dayDate(fromIso), lte: dayDate(toIso) } },
    orderBy: [{ eventDate: "asc" }, { startTime: { sort: "asc", nulls: "last" } }, { id: "asc" }],
    take: 600,
    select: {
      id: true,
      title: true,
      eventDate: true,
      startTime: true,
      endTime: true,
      status: true,
      location: true,
      client: { select: { id: true, name: true } },
    },
  });
}

/** Other jobs on the same date as a job (for the double-booking check). Cancelled ones are skipped. */
export async function jobsOnDate(iso: string, excludeId?: string) {
  const { userId } = await requireSession();
  return prisma.job.findMany({
    where: { userId, eventDate: dayDate(iso), status: { not: "CANCELLED" }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    orderBy: [{ startTime: { sort: "asc", nulls: "last" } }, { id: "asc" }],
    take: 50,
    select: { id: true, title: true, eventDate: true, startTime: true, endTime: true, status: true, client: { select: { name: true } } },
  });
}

/** The next pending jobs from today on (dashboard card). */
export async function upcomingJobs(todayIso: string, limit = 5) {
  const { userId } = await requireSession();
  return prisma.job.findMany({
    where: { userId, eventDate: { gte: dayDate(todayIso) }, status: { in: ["ENQUIRY", "BOOKED"] } },
    orderBy: [{ eventDate: "asc" }, { startTime: { sort: "asc", nulls: "last" } }, { id: "asc" }],
    take: limit,
    select: { id: true, title: true, eventDate: true, startTime: true, endTime: true, status: true, client: { select: { name: true } } },
  });
}

/**
 * Completed jobs with money still owed, oldest first. Reads completed priced jobs in batches of 500
 * (at most 10 batches) and keeps those with a balance, so fully paid old jobs never hide newer unpaid ones.
 */
export async function paymentsDue(limit = 100) {
  const { userId } = await requireSession();
  const found: Awaited<ReturnType<typeof dueRows>> = [];
  let cursor: string | undefined;
  for (let i = 0; i < 10 && found.length < limit; i++) {
    const batch = await dueRows(userId, cursor);
    if (batch.length === 0) break;
    const paid = await paidByJob(batch.map((b) => b.id));
    for (const d of dueJobs(batch.map((b) => ({ ...b, eventDate: b.eventDate.toISOString().slice(0, 10) })), paid)) {
      const row = batch.find((b) => b.id === d.id);
      if (row) found.push({ ...row, paidMinor: d.paidMinor, balanceMinor: d.balanceMinor });
    }
    if (batch.length < 500) break;
    cursor = batch[batch.length - 1]?.id;
  }
  return found
    .sort((a, b) => (a.eventDate.getTime() - b.eventDate.getTime()) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

async function dueRows(userId: string, cursor?: string) {
  const rows = await prisma.job.findMany({
    where: { userId, status: "COMPLETED", agreedAmountMinor: { gt: 0 } },
    orderBy: [{ eventDate: "asc" }, { id: "asc" }],
    take: 500,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, title: true, eventDate: true, agreedAmountMinor: true, currency: true, client: { select: { id: true, name: true } } },
  });
  return rows.map((r) => ({ ...r, paidMinor: 0, balanceMinor: 0 }));
}
