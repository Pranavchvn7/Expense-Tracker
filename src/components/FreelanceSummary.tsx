import Link from "next/link";
import type { FreelanceSummary as Summary } from "@/lib/freelance-queries";
import { formatMoney } from "@/lib/money";

/** Freelance numbers for a period: used on the Dashboard and on Reports. */
export function FreelanceSummary({
  s,
  periodLabel,
  outstanding,
  testId,
}: {
  s: Summary;
  periodLabel: string;
  outstanding?: { count: number; totalMinor: number } | null;
  testId: string;
}) {
  const cur = s.currency;
  const topTotal = s.topClients.reduce((n, c) => n + c.value, 0);
  return (
    <div className="section stack" data-testid={testId}>
      <div className="card-head">
        <h2>Freelance work · {periodLabel}</h2>
        <Link className="btn soft small" href="/jobs" data-testid="fl-jobs-link">Jobs</Link>
      </div>
      <div className="grid stats">
        <div className="card stat income">
          <span className="label">Received from clients</span>
          <span className="value" data-testid="fl-received">{formatMoney(s.receivedMinor, cur)}</span>
          <span className="hint">{s.paymentCount} payment{s.paymentCount === 1 ? "" : "s"}</span>
        </div>
        <div className="card stat spend">
          <span className="label">Job costs</span>
          <span className="value" data-testid="fl-costs">{formatMoney(s.costsMinor, cur)}</span>
          <span className="hint">{s.costCount} cost{s.costCount === 1 ? "" : "s"}</span>
        </div>
        <div className={`card stat ${s.profitMinor >= 0 ? "pos" : "neg"}`}>
          <span className="label">Profit</span>
          <span className="value" data-testid="fl-profit">{formatMoney(s.profitMinor, cur)}</span>
          <span className="hint">Received minus costs</span>
        </div>
        <div className="card stat">
          <span className="label">Jobs</span>
          <span className="value" data-testid="fl-jobs">{s.jobsCompleted} done</span>
          <span className="hint">{s.jobsPending} booked or pending · {s.clientsHandled} client{s.clientsHandled === 1 ? "" : "s"}</span>
        </div>
        {outstanding && (
          <div className="card stat">
            <span className="label">Still owed to you</span>
            <span className="value" data-testid="fl-outstanding">{formatMoney(outstanding.totalMinor, cur)}</span>
            <span className="hint">
              {outstanding.count > 0 ? <Link href="/jobs/due" data-testid="fl-due-link">{outstanding.count} job{outstanding.count === 1 ? "" : "s"} with a balance</Link> : "Nothing outstanding"}
            </span>
          </div>
        )}
      </div>
      {(s.topClients.length > 0 || s.services.length > 0) && (
        <div className="grid two equal">
          {s.topClients.length > 0 && (
            <div className="card panel record-card" data-testid={`${testId}-top-clients`}>
              <div className="card-head"><h2>Top clients</h2><span className="muted sub">{formatMoney(topTotal, cur)} received</span></div>
              <ul className="client-list">
                {s.topClients.map((c) => {
                  const share = topTotal > 0 ? Math.round((c.value / topTotal) * 100) : 0;
                  return (
                    <li key={c.id} className="client-row" data-testid="top-client-row">
                      <span className="avatar-tile" aria-hidden="true">{c.label.trim().charAt(0).toUpperCase() || "?"}</span>
                      <span className="client-main">
                        <span className="nm-plain">{c.label}</span>
                        <progress className="share" max={100} value={share} aria-label={`${share}% of income from this client`} />
                      </span>
                      <span className="client-figs"><strong>{formatMoney(c.value, cur)}</strong><span className="sub">{share}% of income</span></span>
                      <a className="btn soft small" href={`/reports?client=${c.id}`}>Report</a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {s.services.length > 0 && (
            <div className="card panel" data-testid={`${testId}-services`}>
              <div className="card-head"><h2>Services</h2></div>
              <table className="responsive">
                <tbody>
                  {s.services.map((c) => (
                    <tr key={c.label}><td>{c.label}</td><td className="num">{c.count} job{c.count === 1 ? "" : "s"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
