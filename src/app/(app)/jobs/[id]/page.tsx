import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { deleteJob, setJobStatus } from "@/actions/jobs";
import { getJob } from "@/lib/job-queries";
import { formatDay, jobBucket, STATUS_LABEL, timeRangeLabel } from "@/lib/job-math";
import { formatMoney } from "@/lib/money";
import { getUserPrefs, getUserToday } from "@/lib/preferences";
import { uuid } from "@/lib/validation";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const prefs = await getUserPrefs();
  if (prefs.workMode === "SALARIED") notFound();
  const [job, today] = await Promise.all([getJob(id), getUserToday()]);
  if (!job) notFound();
  const iso = job.eventDate.toISOString().slice(0, 10);
  const bucket = jobBucket(job.status, iso, today.iso);
  const when = timeRangeLabel(job.startTime, job.endTime);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{job.title}</h1>
          <p>
            <span className={`tag st-${bucket}`} data-testid="job-status">
              {bucket === "overdue" ? `${STATUS_LABEL[job.status]} · update` : STATUS_LABEL[job.status]}
            </span>{" "}
            {formatDay(job.eventDate)}{when ? ` · ${when}` : ""}
          </p>
        </div>
        <div className="actions">
          <Link className="btn soft small" href={`/jobs/${job.id}/edit`} data-testid="job-edit">Edit</Link>
        </div>
      </div>

      <div className="card section" data-testid="job-details">
        <h2>Details</h2>
        <dl className="kv">
          <div><dt>Client</dt><dd><Link href={`/clients/${job.client.id}`}>{job.client.name}</Link></dd></div>
          <div><dt>Service</dt><dd>{job.serviceType ?? <span className="muted">—</span>}</dd></div>
          <div><dt>Location</dt><dd>{job.location ?? <span className="muted">—</span>}</dd></div>
          <div><dt>Agreed amount</dt><dd>{job.agreedAmountMinor > 0 ? formatMoney(job.agreedAmountMinor, job.currency) : <span className="muted">Not agreed yet</span>}</dd></div>
          <div><dt>Notes</dt><dd className="pre">{job.notes ?? <span className="muted">—</span>}</dd></div>
        </dl>
      </div>

      <div className="card section" data-testid="job-money">
        <h2>Payments and costs</h2>
        <p className="muted">Advance and part payments from the client, and costs such as travel or assistants, will be added here in the next update.</p>
      </div>

      <div className="card section">
        <h2>Manage</h2>
        <div className="actions">
          {job.status !== "COMPLETED" && job.status !== "CANCELLED" && (
            <ActionForm action={setJobStatus} testId="set-job-status" submitLabel="Mark completed">
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="status" value="COMPLETED" />
            </ActionForm>
          )}
          {job.status === "BOOKED" || job.status === "ENQUIRY" ? (
            <ActionForm action={setJobStatus} testId="cancel-job" submitLabel="Cancel job" confirmMessage="Mark this job as cancelled?">
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="status" value="CANCELLED" />
            </ActionForm>
          ) : (
            <ActionForm action={setJobStatus} testId="reopen-job" submitLabel="Reopen as booked">
              <input type="hidden" name="id" value={job.id} />
              <input type="hidden" name="status" value="BOOKED" />
            </ActionForm>
          )}
          <ActionForm
            action={deleteJob}
            testId="delete-job"
            submitLabel="Delete job"
            danger
            confirmMessage="Delete this job permanently?"
            successHref="/jobs"
          >
            <input type="hidden" name="id" value={job.id} />
          </ActionForm>
        </div>
        <p className="muted">Cancelling keeps the job for your records. Deleting removes it for good.</p>
      </div>
      <p><Link href="/jobs">← All jobs</Link></p>
    </>
  );
}
