import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { FreelanceOff } from "@/components/FreelanceOff";
import { JobFields } from "@/components/JobFields";
import { Pager } from "@/components/Pager";
import { SoftForm } from "@/components/SoftForm";
import { SortHeader } from "@/components/SortHeader";
import { createJob, setJobStatus } from "@/actions/jobs";
import { clientOptions, listJobs, paidByJob, monthJobCounts, type JobFilter, type JobSort } from "@/lib/job-queries";
import { formatDay, jobBucket, STATUS_LABEL, timeRangeLabel } from "@/lib/job-math";
import { addMonthsKey } from "@/lib/chart-math";
import { paySummary } from "@/lib/pay-math";
import { formatMoney, monthLabel } from "@/lib/money";
import { getUserPrefs, getUserToday } from "@/lib/preferences";
import { buildHref, parsePaging } from "@/lib/paging";
import { monthSchema, uuid } from "@/lib/validation";
import { IconChevronLeft, IconChevronRight, IconInbox } from "@/components/icons";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const FILTERS: readonly JobFilter[] = ["all", "pending", "completed", "cancelled"];
const FILTER_LABEL: Record<JobFilter, string> = { all: "All", pending: "Pending", completed: "Completed", cancelled: "Cancelled" };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const prefs = await getUserPrefs();
  if (prefs.workMode === "SALARIED") return <FreelanceOff title="Jobs" />;

  const today = await getUserToday();
  // Query strings are untrusted: validate everything, fall back to safe defaults.
  const rawMonth = monthSchema.safeParse(first(sp.month));
  const maxYear = Number(today.month.slice(0, 4)) + 3;
  const month = rawMonth.success && rawMonth.data >= "2000-01" && rawMonth.data <= `${maxYear}-12` ? rawMonth.data : today.month;
  const filter: JobFilter = FILTERS.find((f) => f === first(sp.show)) ?? "all";
  const clientParsed = uuid.safeParse(first(sp.client));
  const clientId = clientParsed.success ? clientParsed.data : undefined;
  const rawQ = first(sp.q);
  const q = typeof rawQ === "string" ? rawQ.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 60) : "";
  const sort: JobSort = first(sp.sort) === "amount" ? "amount" : "date";
  const rawDir = first(sp.dir);
  const dirParam = rawDir === "asc" || rawDir === "desc" ? rawDir : undefined;
  const dir: "asc" | "desc" = dirParam ?? (sort === "amount" ? "desc" : "asc");
  const { page, perPage } = parsePaging(sp);
  const openAdd = first(sp.add) === "1";

  const [{ rows, hasNext }, counts, clients] = await Promise.all([
    listJobs({ month, filter, clientId, q: q || undefined, sort, dir, page, perPage }),
    monthJobCounts(month, today.iso),
    clientOptions(),
  ]);

  const paid = await paidByJob(rows.map((r) => r.id));

  const keep = {
    month,
    show: filter === "all" ? undefined : filter,
    client: clientId,
    q: q || undefined,
    sort: sort === "date" ? undefined : sort,
    dir: dirParam,
    pp: perPage === 10 ? undefined : String(perPage),
  };
  const sortParams = { month, show: keep.show, client: clientId, q: keep.q, pp: keep.pp };
  const hasFilter = Boolean(q || clientId || filter !== "all");
  const monthHref = (m: string) => buildHref("/jobs", { month: m });
  const tileHref = (f: JobFilter) => buildHref("/jobs", { month, show: f === "all" ? undefined : f });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Jobs</h1>
          <p>{monthLabel(month)}</p>
        </div>
        <div className="month-nav" aria-label="Choose month">
          <Link href={monthHref(addMonthsKey(month, -1))} aria-label="Previous month"><IconChevronLeft /></Link>
          <span className="current">{monthLabel(month)}</span>
          <Link href={monthHref(addMonthsKey(month, 1))} aria-label="Next month"><IconChevronRight /></Link>
        </div>
      </div>

      <div className="grid stats section" data-testid="job-summary">
        <Link className="card stat" href={tileHref("completed")} data-testid="job-count-completed">
          <span className="label">Completed</span>
          <span className="value">{counts.completed}</span>
          <span className="hint">This month</span>
        </Link>
        <Link className="card stat" href={tileHref("pending")} data-testid="job-count-pending">
          <span className="label">Pending</span>
          <span className="value">{counts.pending}</span>
          <span className="hint">
            {counts.upcoming} upcoming{counts.overdue > 0 ? ` · ${counts.overdue} to update` : ""}
          </span>
        </Link>
        <Link className="card stat" href={tileHref("cancelled")} data-testid="job-count-cancelled">
          <span className="label">Cancelled</span>
          <span className="value">{counts.cancelled}</span>
          <span className="hint">This month</span>
        </Link>
      </div>

      <details className="add" open={openAdd || (clients.length > 0 && counts.completed + counts.pending + counts.cancelled === 0 && !hasFilter)}>
        <summary>Add a job</summary>
        <div className="body">
          <ActionForm
            action={createJob}
            testId="create-job"
            submitLabel="Add job"
            className="stack"
            resetOnSuccess
            focusPrefix="job-"
            focusHref={buildHref("/jobs", { month })}
          >
            <JobFields clients={clients} defaultDate={today.iso} />
          </ActionForm>
        </div>
      </details>

      <SoftForm
        key={[month, filter, clientId, q].join("|")}
        className="card row filters"
        action="/jobs"
        busyId="records"
        label="Filter jobs"
      >
        <label>Month<input type="month" name="month" defaultValue={month} min="2000-01" max={`${maxYear}-12`} /></label>
        <label>Show
          <select name="show" defaultValue={filter}>
            {FILTERS.map((f) => <option key={f} value={f}>{FILTER_LABEL[f]}</option>)}
          </select>
        </label>
        <label>Client
          <select name="client" defaultValue={clientId ?? ""}>
            <option value="">All clients</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Search
          <span className="search">
            <input type="search" name="q" maxLength={60} defaultValue={q} placeholder="Title, place or client" />
            {q && <Link className="clear" href={buildHref("/jobs", { ...keep, q: undefined })} aria-label="Clear search" title="Clear search">×</Link>}
          </span>
        </label>
        {keep.sort && <input type="hidden" name="sort" value={keep.sort} />}
        {keep.dir && <input type="hidden" name="dir" value={keep.dir} />}
        {keep.pp && <input type="hidden" name="pp" value={keep.pp} />}
        <button className="btn" type="submit">Apply</button>
        {hasFilter && <Link className="btn ghost" href={buildHref("/jobs", { month })}>Reset</Link>}
      </SoftForm>

      <div className="card section region" id="records" data-testid="job-records">
        {rows.length === 0 ? (
          <div className="empty">
            <IconInbox />
            <strong>{hasFilter ? "No jobs match" : "No jobs this month"}</strong>
            <span>{hasFilter ? "Try a different filter." : "Use “Add a job” above, or open another month."}</span>
          </div>
        ) : (
          <table className="responsive">
            <thead>
              <tr>
                <SortHeader label="Date" column="date" sort={sort} dir={dir} basePath="/jobs" params={sortParams} />
                <th>Job</th>
                <th>Client</th>
                <SortHeader label="Agreed" column="amount" sort={sort} dir={dir} basePath="/jobs" params={sortParams} className="num" />
                <th className="num">Balance</th>
                <th>Status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((j) => {
                const iso = j.eventDate.toISOString().slice(0, 10);
                const bucket = jobBucket(j.status, iso, today.iso);
                const when = timeRangeLabel(j.startTime, j.endTime);
                const pay = paySummary(j.agreedAmountMinor, paid[j.id] ?? 0);
                return (
                  <tr key={j.id} id={`job-${j.id}`} data-testid="job-row">
                    <td data-label="Date">
                      {formatDay(j.eventDate)}
                      {when && <span className="muted note">{when}</span>}
                    </td>
                    <td data-label="Job">
                      <span className="name-block">
                        <span className="name-cell"><Link className="nm" href={`/jobs/${j.id}`}>{j.title}</Link></span>
                        {j.location && <span className="muted note">{j.location}</span>}
                      </span>
                    </td>
                    <td data-label="Client"><Link href={`/clients/${j.client.id}`}>{j.client.name}</Link></td>
                    <td className="num" data-label="Agreed">{j.agreedAmountMinor > 0 ? formatMoney(j.agreedAmountMinor, j.currency) : <span className="muted">—</span>}</td>
                    <td className="num" data-label="Balance" data-testid="job-balance">
                      {pay.state === "none" ? <span className="muted">—</span> : pay.state === "paid" ? <span className="tag pay-paid">Paid</span> : pay.state === "over" ? <span className="tag pay-over">Over</span> : formatMoney(pay.balanceMinor, j.currency)}
                    </td>
                    <td data-label="Status">
                      <span className={`tag st-${bucket}`} data-testid="job-status">
                        {bucket === "overdue" ? `${STATUS_LABEL[j.status]} · update` : STATUS_LABEL[j.status]}
                      </span>
                    </td>
                    <td className="nolabel">
                      <div className="cell-actions">
                        {(bucket === "upcoming" || bucket === "overdue") && (
                          <ActionForm action={setJobStatus} testId="set-job-status" submitLabel="Mark completed">
                            <input type="hidden" name="id" value={j.id} />
                            <input type="hidden" name="status" value="COMPLETED" />
                          </ActionForm>
                        )}
                        <Link className="btn ghost small" href={`/jobs/${j.id}`} data-testid="job-view">View</Link>
                        <Link className="btn ghost small" href={`/jobs/${j.id}/edit`} data-testid="job-edit">Edit</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Pager
          basePath="/jobs"
          params={{ month, show: keep.show, client: clientId, q: keep.q, sort: keep.sort, dir: keep.dir }}
          page={page}
          perPage={perPage}
          hasNext={hasNext}
          rowCount={rows.length}
        />
      </div>
    </>
  );
}
