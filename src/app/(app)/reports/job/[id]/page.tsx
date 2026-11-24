import Link from "next/link";
import { notFound } from "next/navigation";
import { IconDownload } from "@/components/icons";
import { jobReport } from "@/lib/freelance-queries";
import { formatDay, STATUS_LABEL, timeRangeLabel } from "@/lib/job-math";
import { formatMoney } from "@/lib/money";
import { COST_LABEL, KIND_LABEL } from "@/lib/pay-math";
import { getUserPrefs } from "@/lib/preferences";
import { uuid } from "@/lib/validation";

export default async function JobReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  if ((await getUserPrefs()).workMode === "SALARIED") notFound();
  const r = await jobReport(id);
  if (!r) notFound();
  const j = r.job;
  const cur = j.currency;
  const when = timeRangeLabel(j.startTime, j.endTime);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Job report</h1>
          <p><Link href={`/jobs/${j.id}`}>{j.title}</Link> · <Link href={`/clients/${j.client.id}`}>{j.client.name}</Link> · {cur}</p>
        </div>
        <div className="actions">
          <a className="btn soft small" href={`/reports/job/${j.id}/pdf`} data-testid="job-report-pdf"><IconDownload />Download PDF</a>
        </div>
      </div>

      <div className="card section">
        <dl className="kv">
          <div><dt>Event</dt><dd>{formatDay(j.eventDate)}{when ? ` · ${when}` : ""}</dd></div>
          <div><dt>Status</dt><dd>{STATUS_LABEL[j.status]}</dd></div>
          <div><dt>Service</dt><dd>{j.serviceType ?? <span className="muted">—</span>}</dd></div>
          <div><dt>Location</dt><dd>{j.location ?? <span className="muted">—</span>}</dd></div>
        </dl>
      </div>

      <div className="grid stats section" data-testid="job-report-summary">
        <div className="card stat"><span className="label">Agreed</span><span className="value" data-testid="jr-agreed">{j.agreedAmountMinor > 0 ? formatMoney(j.agreedAmountMinor, cur) : "—"}</span><span className="hint">{r.pay.label}</span></div>
        <div className="card stat income"><span className="label">Received</span><span className="value" data-testid="jr-received">{formatMoney(r.receivedMinor, cur)}</span><span className="hint">{r.payments.length} payment{r.payments.length === 1 ? "" : "s"}</span></div>
        <div className="card stat spend"><span className="label">{r.pay.state === "over" ? "Over by" : "Balance due"}</span><span className="value" data-testid="jr-balance">{formatMoney(r.pay.state === "over" ? r.pay.overMinor : r.pay.balanceMinor, cur)}</span><span className="hint">Agreed minus received</span></div>
        <div className={`card stat ${r.profitMinor >= 0 ? "pos" : "neg"}`}><span className="label">Profit</span><span className="value" data-testid="jr-profit">{formatMoney(r.profitMinor, cur)}</span><span className="hint">After {formatMoney(r.costsMinor, cur)} costs</span></div>
      </div>

      <div className="grid two section equal">
        <div className="card panel" data-testid="job-report-payments">
          <div className="card-head"><h2>Payments received</h2></div>
          {r.payments.length === 0 ? <p className="muted">No payments yet.</p> : (
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
          <div className="card-head"><h2>Job costs</h2></div>
          {r.costs.length === 0 ? <p className="muted">No costs recorded.</p> : (
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
      <p><Link href={`/jobs/${j.id}`}>← Back to job</Link></p>
    </>
  );
}
