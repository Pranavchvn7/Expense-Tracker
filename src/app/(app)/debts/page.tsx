import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { Pager } from "@/components/Pager";
import { PayoffWhatIf } from "@/components/PayoffWhatIf";
import { addDebtPayment, createDebt, deleteDebt, deleteDebtPayment } from "@/actions/debts";
import { debtOverview, listDebtsPage } from "@/lib/debt-queries";
import { addMonths, orderDebts, paidOffPercent, projectPayoff } from "@/lib/debt-math";
import { formatMoney } from "@/lib/money";
import { getUserPrefs, getUserToday } from "@/lib/preferences";
import { parsePaging } from "@/lib/paging";
import { IconInbox } from "@/components/icons";

const SIZES = [4, 8, 12] as const;
const KIND = { CREDIT_CARD: "Credit card", LOAN: "Loan" } as const;
const pct = (bp: number) => `${(bp / 100).toFixed(2).replace(/\.?0+$/, "")}%`;

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { page, perPage } = parsePaging(sp, { options: SIZES, defaultSize: 4 });
  const openAdd = (Array.isArray(sp.add) ? sp.add[0] : sp.add) === "1";
  const [{ debts, hasNext }, overview, today, prefs] = await Promise.all([
    listDebtsPage(page, perPage),
    debtOverview(),
    getUserToday(),
    getUserPrefs(),
  ]);
  const currency = prefs.currency;

  const mine = overview.filter((d) => d.currency === currency);
  const owed = mine.reduce((a, d) => a + d.balanceMinor, 0);
  const interestPaid = mine.reduce((a, d) => a + d.totalInterestMinor, 0);
  const principalPaid = mine.reduce((a, d) => a + d.totalPrincipalMinor, 0);
  const avalanche = orderDebts(mine, "avalanche");
  const snowball = orderDebts(mine, "snowball");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Debts</h1>
          <p>Track loans and credit cards: see how much of each payment cuts the balance and how much is interest</p>
        </div>
      </div>

      <details className="add" open={openAdd || (debts.length === 0 && page === 1)}>
        <summary>Add a debt</summary>
        <div className="body">
          <ActionForm action={createDebt} submitLabel="Add debt" className="stack" resetOnSuccess focusPrefix="debt-" focusHref="/debts">
            <div className="row">
              <label>Name
                <input name="name" maxLength={80} placeholder="Car loan, HDFC card…" required />
              </label>
              <label>Type
                <select name="kind" defaultValue="LOAN">
                  <option value="LOAN">Loan</option>
                  <option value="CREDIT_CARD">Credit card</option>
                </select>
              </label>
            </div>
            <div className="row">
              <label>Total loan amount
                <input name="original" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" placeholder="0.00" required />
              </label>
              <label>Interest rate % a year
                <input name="apr" inputMode="decimal" pattern="\d{1,2}(\.\d{1,2})?" placeholder="12.5" required />
              </label>
            </div>
            <div className="row">
              <label>Usual monthly payment (EMI / minimum)
                <input name="minPayment" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" placeholder="0.00" required />
              </label>
              <label>Start date
                <input name="startDate" type="date" defaultValue={today.iso} max={today.iso} required />
              </label>
            </div>
            <p className="muted">
              Enter the total amount you owe as of the start date, then add every payment you make. Interest is worked out daily from the rate;
              you can enter the exact interest from your statement on any payment.
            </p>
          </ActionForm>
        </div>
      </details>

      {mine.length > 0 && (
        <div className="grid stats section">
          <div className="card stat spend"><span className="label">Still owed</span><span className="value">{formatMoney(owed, currency)}</span><span className="hint">{mine.length} debt{mine.length === 1 ? "" : "s"} in {currency}</span></div>
          <div className="card stat income"><span className="label">Principal repaid</span><span className="value">{formatMoney(principalPaid, currency)}</span><span className="hint">Reduced what you owe</span></div>
          <div className="card stat"><span className="label">Interest paid</span><span className="value">{formatMoney(interestPaid, currency)}</span><span className="hint">The cost of borrowing</span></div>
          <div className="card stat"><span className="label">Paid in total</span><span className="value">{formatMoney(principalPaid + interestPaid, currency)}</span><span className="hint">All payments</span></div>
        </div>
      )}

      {avalanche.length > 1 && (
        <details className="add">
          <summary>Which debt to pay off first?</summary>
          <div className="body grid two">
            <div>
              <h3>Avalanche: highest interest first</h3>
              <p className="muted">Pay the minimum on all, put every spare rupee on the top one. Usually costs the least interest.</p>
              <ol>{avalanche.map((d) => <li key={d.id}>{d.name} <span className="muted">{pct(d.aprBp)} · {formatMoney(d.balanceMinor, d.currency)}</span></li>)}</ol>
            </div>
            <div>
              <h3>Snowball: smallest balance first</h3>
              <p className="muted">Clear small debts quickly for momentum. Can cost a little more interest.</p>
              <ol>{snowball.map((d) => <li key={d.id}>{d.name} <span className="muted">{formatMoney(d.balanceMinor, d.currency)} · {pct(d.aprBp)}</span></li>)}</ol>
            </div>
          </div>
        </details>
      )}

      {debts.length === 0 ? (
        <div className="card section">
          <div className="empty">
            <IconInbox />
            <strong>No debts tracked</strong>
            <span>Add a loan or credit card to see principal and interest for every payment.</span>
          </div>
        </div>
      ) : (
        <>
          <div className="grid two section goals-grid">
            {debts.map((d) => {
              const l = d.ledger;
              const paid = paidOffPercent(d.originalMinor, l.balanceMinor);
              const total = l.totalPaidMinor;
              const prinShare = total > 0 ? Math.max(0, Math.min(100, (l.totalPrincipalMinor / total) * 100)) : 0;
              const plan = projectPayoff(l.balanceMinor, d.aprBp, d.minPaymentMinor);
              const clear = l.balanceMinor <= 0;
              return (
                <details key={d.id} id={`debt-${d.id}`} className="card goal" open>
                  <summary>
                    <span className="goal-title">{d.name}</span>
                    <span className="goal-meta">
                      <span className="tag">{KIND[d.kind]} · {pct(d.aprBp)}</span>
                      <span className={clear ? "tag done" : "tag"}>{clear ? "Paid off" : `${paid}% repaid`}</span>
                    </span>
                  </summary>
                  <div className="stack goal-body">
                    <div className="budget-figure">
                      <strong>{formatMoney(Math.max(l.balanceMinor, 0), d.currency)}</strong>
                      <span className="muted">still owed of {formatMoney(d.originalMinor, d.currency)}</span>
                    </div>
                    <progress max={Math.max(d.originalMinor, 1)} value={Math.max(0, Math.min(d.originalMinor - l.balanceMinor, d.originalMinor))} aria-label={`${d.name} repaid`} />

                    {total > 0 && (
                      <div>
                        <svg className="split" viewBox="0 0 100 6" preserveAspectRatio="none" role="img" aria-label={`Of ${formatMoney(total, d.currency)} paid, ${Math.round(prinShare)}% reduced the debt and ${Math.round(100 - prinShare)}% was interest`}>
                          <rect className="split-interest" x="0" y="0" width="100" height="6" rx="3" />
                          <rect className="split-principal" x="0" y="0" width={prinShare} height="6" rx="3" />
                        </svg>
                        <div className="key">
                          <span><i className="dot income" />Principal {formatMoney(l.totalPrincipalMinor, d.currency)}</span>
                          <span><i className="dot spend" />Interest {formatMoney(l.totalInterestMinor, d.currency)}</span>
                        </div>
                      </div>
                    )}

                    <dl className="facts">
                      <div><dt>Monthly payment</dt><dd>{formatMoney(d.minPaymentMinor, d.currency)}</dd></div>
                      <div><dt>Paid so far</dt><dd>{formatMoney(total, d.currency)}</dd></div>
                      <div><dt>Payoff at this pace</dt><dd>{clear ? "Done" : plan.months === null ? "Never: payment is below the interest" : `${plan.months} month${plan.months === 1 ? "" : "s"} (${addMonths(today.date, plan.months).toISOString().slice(0, 7)})`}</dd></div>
                      <div><dt>Interest still to come</dt><dd>{clear || plan.months === null ? "–" : formatMoney(plan.totalInterestMinor, d.currency)}</dd></div>
                    </dl>

                    {!clear && (
                      <PayoffWhatIf balanceMinor={l.balanceMinor} aprBp={d.aprBp} minPaymentMinor={d.minPaymentMinor} currency={d.currency} todayIso={today.iso} />
                    )}

                    {!clear && (
                      <ActionForm action={addDebtPayment} submitLabel="Add payment" className="row" resetOnSuccess>
                        <input type="hidden" name="debtId" value={d.id} />
                        <label>Amount
                          <input name="amount" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" placeholder="0.00" required />
                        </label>
                        <label>Date
                          <input name="paidOn" type="date" defaultValue={today.iso} max={today.iso} min={d.startDate.toISOString().slice(0, 10)} required />
                        </label>
                        <label>Interest part (optional)
                          <input name="interest" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" placeholder="from statement" />
                        </label>
                      </ActionForm>
                    )}

                    {l.rows.length > 0 && (
                      <>
                        <p className="muted">{l.rows.length} payment{l.rows.length === 1 ? "" : "s"}, newest first</p>
                        <ul className="contrib scroll">
                          {[...l.rows].reverse().slice(0, 100).map((r) => (
                            <li key={r.id}>
                              <ActionForm action={deleteDebtPayment} submitLabel="Undo" danger className="row between" confirmMessage="Remove this payment?">
                                <input type="hidden" name="id" value={r.id} />
                                <span>
                                  <strong>{formatMoney(r.amountMinor, d.currency)}</strong>{" "}
                                  <span className="muted">{r.paidOn.toISOString().slice(0, 10)} · principal {formatMoney(r.principalMinor, d.currency)} · interest {formatMoney(r.interestMinor, d.currency)} · owed after {formatMoney(Math.max(r.balanceAfterMinor, 0), d.currency)}</span>
                                  {r.note && <span className="muted"> · {r.note}</span>}
                                </span>
                              </ActionForm>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    <div className="cell-actions">
                      <Link className="btn ghost small" href={`/debts/${d.id}/edit`}>Edit</Link>
                      <ActionForm action={deleteDebt} submitLabel="Delete debt" danger confirmMessage="Delete this debt and all its payments?">
                        <input type="hidden" name="id" value={d.id} />
                      </ActionForm>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
          <Pager basePath="/debts" params={{}} page={page} perPage={perPage} hasNext={hasNext} rowCount={debts.length} options={SIZES} />
        </>
      )}
      <p className="muted section">
        Estimates use your rate and payment and assume nothing else changes. Your lender&apos;s statement is the source of truth.
      </p>
    </>
  );
}
