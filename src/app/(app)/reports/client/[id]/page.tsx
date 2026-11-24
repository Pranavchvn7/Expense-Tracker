import Link from "next/link";
import { notFound } from "next/navigation";
import { IconDownload } from "@/components/icons";
import { clientReport } from "@/lib/freelance-queries";
import { formatDay, jobBucket, STATUS_LABEL } from "@/lib/job-math";
import { formatMoney } from "@/lib/money";
import { COST_LABEL, KIND_LABEL } from "@/lib/pay-math";
import { getUserPrefs, getUserToday } from "@/lib/preferences";
import { uuid } from "@/lib/validation";

export default async function ClientReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  if ((await getUserPrefs()).workMode === "SALARIED") notFound();
  const [r, today] = await Promise.all([clientReport(id), getUserToday()]);
  if (!r) notFound();
  const cur = r.currency;
  const t = r.totals;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Client report</h1>
          <p><Link href={`/clients/${r.client.id}`}>{r.client.name}</Link> · {cur}</p>
        </div>
        <div className="actions">
          {/* Plain <a>, not <Link>: prefetching would generate the PDF and use up the rate limit. */}
          <a className="btn soft small" href={`/reports/client/${r.client.id}/pdf`} data-testid="client-report-pdf"><IconDownload />Download PDF</a>
        </div>
      </div>

      <div className="grid stats section" data-testid="client-report-summary">
        <div className="card stat"><span className="label">Jobs</span><span className="value" data-testid="cr-jobs">{r.rows.length}</span><span className="hint">All statuses</span></div>
        <div className="card stat income"><span className="label">Received</span><span className="value" data-testid="cr-received">{formatMoney(t.receivedMinor, cur)}</span><span className="hint">Of {formatMoney(t.agreedMinor, cur)} agreed</span></div>
        <div className="card stat spend"><span className="label">Balance due</span><span className="value" data-testid="cr-balance">{formatMoney(t.balanceMinor, cur)}</span><span className="hint">Cancelled jobs owe nothing</span></div>
        <div className={`card stat ${t.profitMinor >= 0 ? "pos" : "neg"}`}><span className="label">Profit</span><span className="value" data-testid="cr-profit">{formatMoney(t.profitMinor, cur)}</span><span className="hint">After {formatMoney(t.costsMinor, cur)} costs</span></div>
      </div>

      <div className="card section" data-testid="client-report-jobs">
        <div className="card-head"><h2>Jobs</h2></div>
        {r.rows.length === 0 ? (
          <p className="muted">No jobs for this client yet.</p>
        ) : (
          <table className="responsive">
            <thead><tr><th>Date</th><th>Job</th><th>Status</th><th className="num">Agreed</th><th className="num">Received</th><th className="num">Costs</th><th className="num">Profit</th></tr></thead>
            <tbody>
              {r.rows.map((j) => {
                const bucket = jobBucket(j.status, j.eventDate.toISOString().slice(0, 10), today.iso);
                return (
                  <tr key={j.id} data-testid="client-report-job-row">
                    <td data-label="Date">{formatDay(j.eventDate)}</td>
                    <td data-label="Job"><Link className="nm" href={`/reports/job/${j.id}`}>{j.title}</Link></td>
                    <td data-label="Status"><span className={`tag st-${bucket}`}>{STATUS_LABEL[j.status]}</span></td>
                    <td className="num" data-label="Agreed">{formatMoney(j.agreedAmountMinor, cur)}</td>
                    <td className="num" data-label="Received">{formatMoney(j.receivedMinor, cur)}</td>
                    <td className="num" data-label="Costs">{formatMoney(j.costsMinor, cur)}</td>
                    <td className="num" data-label="Profit">{formatMoney(j.profitMinor, cur)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid two section equal">
        <div className="card panel" data-testid="client-report-payments">
          <div className="card-head"><h2>Payments received</h2></div>
          {r.payments.length === 0 ? <p className="muted">No payments yet.</p> : (
            <table className="responsive">
              <thead><tr><th>Date</th><th>Job</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {r.payments.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Date">{p.receivedOn.toISOString().slice(0, 10)}</td>
                    <td data-label="Job">{p.job?.title ?? ""}<span className="muted note">{p.paymentKind ? KIND_LABEL[p.paymentKind] : "Payment"}</span></td>
                    <td className="num income" data-label="Amount">+{formatMoney(p.amountMinor, p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card panel" data-testid="client-report-costs">
          <div className="card-head"><h2>Job costs</h2></div>
          {r.costRows.length === 0 ? <p className="muted">No costs recorded.</p> : (
            <table className="responsive">
              <thead><tr><th>Date</th><th>Cost</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {r.costRows.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Date">{c.spentOn.toISOString().slice(0, 10)}</td>
                    <td data-label="Cost">{c.description}<span className="muted note">{c.job?.title ?? ""}{c.costKind ? ` · ${COST_LABEL[c.costKind]}` : ""}</span></td>
                    <td className="num" data-label="Amount">{formatMoney(c.amountMinor, c.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <p><Link href={`/clients/${r.client.id}`}>← Back to client</Link></p>
    </>
  );
}
