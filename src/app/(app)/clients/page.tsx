import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { ClientFields } from "@/components/ClientFields";
import { FreelanceOff } from "@/components/FreelanceOff";
import { Pager } from "@/components/Pager";
import { SoftForm } from "@/components/SoftForm";
import { SortHeader } from "@/components/SortHeader";
import { createClient } from "@/actions/clients";
import { clientCounts, listClients, type ClientSort, type ClientStatus } from "@/lib/client-queries";
import { getUserPrefs } from "@/lib/preferences";
import { buildHref, parsePaging } from "@/lib/paging";
import { IconInbox } from "@/components/icons";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const STATUSES: readonly ClientStatus[] = ["active", "archived", "all"];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const prefs = await getUserPrefs();
  if (prefs.workMode === "SALARIED") return <FreelanceOff title="Clients" />;

  // Query strings are untrusted: validate everything, fall back to safe defaults.
  const { page, perPage } = parsePaging(sp);
  const rawQ = first(sp.q);
  const q = typeof rawQ === "string" ? rawQ.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 60) : "";
  const status: ClientStatus = STATUSES.find((s) => s === first(sp.status)) ?? "active";
  const sort: ClientSort = first(sp.sort) === "added" ? "added" : "name";
  const rawDir = first(sp.dir);
  const dirParam = rawDir === "asc" || rawDir === "desc" ? rawDir : undefined;
  const dir: "asc" | "desc" = dirParam ?? (sort === "added" ? "desc" : "asc");
  const openAdd = first(sp.add) === "1";

  const [{ rows, hasNext }, counts] = await Promise.all([
    listClients({ q: q || undefined, status, sort, dir, page, perPage }),
    clientCounts(),
  ]);

  const keep = {
    q: q || undefined,
    status: status === "active" ? undefined : status,
    sort: sort === "name" ? undefined : sort,
    dir: dirParam,
    pp: perPage === 10 ? undefined : String(perPage),
  };
  const sortParams = { q: keep.q, status: keep.status, pp: keep.pp };
  const hasFilter = Boolean(q || status !== "active");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Clients</h1>
          <p>{counts.active} active{counts.archived > 0 ? ` · ${counts.archived} archived` : ""}</p>
        </div>
      </div>

      <details className="add" open={openAdd || (counts.active + counts.archived === 0)}>
        <summary>Add a client</summary>
        <div className="body">
          <ActionForm
            action={createClient}
            testId="create-client"
            submitLabel="Add client"
            className="stack"
            resetOnSuccess
            focusPrefix="client-"
            focusHref="/clients"
          >
            <ClientFields />
          </ActionForm>
        </div>
      </details>

      <SoftForm
        key={[q, status].join("|")}
        className="card row filters"
        action="/clients"
        busyId="records"
        label="Filter clients"
      >
        <label>Search
          <span className="search">
            <input type="search" name="q" maxLength={60} defaultValue={q} placeholder="Name, phone, email or city" />
            {q && <Link className="clear" href={buildHref("/clients", { ...keep, q: undefined })} aria-label="Clear search" title="Clear search">×</Link>}
          </span>
        </label>
        <label>Show
          <select name="status" defaultValue={status}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </label>
        {keep.sort && <input type="hidden" name="sort" value={keep.sort} />}
        {keep.dir && <input type="hidden" name="dir" value={keep.dir} />}
        {keep.pp && <input type="hidden" name="pp" value={keep.pp} />}
        <button className="btn" type="submit">Apply</button>
        {hasFilter && <Link className="btn ghost" href="/clients">Reset</Link>}
      </SoftForm>

      <div className="card section region" id="records" data-testid="client-records">
        {rows.length === 0 ? (
          <div className="empty">
            <IconInbox />
            <strong>{hasFilter ? "No clients match" : "No clients yet"}</strong>
            <span>{hasFilter ? "Try a different search or filter." : "Use “Add a client” above to save your first one."}</span>
          </div>
        ) : (
          <table className="responsive">
            <thead>
              <tr>
                <SortHeader label="Name" column="name" sort={sort} dir={dir} basePath="/clients" params={sortParams} />
                <th>Phone</th>
                <th>City</th>
                <th>Found via</th>
                <SortHeader label="Added" column="added" sort={sort} dir={dir} basePath="/clients" params={sortParams} />
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} id={`client-${c.id}`} data-testid="client-row">
                  <td data-label="Name">
                    <span className="name-cell">
                      <Link className="nm" href={`/clients/${c.id}`}>{c.name}</Link>
                      {c.archived && <span className="tag">Archived</span>}
                    </span>
                  </td>
                  <td data-label="Phone">{c.phone ?? <span className="muted">—</span>}</td>
                  <td data-label="City">{c.city ?? <span className="muted">—</span>}</td>
                  <td data-label="Found via">{c.source ?? <span className="muted">—</span>}</td>
                  <td data-label="Added">{c.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="nolabel">
                    <div className="cell-actions">
                      <Link className="btn ghost small" href={`/clients/${c.id}`} data-testid="client-view">View</Link>
                      <Link className="btn ghost small" href={`/clients/${c.id}/edit`} data-testid="client-edit">Edit</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pager
          basePath="/clients"
          params={{ q: keep.q, status: keep.status, sort: keep.sort, dir: keep.dir }}
          page={page}
          perPage={perPage}
          hasNext={hasNext}
          rowCount={rows.length}
        />
      </div>
    </>
  );
}
