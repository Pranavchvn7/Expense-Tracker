import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { deleteClient, setClientArchived } from "@/actions/clients";
import { getClient } from "@/lib/client-queries";
import { jobsForClient } from "@/lib/job-queries";
import { formatDay, jobBucket, STATUS_LABEL } from "@/lib/job-math";
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
            <p className="muted">{jobs.length} job{jobs.length === 1 ? "" : "s"} · {completed} completed</p>
            <table className="responsive">
              <thead>
                <tr><th>Date</th><th>Job</th><th className="num">Agreed</th><th>Status</th></tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const bucket = jobBucket(j.status, j.eventDate.toISOString().slice(0, 10), today.iso);
                  return (
                    <tr key={j.id} data-testid="client-job-row">
                      <td data-label="Date">{formatDay(j.eventDate)}</td>
                      <td data-label="Job"><Link className="nm" href={`/jobs/${j.id}`}>{j.title}</Link></td>
                      <td className="num" data-label="Agreed">{j.agreedAmountMinor > 0 ? formatMoney(j.agreedAmountMinor, j.currency) : <span className="muted">—</span>}</td>
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
