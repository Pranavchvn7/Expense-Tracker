/** Job rules that need no database. Pure, no imports, covered by a node test. */

export const JOB_STATUSES = ["ENQUIRY", "BOOKED", "COMPLETED", "CANCELLED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_LABEL: Record<JobStatus, string> = {
  ENQUIRY: "Enquiry",
  BOOKED: "Booked",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Waiting to happen or to be wrapped up: enquiries and confirmed bookings. */
export const isPending = (s: JobStatus) => s === "ENQUIRY" || s === "BOOKED";

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function timeToMinutes(t: string): number | null {
  if (!TIME_RE.test(t)) return null;
  return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
}

/** True when there is nothing to compare, or the end is later than the start (same day). */
export function endAfterStart(start?: string, end?: string): boolean {
  if (!start || !end) return true;
  const a = timeToMinutes(start);
  const b = timeToMinutes(end);
  if (a === null || b === null) return false;
  return b > a;
}

export function timeRangeLabel(start?: string | null, end?: string | null): string {
  if (start && end) return `${start} – ${end}`;
  if (start) return `from ${start}`;
  return "";
}

export type JobBucket = "completed" | "cancelled" | "overdue" | "upcoming";

/**
 * Where a job sits today. A pending job whose date has passed is "overdue": it still needs to be
 * marked completed or cancelled. Dates are "YYYY-MM-DD", compared as text (safe for that format).
 */
export function jobBucket(status: JobStatus, eventDateIso: string, todayIso: string): JobBucket {
  if (status === "COMPLETED") return "completed";
  if (status === "CANCELLED") return "cancelled";
  return eventDateIso < todayIso ? "overdue" : "upcoming";
}

export type JobCounts = { completed: number; pending: number; cancelled: number; upcoming: number; overdue: number };

export function summarize(jobs: { status: JobStatus; eventDate: string }[], todayIso: string): JobCounts {
  const c: JobCounts = { completed: 0, pending: 0, cancelled: 0, upcoming: 0, overdue: 0 };
  for (const j of jobs) {
    const b = jobBucket(j.status, j.eventDate, todayIso);
    if (b === "completed") c.completed += 1;
    else if (b === "cancelled") c.cancelled += 1;
    else {
      c.pending += 1;
      if (b === "overdue") c.overdue += 1;
      else c.upcoming += 1;
    }
  }
  return c;
}

/** Allowed event dates: from the year 2000 up to three years ahead of today. */
export function eventDateInRange(iso: string, todayIso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const t = Date.parse(`${iso}T00:00:00Z`);
  const today = Date.parse(`${todayIso}T00:00:00Z`);
  if (Number.isNaN(t) || Number.isNaN(today)) return false;
  // Round trip rejects impossible days such as 2026-02-30, which Date.parse silently rolls over.
  if (new Date(t).toISOString().slice(0, 10) !== iso) return false;
  return t >= Date.UTC(2000, 0, 1) && t <= today + 3 * 366 * 86_400_000;
}

/** "Sat, 12 Dec 2026" for a date stored as UTC midnight. */
export function formatDay(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}
