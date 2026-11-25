import Link from "next/link";
import { materializeRecurring } from "@/lib/recurring";
import { ActionForm } from "@/components/ActionForm";
import { createIncome, deleteIncome } from "@/actions/income";
import { listIncome } from "@/lib/finance-queries";
import { formatMoney, monthLabel } from "@/lib/money";
import { getUserPrefs, getUserToday } from "@/lib/preferences";
import { Pager } from "@/components/Pager";
import { parsePaging } from "@/lib/paging";
import { KIND_LABEL } from "@/lib/pay-math";
import { IconUpload } from "@/components/icons";
import { addMonthsKey } from "@/lib/chart-math";
import { monthSchema, uuid } from "@/lib/validation";
import { IconChevronLeft, IconChevronRight, IconWallet } from "@/components/icons";

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const today = await getUserToday();
  const now = today.month;
  const prefs = await getUserPrefs();
  const { page, perPage } = parsePaging(sp);
  const openAdd = (Array.isArray(sp.add) ? sp.add[0] : sp.add) === "1";
  const parsed = monthSchema.safeParse(Array.isArray(sp.month) ? sp.month[0] : sp.month);
  const month = parsed.success && parsed.data <= now ? parsed.data : now;
  // Create anything that fell due since the last visit before reading the data.
  await materializeRecurring();
  const jobParsed = uuid.safeParse(Array.isArray(sp.job) ? sp.job[0] : sp.job);
  const jobId = jobParsed.success ? jobParsed.data : undefined;
  const clientParsed = uuid.safeParse(Array.isArray(sp.client) ? sp.client[0] : sp.client);
  const clientFilter = clientParsed.success && !jobId ? clientParsed.data : undefined;
  const filtered = Boolean(jobId || clientFilter);
  const { rows, hasNext, totals } = await listIncome(month, page, perPage, { jobId, clientId: clientFilter });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{prefs.workMode === "FREELANCE" ? "Client payments" : "Income"}</h1>
          <p>
            {filtered ? "All months" : monthLabel(month)}
            {totals.length > 0 ? ` · ${totals.map((t) => formatMoney(t._sum.amountMinor ?? 0, t.currency)).join(" · ")}` : ""}
          </p>
        </div>
        <div className="month-nav" aria-label="Choose month">
          <Link href={`/income?month=${addMonthsKey(month, -1)}`} aria-label="Previous month"><IconChevronLeft /></Link>
          <span className="current">{monthLabel(month)}</span>
          <Link
            href={`/income?month=${addMonthsKey(month, 1)}`}
            aria-label="Next month"
            aria-disabled={month >= now}
            tabIndex={month >= now ? -1 : undefined}
          >
            <IconChevronRight />
          </Link>
        </div>
        <div className="actions">
          <Link className="btn soft small" href="/import"><IconUpload />Import CSV</Link>
        </div>
      </div>

      {filtered && (
        <p className="notice" role="note" data-testid="income-job-filter">
          Showing only payments linked to {jobId ? "one job" : "one client's jobs"}, all months.{" "}
          <Link href="/income" data-testid="income-job-filter-clear">Show all income</Link>
        </p>
      )}

      <details className="add" open={openAdd}>
        <summary>Add income</summary>
        <div className="body">
          <ActionForm action={createIncome} testId="create-income" offlineKind="income" submitLabel="Add income" className="stack" resetOnSuccess>
            <div className="row">
              <label>Amount
                <input name="amount" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" placeholder="0.00" required />
              </label>
              <label>Date received
                <input name="receivedOn" type="date" defaultValue={today.iso} max={today.iso} required />
              </label>
            </div>
            <label>Source
              <input name="source" maxLength={80} placeholder="Salary, refund, gift…" required />
            </label>
            <label>Note (optional)
              <textarea name="note" maxLength={500} rows={2} />
            </label>
          </ActionForm>
        </div>
      </details>

      <div className="card section">
        {rows.length === 0 ? (
          <div className="empty">
            <IconWallet />
            <strong>No income recorded for {monthLabel(month)}</strong>
            <span>Add your salary or other money received to see your balance on the dashboard.</span>
          </div>
        ) : (
          <table className="responsive">
            <thead>
              <tr><th>Date</th><th>Source</th><th className="num">Amount</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} data-testid="income-row">
                  <td data-label="Date">{r.receivedOn.toISOString().slice(0, 10)}</td>
                  <td data-label="Source">
                    <span className="name-block">
                      <span className="name-cell">
                        <span className="nm">{r.source}</span>
                        {r.recurringRuleId && <span className="tag">Recurring</span>}
                        {r.job && r.paymentKind && <span className="tag" data-testid="payment-kind">{KIND_LABEL[r.paymentKind]}</span>}
                      </span>
                      {r.job && <span className="muted note" data-testid="payment-job">Job: <Link href={`/jobs/${r.job.id}`}>{r.job.title}</Link> · {r.job.client.name}</span>}
                      {r.note && <span className="muted note">{r.note}</span>}
                    </span>
                  </td>
                  <td className="num income" data-label="Amount">+{formatMoney(r.amountMinor, r.currency)}</td>
                  <td className="nolabel">
                    <div className="cell-actions">
                      <Link className="btn ghost small" href={`/income/${r.id}/edit`}>Edit</Link>
                      <ActionForm
                        action={deleteIncome} testId="delete-income"
                        submitLabel="Delete"
                        danger
                        confirmMessage="Delete this income entry?"
                      >
                        <input type="hidden" name="id" value={r.id} />
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pager
          basePath="/income"
          params={{ month, job: jobId, client: clientFilter }}
          page={page}
          perPage={perPage}
          hasNext={hasNext}
          rowCount={rows.length}
        />
      </div>
    </>
  );
}
