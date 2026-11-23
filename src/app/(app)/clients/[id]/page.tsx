import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { deleteClient, setClientArchived } from "@/actions/clients";
import { getClient } from "@/lib/client-queries";
import { costsByJob, jobsForClient, paidByJob } from "@/lib/job-queries";
import { formatDay, jobBucket, STATUS_LABEL } from "@/lib/job-math";
import { paySummary, profitSummary } from "@/lib/pay-math";
import { formatMoney } from "@/lib/money";
import { getUserPrefs, getUserToday } from "@/lib/preferences";
import { uuid } from "@/lib/validation";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const prefs = await getUserPrefs();
  if (prefs.workMode === "SALARIED") notFound();
  const [client, jobs, today] = await Promise.all([getClient(id), jobsForClient(id), getUserToday()]);
  if (!client) notFound();
  const ids = jobs.map((j) => j.id);
  const [paid, costs] = await Promise.all([paidByJob(ids), costsByJob(ids)]);
  const totalCosts = jobs.reduce((n, j) => n + (costs[j.id] ?? 0), 0);
  const totalPaid = jobs.reduce((n, j) => n + (paid[j.id] ?? 0), 0);
  const totalDue = jobs.reduce((n, j) => n + (j.status === "CANCELLED" ? 0 : paySummary(j.agreedAmountMinor, paid[j.id] ?? 0).balanceMinor), 0);
  const kept = profitSummary(0, totalPaid, totalCosts).profitMinor;
  const money = jobs[0]?.currency ?? "INR";
  const completed = jobs.filter((j) => j.status === "COMPLETED").length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{client.name}{client.archived ? " (archived)" : ""}</h1>
          <p>Client since {client.createdAt.toISOString().slice(0, 10)}</p>
        </div>
        <div className="actions">
          <Link className="btn soft small" href={`/clients/${client.id}/edit`} data-testid="client-edit">Edit</Link>
        </div>
      </div>

      <div className="card section" data-testid="client-details">
        <h2>Details</h2>
        <dl className="kv">
          <div><dt>Phone</dt><dd>{client.phone ? <a href={`tel:${client.phone}`}>{client.phone}</a> : <span className="muted">—</span>}</dd></div>
          <div><dt>Email</dt><dd>{client.email ? <a href={`mailto:${client.email}`}>{client.email}</a> : <span className="muted">—</span>}</dd></div>
          <div><dt>City</dt><dd>{client.city ?? <span className="muted">—</span>}</dd></div>
          <div><dt>Address</dt><dd>{client.address ?? <span className="muted">—</span>}</dd></div>
          <div><dt>Found via</dt><dd>{client.source ?? <span className="muted">—</span>}</dd></div>
          <div><dt>Private notes</dt><dd className="pre">{client.notes ?? <span className="muted">—</span>}</dd></div>
        </dl>
      </div>

      <div className="card section" data-testid="client-jobs">
        <div className="card-head">
          <h2>Jobs</h2>
          <Link className="btn soft small" href="/jobs?add=1" data-testid="client-add-job">Add a job</Link>
        </div>
        {jobs.length === 0 ? (
          <p className="muted">No jobs for this client yet. Payments and the full history will build up here as you add jobs.</p>
        ) : (
          <>
            <dl className="money-summary" data-testid="client-money">
              <div><dt>Jobs</dt><dd>{jobs.length} ({completed} completed)</dd></div>
              <div><dt>Total received</dt><dd data-testid="client-paid">{formatMoney(totalPaid, money)}</dd></div>
              <div><dt>Balance due</dt><dd data-testid="client-due">{formatMoney(totalDue, money)}</dd></div>
              <div><dt>Costs</dt><dd data-testid="client-costs">{formatMoney(totalCosts, money)}</dd></div>
              <div><dt>Profit</dt><dd data-testid="client-profit">{formatMoney(kept, money)}</dd></div>
            </dl>
            <p className="muted">
              <Link href={`/income?client=${client.id}`} data-testid="client-income-link">Payments in Income</Link>{" · "}
              <Link href={`/expenses?client=${client.id}`} data-testid="client-expenses-link">Costs in Expenses</Link>
            </p>
            <table className="responsive">
              <thead>
                <tr><th>Date</th><th>Job</th><th className="num">Agreed</th><th className="num">Balance</th><th>Status</th></tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const bucket = jobBucket(j.status, j.eventDate.toISOString().slice(0, 10), today.iso);
                  return (
                    <tr key={j.id} data-testid="client-job-row">
                      <td data-label="Date">{formatDay(j.eventDate)}</td>
                      <td data-label="Job"><Link className="nm" href={`/jobs/${j.id}`}>{j.title}</Link></td>
                      <td className="num" data-label="Agreed">{j.agreedAmountMinor > 0 ? formatMoney(j.agreedAmountMinor, j.currency) : <span className="muted">—</span>}</td>
                      <td className="num" data-label="Balance">{(() => { const s = paySummary(j.agreedAmountMinor, paid[j.id] ?? 0); return s.state === "none" ? <span className="muted">—</span> : s.state === "paid" ? <span className="tag pay-paid">Paid</span> : s.state === "over" ? <span className="tag pay-over">Over</span> : formatMoney(s.balanceMinor, j.currency); })()}</td>
                      <td data-label="Status"><span className={`tag st-${bucket}`}>{bucket === "overdue" ? `${STATUS_LABEL[j.status]} · update` : STATUS_LABEL[j.status]}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div className="card section">
        <h2>Manage</h2>
        <div className="actions">
          <ActionForm
            action={setClientArchived}
            testId="set-client-archived"
            submitLabel={client.archived ? "Restore client" : "Archive client"}
          >
            <input type="hidden" name="id" value={client.id} />
            <input type="hidden" name="archived" value={client.archived ? "0" : "1"} />
          </ActionForm>
          <ActionForm
            action={deleteClient}
            testId="delete-client"
            submitLabel="Delete client"
            danger
            confirmMessage="Delete this client permanently?"
            successHref="/clients"
          >
            <input type="hidden" name="id" value={client.id} />
          </ActionForm>
        </div>
        <p className="muted">Archiving hides a client from the main list and keeps everything. Deleting removes the client for good.</p>
      </div>
      <p><Link href="/clients">← All clients</Link></p>
    </>
  );
}
