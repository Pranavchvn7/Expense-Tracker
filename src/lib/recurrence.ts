// Pure date maths for recurring rules (no imports, tested with plain node). All dates are
// UTC midnight, matching the Postgres DATE columns.

export type Frequency = "WEEKLY" | "MONTHLY" | "YEARLY";

const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** The occurrence after `from`. MONTHLY/YEARLY clamp to the month's last day (31st -> 30th/28th). */
export function nextOccurrence(from: Date, frequency: Frequency, anchorDay: number): Date {
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth();
  if (frequency === "WEEKLY") return new Date(Date.UTC(y, m, from.getUTCDate() + 7));
  if (frequency === "MONTHLY") {
    const ny = y + Math.floor((m + 1) / 12);
    const nm = (m + 1) % 12;
    return new Date(Date.UTC(ny, nm, Math.min(anchorDay, daysIn(ny, nm))));
  }
  return new Date(Date.UTC(y + 1, m, Math.min(anchorDay, daysIn(y + 1, m))));
}

/**
 * Occurrences due up to and including `today`, oldest first, at most `cap` of them.
 * `next` is the first occurrence NOT included; `finished` means the rule has passed its end date.
 */
export function dueOccurrences(opts: {
  nextDue: Date;
  frequency: Frequency;
  anchorDay: number;
  today: Date;
  endDate: Date | null;
  cap: number;
}): { dates: Date[]; next: Date; finished: boolean } {
  const dates: Date[] = [];
  let d = opts.nextDue;
  const end = opts.endDate?.getTime() ?? Infinity;
  while (d.getTime() <= opts.today.getTime() && d.getTime() <= end && dates.length < opts.cap) {
    dates.push(d);
    d = nextOccurrence(d, opts.frequency, opts.anchorDay);
  }
  return { dates, next: d, finished: d.getTime() > end };
}

export function utcToday(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
