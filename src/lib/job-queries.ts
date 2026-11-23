import "server-only";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { monthRange } from "@/lib/queries";
import { summarize, type JobStatus } from "@/lib/job-math";
import { sumByJob } from "@/lib/pay-math";

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
