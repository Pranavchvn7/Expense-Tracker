import Link from "next/link";
import { ReportFilters } from "@/components/ReportFilters";
import { AreaChart } from "@/components/charts/AreaChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { CategoryTag } from "@/components/CategoryTag";
import { getReport } from "@/lib/report-queries";
import { parseReportQuery, resolveRange } from "@/lib/report-range";
import { paymentLabel } from "@/lib/payment-method";
import { formatMoney, monthLabel } from "@/lib/money";
import { getUserToday } from "@/lib/preferences";
import { IconDownload, IconInbox } from "@/components/icons";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const today = await getUserToday();
  const { input, categoryIds, includeNone } = parseReportQuery(sp);
  const { range, notice } = resolveRange(input, today.iso);
  const r = await getReport(range, categoryIds, includeNone);

  // Only the validated range and ids are used to build the PDF link.
  const pdf = new URLSearchParams({ period: range.kind });
  if (range.kind === "month") pdf.set("month", range.startIso.slice(0, 7));
  if (range.kind === "year") pdf.set("year", range.startIso.slice(0, 4));
  if (range.kind === "custom") {
    pdf.set("from", range.startIso);
    pdf.set("to", range.endIso);
  }
  categoryIds.forEach((c) => pdf.append("cat", c));
  if (includeNone) pdf.append("cat", "none");

  const lastShown = range.endIso > today.iso ? today.iso : range.endIso;
  const days = Math.max(1, Math.round((Date.parse(lastShown) - Date.parse(range.startIso)) / 86_400_000) + 1);
  const net = r.incomeMinor - r.spentMinor;
  const empty = r.expenseCount === 0 && r.incomeMinor === 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reports</h1>
          <p>{range.label}{r.filtered ? " · filtered by category" : ""} · {r.currency}</p>
        </div>
        <div className="actions">
          {/* Plain <a>, not <Link>: prefetching would generate the PDF and use up the rate limit. */}
          <a className="btn soft small" href={`/reports/pdf?${pdf.toString()}`}><IconDownload />Download PDF</a>
        </div>
      </div>

      <ReportFilters
        period={range.kind}
        month={range.startIso.slice(0, 7)}
        year={range.startIso.slice(0, 4)}
        from={range.startIso}
        to={lastShown}
        maxMonth={today.month}
        maxDate={today.iso}
        categories={r.allCategories.map((c) => ({ id: c.id, name: c.name }))}
        selected={categoryIds}
        includeNone={includeNone}
      />
      {notice && <p className="notice" role="note">{notice}</p>}

      {empty ? (
        <div className="card section">
          <div className="empty">
            <IconInbox />
            <strong>Nothing to report for {range.label}</strong>
            <span>Try another period or clear the category filter.</span>
          </div>
        </div>
      ) : (
        <>
          <div className="grid stats section">
            <div className="card stat spend"><span className="label">Spent</span><span className="value">{formatMoney(r.spentMinor, r.currency)}</span><span className="hint">{r.expenseCount} expense{r.expenseCount === 1 ? "" : "s"}</span></div>
            {r.filtered ? (
              <div className="card stat"><span className="label">Income</span><span className="value">–</span><span className="hint">Not shown with a category filter</span></div>
            ) : (
              <div className="card stat income"><span className="label">Income</span><span className="value">{formatMoney(r.incomeMinor, r.currency)}</span><span className="hint">Money received</span></div>
            )}
            {r.filtered ? (
              <div className="card stat"><span className="label">Balance</span><span className="value">–</span><span className="hint">Not shown with a category filter</span></div>
            ) : (
              <div className={`card stat ${net >= 0 ? "pos" : "neg"}`}><span className="label">Balance</span><span className="value">{formatMoney(net, r.currency)}</span><span className="hint">Income minus spending</span></div>
            )}
            <div className="card stat"><span className="label">Average per day</span><span className="value">{formatMoney(Math.round(r.spentMinor / days), r.currency)}</span><span className="hint">Over {days} day{days === 1 ? "" : "s"}</span></div>
          </div>

          {r.months.length > 1 && (
            <div className="card section">
              <div className="row between">
                <h2>By month</h2>
                {!r.filtered && (
                  <div className="key">
                    <span><i className="dot income" />Income</span>
                    <span><i className="dot spend" />Spent</span>
                  </div>
                )}
              </div>
              {!r.filtered && <AreaChart months={r.months} income={r.monthlyIncome} spent={r.monthlySpent} currency={r.currency} />}
              <table className="responsive">
                <thead>
                  <tr><th>Month</th>{!r.filtered && <th className="num">Income</th>}<th className="num">Spent</th>{!r.filtered && <th className="num">Balance</th>}</tr>
                </thead>
                <tbody>
                  {r.months.map((m, i) => (
                    <tr key={m}>
                      <td data-label="Month">{monthLabel(m)}</td>
                      {!r.filtered && <td className="num income" data-label="Income">{formatMoney(r.monthlyIncome[i] ?? 0, r.currency)}</td>}
                      <td className="num" data-label="Spent">{formatMoney(r.monthlySpent[i] ?? 0, r.currency)}</td>
                      {!r.filtered && <td className="num" data-label="Balance">{formatMoney((r.monthlyIncome[i] ?? 0) - (r.monthlySpent[i] ?? 0), r.currency)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {r.categories.length > 0 && (
            <div className="grid two section equal">
              <div className="card">
                <h2>By category</h2>
                <DonutChart items={r.categories} currency={r.currency} />
              </div>
              <div className="card">
                <h2>Category detail</h2>
                <table className="responsive">
                  <thead><tr><th>Category</th><th className="num">Expenses</th><th className="num">Amount</th><th className="num">Share</th></tr></thead>
                  <tbody>
                    {r.categories.map((c) => (
                      <tr key={c.label}>
                        <td data-label="Category"><CategoryTag name={c.label === "Uncategorised" ? null : c.label} color={c.color} /></td>
                        <td className="num" data-label="Expenses">{c.count}</td>
                        <td className="num" data-label="Amount">{formatMoney(c.value, r.currency)}</td>
                        <td className="num" data-label="Share">{r.spentMinor > 0 ? Math.round((c.value / r.spentMinor) * 100) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid two section equal">
            <div className="card">
              <h2>Paid with</h2>
              <table className="responsive">
                <thead><tr><th>Method</th><th className="num">Expenses</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {r.payments.map((p) => (
                    <tr key={p.method ?? "none"}>
                      <td data-label="Method">{paymentLabel(p.method)}</td>
                      <td className="num" data-label="Expenses">{p.count}</td>
                      <td className="num" data-label="Amount">{formatMoney(p.value, r.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card">
              <h2>Largest expenses</h2>
              <table className="responsive">
                <tbody>
                  {r.top.map((t, i) => (
                    <tr key={i}>
                      <td data-label="Expense"><span>{t.description}<div className="muted">{t.date} · {t.category}</div></span></td>
                      <td className="num" data-label="Amount">{formatMoney(t.amountMinor, r.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="muted section">
            Amounts are in your current currency ({r.currency}); older entries in another currency are not included.{" "}
            <Link href="/expenses">Open expenses</Link>
          </p>
        </>
      )}
    </>
  );
}
