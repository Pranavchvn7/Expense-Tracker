import Link from "next/link";
import { ReportFilters } from "@/components/ReportFilters";
import { AreaChart } from "@/components/charts/AreaChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { CardHead } from "@/components/cards/CardHead";
import { CategoryDetailCard, PaymentMethodsCard, TopExpensesCard } from "@/components/cards/ListCards";
import { CategoryTag } from "@/components/CategoryTag";
import { Pager } from "@/components/Pager";
import { getReport, listReportExpenses } from "@/lib/report-queries";
import { parseReportQuery, resolveRange } from "@/lib/report-range";
import { paymentLabel } from "@/lib/payment-method";
import { formatMoney, monthLabel } from "@/lib/money";
import { getUserPrefs, getUserToday } from "@/lib/preferences";
import { freelanceSummary, reportPicker } from "@/lib/freelance-queries";
import { formatDay } from "@/lib/job-math";
import { FreelanceSummary } from "@/components/FreelanceSummary";
import { parsePaging } from "@/lib/paging";
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
  const { page, perPage } = parsePaging(sp);
  const prefs = await getUserPrefs();
  const [r, tx, fl, picker] = await Promise.all([
    getReport(range, categoryIds, includeNone),
    listReportExpenses(range, categoryIds, includeNone, page, perPage),
    prefs.workMode === "SALARIED" ? Promise.resolve(null) : freelanceSummary(range),
    prefs.workMode === "SALARIED" ? Promise.resolve(null) : reportPicker(),
  ]);

  // Only the validated range and ids are used to build links (PDF, pager).
  const base: Record<string, string | string[]> = { period: range.kind };
  if (range.kind === "month") base.month = range.startIso.slice(0, 7);
  if (range.kind === "year") base.year = range.startIso.slice(0, 4);
  if (range.kind === "custom") {
    base.from = range.startIso;
    base.to = range.endIso;
  }
  const cats = [...categoryIds, ...(includeNone ? ["none"] : [])];
  if (cats.length) base.cat = cats;
  const pdf = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) (Array.isArray(v) ? v : [v]).forEach((x) => pdf.append(k, x));

  const lastShown = range.endIso > today.iso ? today.iso : range.endIso;
  const days = Math.max(1, Math.round((Date.parse(lastShown) - Date.parse(range.startIso)) / 86_400_000) + 1);
  const net = r.incomeMinor - r.spentMinor;
  const flHasData = Boolean(fl && (fl.jobsCompleted + fl.jobsPending + fl.jobsCancelled > 0 || fl.receivedMinor > 0 || fl.costsMinor > 0));
  const empty = r.expenseCount === 0 && r.incomeMinor === 0 && !flHasData;

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
        key={`${range.kind}|${range.startIso}|${range.endIso}|${cats.join(",")}`}
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

      {picker && (
        <details className="module" id="client-job-reports" data-testid="report-picker" open>
          <summary><h2>Client and job reports</h2></summary>
          <div className="module-body">
            <div className="grid two equal">
              <div>
                <h3>Client report</h3>
                {picker.clients.length === 0 ? (
                  <p className="muted">No clients yet. <Link href="/clients?add=1">Add a client</Link></p>
                ) : (
                  <ul className="agenda" data-testid="report-picker-clients">
                    {picker.clients.map((c) => (
                      <li key={c.id} data-testid="report-picker-client">
                        <Link className="nm" href={`/reports/client/${c.id}`}>{c.name}</Link>
                        <span className="muted note">{c.archived ? "Archived" : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3>Job report (latest jobs)</h3>
                {picker.jobs.length === 0 ? (
                  <p className="muted">No jobs yet. <Link href="/jobs?add=1">Add a job</Link></p>
                ) : (
                  <ul className="agenda" data-testid="report-picker-jobs">
                    {picker.jobs.map((j) => (
                      <li key={j.id} data-testid="report-picker-job">
                        <Link className="nm" href={`/reports/job/${j.id}`}>{j.title}</Link>
                        <span className="muted note">{j.client.name} · {formatDay(j.eventDate)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="muted">Older jobs: open the job and choose “Job report”.</p>
              </div>
            </div>
          </div>
        </details>
      )}

      {/* Everything below refreshes when the filters change; the filter form above stays put. */}
      <div id="report-body" className="region">
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

            {fl && flHasData && (
              <>
                <FreelanceSummary s={fl} periodLabel={range.label} testId="report-freelance" />
                {r.filtered && <p className="muted">Freelance figures ignore the category filter.</p>}
              </>
            )}

            {r.months.length > 1 && (
              <div className="card section">
                <CardHead title="By month">
                  {!r.filtered && (
                    <div className="key">
                      <span><i className="dot income" />Income</span>
                      <span><i className="dot spend" />Spent</span>
                    </div>
                  )}
                </CardHead>
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
                <div className="card panel">
                  <CardHead title="By category" />
                  <div className="card-body"><DonutChart items={r.categories} currency={r.currency} /></div>
                </div>
                <CategoryDetailCard categories={r.categories} spentMinor={r.spentMinor} currency={r.currency} />
              </div>
            )}

            <div className="grid two section equal">
              <TopExpensesCard rows={r.top.map((t) => ({ description: t.description, sub: `${t.date} · ${t.category}`, amountMinor: t.amountMinor }))} currency={r.currency} />
              <PaymentMethodsCard rows={r.payments.map((p) => ({ label: paymentLabel(p.method), count: p.count, value: p.value }))} currency={r.currency} />
            </div>

            <div className="card section" id="transactions">
              <CardHead title="All expenses in this report" />
              {tx.rows.length === 0 ? (
                <p className="muted">No expenses match these filters.</p>
              ) : (
                <table className="responsive">
                  <thead>
                    <tr><th>Date</th><th>Description</th><th>Category</th><th>Paid with</th><th className="num">Amount</th></tr>
                  </thead>
                  <tbody>
                    {tx.rows.map((e) => (
                      <tr key={e.id}>
                        <td data-label="Date">{e.spentOn.toISOString().slice(0, 10)}</td>
                        <td data-label="Description">
                          <span className="name-block">
                            <span className="name-cell"><span className="nm">{e.description}</span></span>
                            {e.note && <span className="muted note">{e.note}</span>}
                          </span>
                        </td>
                        <td data-label="Category"><CategoryTag name={e.category?.name} color={e.category?.color} /></td>
                        <td data-label="Paid with">{e.paymentMethod ? paymentLabel(e.paymentMethod) : <span className="muted">—</span>}</td>
                        <td className="num" data-label="Amount">{formatMoney(e.amountMinor, e.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <Pager basePath="/reports" params={base} page={page} perPage={perPage} hasNext={tx.hasNext} rowCount={tx.rows.length} anchor="transactions" />
            </div>

            <p className="muted section">
              Amounts are in your current currency ({r.currency}); older entries in another currency are not included.{" "}
              <Link href="/expenses">Open expenses</Link>
            </p>
          </>
        )}
      </div>
    </>
  );
}
