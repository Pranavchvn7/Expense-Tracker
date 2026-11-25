import Link from "next/link";
import { IconDownload } from "@/components/icons";
import type { ClientReport } from "@/lib/freelance-queries";
import { formatDay, jobBucket, STATUS_LABEL } from "@/lib/job-math";
import { formatMoney } from "@/lib/money";
import { COST_LABEL, KIND_LABEL } from "@/lib/pay-math";

export function ClientReportView({ r, todayIso }: { r: ClientReport; todayIso: string }) {
  const cur = r.currency;
  const t = r.totals;
  return (
    <div data-testid="client-report">
      <div className="view-head">
        <h2>{r.client.name}</h2>
        <div className="actions">
          <Link className="btn soft small" href={`/clients/${r.client.id}`} data-testid="client-report-open">Client</Link>
          {/* Plain <a>, not <Link>: prefetching would generate the PDF and use up the rate limit. */}
          <a className="btn small" href={`/reports/client/${r.client.id}/pdf`} data-testid="client-report-pdf"><IconDownload />PDF</a>
        </div>
      </div>

      <div className="grid stats" data-testid="client-report-summary">
        <div className="card stat"><span className="label">Jobs</span><span className="value" data-testid="cr-jobs">{r.rows.length}</span></div>
        <div className="card stat income"><span className="label">Received</span><span className="value" data-testid="cr-received">{formatMoney(t.receivedMinor, cur)}</span><span className="hint">of {formatMoney(t.agreedMinor, cur)}</span></div>
        <div className="card stat spend"><span className="label">Balance due</span><span className="value" data-testid="cr-balance">{formatMoney(t.balanceMinor, cur)}</span></div>
        <div className={`card stat ${t.profitMinor >= 0 ? "pos" : "neg"}`}><span className="label">Profit</span><span className="value" data-testid="cr-profit">{formatMoney(t.profitMinor, cur)}</span><span className="hint">after {formatMoney(t.costsMinor, cur)} costs</span></div>
      </div>

      <div className="card section" data-testid="client-report-jobs">
        <div className="card-head"><h2>Jobs</h2></div>
        {r.rows.length === 0 ? (
          <p className="muted">No jobs yet.</p>
        ) : (
          <table className="responsive">
            <thead><tr><th>Date</th><th>Job</th><th>Status</th><th className="num">Agreed</th><th className="num">Received</th><th className="num">Costs</th><th className="num">Profit</th></tr></thead>
            <tbody>
              {r.rows.map((j) => {
                const bucket = jobBucket(j.status, j.eventDate.toISOString().slice(0, 10), todayIso);
                return (
                  <tr key={j.id} data-testid="client-report-job-row">
                    <td data-label="Date">{formatDay(j.eventDate)}</td>
                    <td data-label="Job"><Link className="nm" href={`/reports?job=${j.id}`}>{j.title}</Link></td>
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
          <div className="card-head"><h2>Payments</h2></div>
          {r.payments.length === 0 ? <p className="muted">None yet.</p> : (
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
          <div className="card-head"><h2>Costs</h2></div>
          {r.costRows.length === 0 ? <p className="muted">None recorded.</p> : (
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
    </div>
  );
}
