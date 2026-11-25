import Link from "next/link";
import { FreelanceOff } from "@/components/FreelanceOff";
import { IconInbox } from "@/components/icons";
import { formatDay } from "@/lib/job-math";
import { paymentsDue } from "@/lib/job-queries";
import { formatMoney } from "@/lib/money";
import { getUserPrefs, getUserToday } from "@/lib/preferences";

export default async function PaymentsDuePage() {
  const prefs = await getUserPrefs();
  if (prefs.workMode === "SALARIED") return <FreelanceOff title="Payments due" />;
  const [rows, today] = await Promise.all([paymentsDue(100), getUserToday()]);
  const total = rows.reduce((n, r) => n + r.balanceMinor, 0);
  const currency = rows[0]?.currency ?? prefs.currency;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Payments due</h1>
          <p>Completed jobs that are not paid in full, oldest first.</p>
        </div>
        <div className="actions">
          <Link className="btn soft small" href="/jobs" data-testid="due-back">All jobs</Link>
        </div>
      </div>

      <div className="card section" data-testid="due-list">
        {rows.length === 0 ? (
          <div className="empty">
            <IconInbox />
            <strong>Nothing is owed to you</strong>
            <span>Completed jobs with an agreed price that are not fully paid will appear here.</span>
          </div>
        ) : (
          <>
            <dl className="money-summary">
              <div><dt>Jobs with a balance</dt><dd data-testid="due-count">{rows.length}</dd></div>
              <div><dt>Total owed</dt><dd data-testid="due-total">{formatMoney(total, currency)}</dd></div>
            </dl>
            <table className="responsive">
              <thead>
                <tr><th>Event date</th><th>Job</th><th>Client</th><th className="num">Paid</th><th className="num">Balance</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const iso = r.eventDate.toISOString().slice(0, 10);
                  const days = Math.max(0, Math.round((Date.parse(`${today.iso}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) / 86_400_000));
                  return (
                    <tr key={r.id} data-testid="due-row">
                      <td data-label="Event date">
                        {formatDay(r.eventDate)}
                        <span className="muted note">{days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} ago`}</span>
                      </td>
                      <td data-label="Job"><Link className="nm" href={`/jobs/${r.id}`}>{r.title}</Link></td>
                      <td data-label="Client"><Link href={`/clients/${r.client.id}`}>{r.client.name}</Link></td>
                      <td className="num" data-label="Paid">{formatMoney(r.paidMinor, r.currency)}</td>
                      <td className="num" data-label="Balance"><strong>{formatMoney(r.balanceMinor, r.currency)}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}
