import Link from "next/link";
import { IconDownload } from "@/components/icons";
import type { JobReport } from "@/lib/freelance-queries";
import { formatDay, STATUS_LABEL, timeRangeLabel } from "@/lib/job-math";
import { formatMoney } from "@/lib/money";
import { COST_LABEL, KIND_LABEL } from "@/lib/pay-math";

export function JobReportView({ r }: { r: JobReport }) {
  const j = r.job;
  const cur = j.currency;
  const when = timeRangeLabel(j.startTime, j.endTime);
  const sub = [formatDay(j.eventDate) + (when ? ` · ${when}` : ""), STATUS_LABEL[j.status], j.serviceType, j.location].filter(Boolean).join(" · ");
  return (
    <div data-testid="job-report">
      <div className="view-head">
        <div>
          <h2>{j.title}</h2>
          <p className="muted">{j.client.name} · {sub}</p>
        </div>
        <div className="actions">
          <Link className="btn soft small" href={`/jobs/${j.id}`} data-testid="job-report-open">Job</Link>
          <a className="btn small" href={`/reports/job/${j.id}/pdf`} data-testid="job-report-pdf"><IconDownload />PDF</a>
        </div>
      </div>

      <div className="grid stats" data-testid="job-report-summary">
        <div className="card stat"><span className="label">Agreed</span><span className="value" data-testid="jr-agreed">{j.agreedAmountMinor > 0 ? formatMoney(j.agreedAmountMinor, cur) : "—"}</span><span className="hint">{r.pay.label}</span></div>
        <div className="card stat income"><span className="label">Received</span><span className="value" data-testid="jr-received">{formatMoney(r.receivedMinor, cur)}</span></div>
        <div className="card stat spend"><span className="label">{r.pay.state === "over" ? "Over by" : "Balance due"}</span><span className="value" data-testid="jr-balance">{formatMoney(r.pay.state === "over" ? r.pay.overMinor : r.pay.balanceMinor, cur)}</span></div>
        <div className={`card stat ${r.profitMinor >= 0 ? "pos" : "neg"}`}><span className="label">Profit</span><span className="value" data-testid="jr-profit">{formatMoney(r.profitMinor, cur)}</span><span className="hint">after {formatMoney(r.costsMinor, cur)} costs</span></div>
      </div>

      <div className="grid two section equal">
        <div className="card panel" data-testid="job-report-payments">
          <div className="card-head"><h2>Payments</h2></div>
          {r.payments.length === 0 ? <p className="muted">None yet.</p> : (
            <table className="responsive">
              <thead><tr><th>Date</th><th>Type</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {r.payments.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Date">{p.receivedOn.toISOString().slice(0, 10)}</td>
                    <td data-label="Type">{p.paymentKind ? KIND_LABEL[p.paymentKind] : "Payment"}{p.note && <span className="muted note">{p.note}</span>}</td>
                    <td className="num income" data-label="Amount">+{formatMoney(p.amountMinor, p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card panel" data-testid="job-report-costs">
          <div className="card-head"><h2>Costs</h2></div>
          {r.costs.length === 0 ? <p className="muted">None recorded.</p> : (
            <table className="responsive">
              <thead><tr><th>Date</th><th>Cost</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {r.costs.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Date">{c.spentOn.toISOString().slice(0, 10)}</td>
                    <td data-label="Cost">{c.description}<span className="muted note">{c.costKind ? COST_LABEL[c.costKind] : "Cost"}{c.payee ? ` · ${c.payee}` : ""}</span></td>
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
