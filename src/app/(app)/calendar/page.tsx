import Link from "next/link";
import { FreelanceOff } from "@/components/FreelanceOff";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { addMonthsKey } from "@/lib/chart-math";
import { clashingIds, findConflicts, groupByDay, gridRange, monthGrid, sortDay } from "@/lib/cal-math";
import { calendarJobs } from "@/lib/job-queries";
import { jobBucket, STATUS_LABEL, timeRangeLabel } from "@/lib/job-math";
import { monthLabel } from "@/lib/money";
import { getUserPrefs, getUserToday } from "@/lib/preferences";
import { monthSchema } from "@/lib/validation";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const MAX_CHIPS = 2;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const prefs = await getUserPrefs();
  if (prefs.workMode === "SALARIED") return <FreelanceOff title="Calendar" />;
  const sp = await searchParams;
  const today = await getUserToday();
  const parsed = monthSchema.safeParse(first(sp.month));
  const month = parsed.success ? parsed.data : today.month;
  const weeks = monthGrid(month);
  const range = gridRange(month);
  if (!range) return null;
  const rows = await calendarJobs(range.from, range.to);
  const jobs = rows.map((r) => ({ ...r, iso: r.eventDate.toISOString().slice(0, 10) }));
  const byDay = groupByDay(jobs.map((j) => ({ ...j, eventDate: j.iso })));
  const clashes = clashingIds(jobs.map((j) => ({ id: j.id, eventDate: j.iso, startTime: j.startTime, endTime: j.endTime, status: j.status })));

  const rawDay = first(sp.day);
  const inGrid = (d?: string) => Boolean(d && weeks.some((w) => w.some((c) => c.iso === d && c.inMonth)));
  const selected = inGrid(rawDay) ? (rawDay as string) : inGrid(today.iso) ? today.iso : `${month}-01`;
  const dayJobs = sortDay(byDay[selected] ?? []);
  const dayLabel = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${selected}T00:00:00Z`));
  const monthCount = jobs.filter((j) => j.iso.startsWith(month) && j.status !== "CANCELLED").length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Calendar</h1>
          <p>{monthLabel(month)} · {monthCount} job{monthCount === 1 ? "" : "s"}</p>
        </div>
        <div className="month-nav" aria-label="Choose month">
          <Link href={`/calendar?month=${addMonthsKey(month, -1)}`} aria-label="Previous month" data-testid="cal-prev"><IconChevronLeft /></Link>
          <span className="current">{monthLabel(month)}</span>
          <Link href={`/calendar?month=${addMonthsKey(month, 1)}`} aria-label="Next month" data-testid="cal-next"><IconChevronRight /></Link>
        </div>
        <div className="actions">
          {month !== today.month && <Link className="btn soft small" href="/calendar" data-testid="cal-today">Today</Link>}
          <Link className="btn soft small" href="/jobs?add=1" data-testid="cal-add-job">Add a job</Link>
        </div>
      </div>

      <div className="card section" data-testid="calendar">
        <div className="cal-head" aria-hidden="true">
          {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="cal-grid">
          {weeks.flat().map((c) => {
            const list = sortDay(byDay[c.iso] ?? []);
            const active = list.filter((j) => j.status !== "CANCELLED");
            const clash = active.some((j) => clashes.has(j.id));
            const cls = ["cal-day", !c.inMonth && "out", c.iso === today.iso && "today", c.iso === selected && "sel", clash && "clash"].filter(Boolean).join(" ");
            return (
              <Link
                key={c.iso}
                className={cls}
                href={`/calendar?month=${month}&day=${c.iso}`}
                data-testid="cal-day"
                data-date={c.iso}
                aria-label={`${c.iso}, ${active.length} job${active.length === 1 ? "" : "s"}${clash ? ", double booked" : ""}`}
                aria-current={c.iso === selected ? "date" : undefined}
              >
                <span className="cal-num">{Number(c.iso.slice(8, 10))}</span>
                {active.length > 0 && <span className="cal-count" data-testid="cal-count">{active.length}</span>}
                <span className="cal-chips">
                  {list.slice(0, MAX_CHIPS).map((j) => (
                    <span key={j.id} className={`cal-chip st-${jobBucket(j.status, j.iso, today.iso)}`}>{j.startTime ? `${j.startTime} ` : ""}{j.title}</span>
                  ))}
                  {list.length > MAX_CHIPS && <span className="cal-more">+{list.length - MAX_CHIPS} more</span>}
                </span>
              </Link>
            );
          })}
        </div>
        <p className="muted cal-legend">Teal: upcoming · Green: completed · Red: needs updating or double booked · Struck through: cancelled</p>
      </div>

      <div className="card section" data-testid="cal-agenda">
        <div className="card-head">
          <h2>{dayLabel}</h2>
          <Link className="btn soft small" href="/jobs?add=1" data-testid="cal-agenda-add">Add a job</Link>
        </div>
        {dayJobs.length === 0 ? (
          <p className="muted">Nothing booked this day.</p>
        ) : (
          <ul className="agenda">
            {dayJobs.map((j) => {
              const bucket = jobBucket(j.status, j.iso, today.iso);
              const others = findConflicts(
                { id: j.id, eventDate: j.iso, startTime: j.startTime, endTime: j.endTime, status: j.status },
                dayJobs.map((o) => ({ id: o.id, eventDate: o.iso, startTime: o.startTime, endTime: o.endTime, status: o.status, title: o.title })),
              );
              const top = others[0];
              return (
                <li key={j.id} data-testid="agenda-item">
                  <span className="agenda-time">{timeRangeLabel(j.startTime, j.endTime) || "All day"}</span>
                  <span className="name-block">
                    <span className="name-cell">
                      <Link className="nm" href={`/jobs/${j.id}`}>{j.title}</Link>
                      <span className={`tag st-${bucket}`}>{bucket === "overdue" ? `${STATUS_LABEL[j.status]} · update` : STATUS_LABEL[j.status]}</span>
                    </span>
                    <span className="muted note"><Link href={`/clients/${j.client.id}`}>{j.client.name}</Link>{j.location ? ` · ${j.location}` : ""}</span>
                    {top && (
                      <span className="clash-note" role="note" data-testid="agenda-clash">
                        {top.kind === "overlap" ? "Overlaps with" : "Same day as"} {others.map((o) => o.job.title).join(", ")}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
