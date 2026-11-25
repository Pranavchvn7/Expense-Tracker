/** Calendar and double-booking rules that need no database. Pure; covered by a node test. */

export type CalCell = { iso: string; inMonth: boolean };

/** Weeks (Monday first) covering a "YYYY-MM" month, padded with days of the neighbouring months. */
export function monthGrid(month: string): CalCell[][] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1;
  const first = new Date(Date.UTC(y, m, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday = 0
  const daysIn = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const total = Math.ceil((lead + daysIn) / 7) * 7;
  const weeks: CalCell[][] = [];
  for (let i = 0; i < total; i += 7) {
    const row: CalCell[] = [];
    for (let j = i; j < i + 7; j++) {
      const d = new Date(Date.UTC(y, m, 1 - lead + j));
      row.push({ iso: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === m });
    }
    weeks.push(row);
  }
  return weeks;
}

/** First and last day shown by the grid (for the database query). */
export function gridRange(month: string): { from: string; to: string } | null {
  const g = monthGrid(month);
  const from = g[0]?.[0];
  const to = g[g.length - 1]?.[6];
  if (!from || !to) return null;
  return { from: from.iso, to: to.iso };
}

const toMin = (t?: string | null) => {
  if (!t || !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return null;
  return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
};

export type SlotJob = { id: string; eventDate: string; startTime?: string | null; endTime?: string | null; status: string };
export type Conflict = "overlap" | "same-day";

/** A job without an end time is assumed to take this long when checking overlaps. */
export const DEFAULT_DURATION_MIN = 120;

/**
 * How two jobs clash, or null. Cancelled jobs never clash. Two timed jobs clash when their time
 * ranges overlap ("overlap"). When either has no start time we cannot tell, so a job on the same
 * date is flagged softly ("same-day").
 */
export function conflictBetween(a: SlotJob, b: SlotJob): Conflict | null {
  if (a.id === b.id || a.status === "CANCELLED" || b.status === "CANCELLED") return null;
  if (a.eventDate !== b.eventDate) return null;
  const as = toMin(a.startTime);
  const bs = toMin(b.startTime);
  if (as === null || bs === null) return "same-day";
  const ae = toMin(a.endTime) ?? as + DEFAULT_DURATION_MIN;
  const be = toMin(b.endTime) ?? bs + DEFAULT_DURATION_MIN;
  return as < be && bs < ae ? "overlap" : null;
}

/** All other jobs that clash with `job`, strongest clash first. */
export function findConflicts<T extends SlotJob>(job: SlotJob, others: T[]): { job: T; kind: Conflict }[] {
  const out: { job: T; kind: Conflict }[] = [];
  for (const o of others) {
    const kind = conflictBetween(job, o);
    if (kind) out.push({ job: o, kind });
  }
  return out.sort((x, y) => (x.kind === y.kind ? 0 : x.kind === "overlap" ? -1 : 1));
}

/** Ids of jobs that clash with at least one other job in the list (for a red marker in the calendar). */
export function clashingIds(jobs: SlotJob[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < jobs.length; i++) {
    for (let j = i + 1; j < jobs.length; j++) {
      const a = jobs[i];
      const b = jobs[j];
      if (a && b && conflictBetween(a, b)) {
        ids.add(a.id);
        ids.add(b.id);
      }
    }
  }
  return ids;
}

/** Group items by their eventDate ("YYYY-MM-DD"). */
export function groupByDay<T extends { eventDate: string }>(items: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const it of items) (out[it.eventDate] ??= []).push(it);
  return out;
}

/** Sort a day's jobs: timed ones by start time, jobs with no time last. */
export function sortDay<T extends { startTime?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => (toMin(a.startTime) ?? 9999) - (toMin(b.startTime) ?? 9999));
}
