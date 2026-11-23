import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { deleteJob, setJobStatus } from "@/actions/jobs";
import { addJobPayment } from "@/actions/job-payments";
import { deleteIncome } from "@/actions/income";
import { getJob, jobPayments } from "@/lib/job-queries";
import { KIND_LABEL, PAYMENT_KINDS, paySummary, suggestAmountMinor, suggestKind, toDecimalString } from "@/lib/pay-math";
import { formatDay, jobBucket, STATUS_LABEL, timeRangeLabel } from "@/lib/job-math";
import { formatMoney } from "@/lib/money";
import { getUserPrefs, getUserToday } from "@/lib/preferences";
import { uuid } from "@/lib/validation";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const prefs = await getUserPrefs();
  if (prefs.workMode === "SALARIED") notFound();
  const [job, today, payments] = await Promise.all([getJob(id), getUserToday(), jobPayments(id)]);
  if (!job) notFound();
  const paid = payments.reduce((n, x) => n + x.amountMinor, 0);
  const pay = paySummary(job.agreedAmountMinor, paid);
  const prefill = suggestAmountMinor(job.agreedAmountMinor, paid);
  const defaultKind = suggestKind(paid);
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
        <div className="card-head">
          <h2>Payments</h2>
          <span className={`tag pay-${pay.state === "none" ? "unpaid" : pay.state}`} data-testid="pay-status">{pay.label}</span>
        </div>
        <dl className="money-summary" data-testid="pay-summary">
          <div><dt>Agreed</dt><dd data-testid="pay-agreed">{job.agreedAmountMinor > 0 ? formatMoney(job.agreedAmountMinor, job.currency) : "—"}</dd></div>
          <div><dt>Received</dt><dd data-testid="pay-received">{formatMoney(pay.paidMinor, job.currency)}</dd></div>
          <div><dt>{pay.state === "over" ? "Over by" : "Balance due"}</dt><dd data-testid="pay-balance">{formatMoney(pay.state === "over" ? pay.overMinor : pay.balanceMinor, job.currency)}</dd></div>
        </dl>
        {payments.length === 0 ? (
          <p className="muted">No payments yet. Record the advance when the client pays it.</p>
        ) : (
          <table className="responsive">
            <thead><tr><th>Date</th><th>Type</th><th className="num">Amount</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {payments.map((x) => (
                <tr key={x.id} data-testid="payment-row">
                  <td data-label="Date">{x.receivedOn.toISOString().slice(0, 10)}</td>
                  <td data-label="Type">
                    {x.paymentKind ? KIND_LABEL[x.paymentKind] : "Payment"}
                    {x.note && <span className="muted note">{x.note}</span>}
                  </td>
                  <td className="num income" data-label="Amount">+{formatMoney(x.amountMinor, x.currency)}</td>
                  <td className="nolabel">
                    <div className="cell-actions">
                      <Link className="btn ghost small" href={`/income/${x.id}/edit`} data-testid="payment-edit">Edit</Link>
                      <ActionForm action={deleteIncome} testId="delete-income" submitLabel="Delete" danger confirmMessage="Delete this payment?">
                        <input type="hidden" name="id" value={x.id} />
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <details className="add" open={payments.length === 0 && job.status !== "CANCELLED"}>
          <summary>Add a payment</summary>
          <div className="body">
            <ActionForm action={addJobPayment} testId="add-job-payment" submitLabel="Add payment" className="stack" resetOnSuccess>
              <input type="hidden" name="jobId" value={job.id} />
              <div className="row">
                <label>Amount
                  <input name="amount" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" placeholder="0.00" defaultValue={prefill > 0 ? toDecimalString(prefill) : ""} required />
                </label>
                <label>Date received
                  <input name="receivedOn" type="date" defaultValue={today.iso} max={today.iso} required />
                </label>
              </div>
              <label>Payment type
                <select name="kind" defaultValue={defaultKind}>
                  {PAYMENT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </select>
              </label>
              <label>Note (optional)
                <input name="note" maxLength={500} placeholder="UPI, cash, bank transfer…" />
              </label>
            </ActionForm>
          </div>
        </details>
        <p className="muted">Payments also appear in Income, labelled with this client and job. Job costs (travel, assistants) arrive in the next update.</p>
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
