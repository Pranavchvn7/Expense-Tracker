import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { deleteClient, setClientArchived } from "@/actions/clients";
import { getClient } from "@/lib/client-queries";
import { getUserPrefs } from "@/lib/preferences";
import { uuid } from "@/lib/validation";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const prefs = await getUserPrefs();
  if (prefs.workMode === "SALARIED") notFound();
  const client = await getClient(id);
  if (!client) notFound();

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
        <h2>Jobs and payments</h2>
        <p className="muted">Jobs, payments and the full history with this client will appear here as soon as you add jobs.</p>
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
