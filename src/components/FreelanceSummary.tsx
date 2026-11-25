import Link from "next/link";
import type { FreelanceSummary as Summary } from "@/lib/freelance-queries";
import { formatMoney } from "@/lib/money";
import { Slider } from "@/components/Slider";

/**
 * Freelance numbers for a period: used on the Dashboard and on Reports.
 * Each tile shows its headline first; the detail line fades in after a short pause (CSS only).
 */
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
  const costShare = s.receivedMinor > 0 ? Math.round((s.costsMinor * 100) / s.receivedMinor) : 0;
  // Hide the "still owed" tile when nothing is owed: it only uses space on the dashboard.
  const showOwed = !!outstanding && outstanding.totalMinor > 0;
  return (
    <div className="section stack" data-testid={testId}>
      <div className="card-head">
        <h2>Freelance work · {periodLabel}</h2>
      </div>
      <div className="grid stats">
        <div className="card stat income fx fx-received">
          <span className="label">Received from clients</span>
          <span className="value" data-testid="fl-received">{formatMoney(s.receivedMinor, cur)}</span>
          <span className="fx-extra">
            <span className="hint">{costShare}% went on job costs · {s.paymentCount} payment{s.paymentCount === 1 ? "" : "s"}</span>
          </span>
        </div>
        <div className="card stat spend fx fx-costs">
          <span className="label">Job costs</span>
          <span className="value" data-testid="fl-costs">{formatMoney(s.costsMinor, cur)}</span>
          <span className="fx-extra">
            <span className="hint">{s.costCount} cost{s.costCount === 1 ? "" : "s"} on your jobs</span>
          </span>
        </div>
        <div className={`card stat fx fx-profit ${s.profitMinor >= 0 ? "pos" : "neg"}`}>
          <span className="label">Profit</span>
          <span className="value" data-testid="fl-profit">{formatMoney(s.profitMinor, cur)}</span>
          <span className="fx-extra">
            <span className="hint">Received minus costs</span>
          </span>
        </div>
        <div className="card stat fx fx-jobs">
          <span className="label">Jobs</span>
          <span className="value" data-testid="fl-jobs">{s.jobsCompleted} done</span>
          <span className="fx-extra">
            <span className="hint">{s.jobsPending} booked or pending · {s.clientsHandled} client{s.clientsHandled === 1 ? "" : "s"}</span>
          </span>
        </div>
        {showOwed && outstanding && (
          <div className="card stat fx fx-owed">
            <span className="label">Still owed to you</span>
            <span className="value" data-testid="fl-outstanding">{formatMoney(outstanding.totalMinor, cur)}</span>
            <span className="fx-extra">
              <span className="hint">
                <Link href="/jobs/due" data-testid="fl-due-link">{outstanding.count} job{outstanding.count === 1 ? "" : "s"} with a balance</Link>
              </span>
            </span>
          </div>
        )}
      </div>
      {(s.topClients.length > 0 || s.services.length > 0) && (
        <div className="grid two equal">
          {s.topClients.length > 0 && (
            <div className="card panel record-card" data-testid={`${testId}-top-clients`}>
              <div className="card-head"><h2>Top clients</h2><span className="muted sub">{formatMoney(topTotal, cur)} received</span></div>
              <Slider label="top client">
                {s.topClients.slice(0, 2).map((c) => {
                  const share = topTotal > 0 ? Math.round((c.value / topTotal) * 100) : 0;
                  return (
                    <div key={c.id} className="slide" data-testid="top-client-row">
                      <div className="client-row">
                        <span className="avatar-tile" aria-hidden="true">{c.label.trim().charAt(0).toUpperCase() || "?"}</span>
                        <span className="client-main">
                          <span className="nm-plain">{c.label}</span>
                          <progress className="share" max={100} value={share} aria-label={`${share}% of income from this client`} />
                        </span>
                        <span className="client-figs"><strong>{formatMoney(c.value, cur)}</strong><span className="sub">{share}% of income</span></span>
                        <Link className="btn soft small" href={`/reports?client=${c.id}`}>Report</Link>
                      </div>
                    </div>
                  );
                })}
              </Slider>
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
