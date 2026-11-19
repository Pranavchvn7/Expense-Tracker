import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { Pager } from "@/components/Pager";
import { addContribution, createGoal, deleteContribution, deleteGoal } from "@/actions/goals";
import { averageMonthlySpend, listGoalsPage } from "@/lib/goal-queries";
import { emergencyFund, STATIC_TEMPLATES } from "@/lib/goal-templates";
import { CarRuleCard, HomeDepositCard } from "@/components/GoalCalculators";
import { monthlyNeeded, percent } from "@/lib/goal-math";
import { formatMoney } from "@/lib/money";
import { getUserPrefs, getUserToday } from "@/lib/preferences";
import { parsePaging } from "@/lib/paging";
import { IconTarget } from "@/components/icons";

const GOAL_PAGE_SIZES = [4, 8, 12] as const;

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { page, perPage } = parsePaging(sp, { options: GOAL_PAGE_SIZES, defaultSize: 4 });
  const today = await getUserToday();
  const [{ goals, hasNext }, avgSpend] = await Promise.all([listGoalsPage(page, perPage), averageMonthlySpend(today.month)]);
  const currency = (await getUserPrefs()).currency;

  const ef = avgSpend !== null ? emergencyFund(avgSpend) : null;
  const major = (n: number) => (n / 100).toFixed(2);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Savings goals</h1>
          <p>Set a target, add money towards it and watch it fill up</p>
        </div>
      </div>

      <details className="add" open={goals.length === 0 && page === 1}>
        <summary>New goal</summary>
        <div className="body">
          <ActionForm focusPrefix="goal-" focusHref="/goals" action={createGoal} submitLabel="Create goal" className="stack" resetOnSuccess>
            <label>Name
              <input name="name" maxLength={80} placeholder="Emergency fund, Trip, Laptop…" required />
            </label>
            <div className="row">
              <label>Target amount
                <input name="target" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" placeholder="0.00" required />
              </label>
              <label>Target date (optional)
                <input name="targetDate" type="date" min={today.iso} />
              </label>
            </div>
          </ActionForm>
        </div>
      </details>

      <details id="suggestions" className="add suggestions">
        <summary>Goal suggestions</summary>
        <div className="body stack">
          <p className="muted">Rules of thumb to get you started, not financial advice. Check the amount, then create the goal.</p>

          <div className="grid two">
            <div className="card suggestion">
              <h3>Emergency fund</h3>
              <p className="muted">Three to six months of spending in an account you can reach quickly.</p>
              {ef ? (
                <>
                  <p>Based on your average spending of <strong>{formatMoney(avgSpend ?? 0, currency)}</strong> a month over the last three full months:</p>
                  <div className="row">
                    <ActionForm focusPrefix="goal-" focusHref="/goals" action={createGoal} submitLabel={`Create ${formatMoney(ef.threeMonths, currency)} goal`} className="row" resetOnSuccess>
                      <input type="hidden" name="name" value="Emergency fund (3 months)" />
                      <input type="hidden" name="target" value={major(ef.threeMonths)} />
                    </ActionForm>
                    <ActionForm focusPrefix="goal-" focusHref="/goals" action={createGoal} submitLabel={`Create ${formatMoney(ef.sixMonths, currency)} goal`} className="row" resetOnSuccess>
                      <input type="hidden" name="name" value="Emergency fund (6 months)" />
                      <input type="hidden" name="target" value={major(ef.sixMonths)} />
                    </ActionForm>
                  </div>
                </>
              ) : (
                <p className="muted">Add a few months of expenses and the amount is worked out for you. Or create one by hand with the form above.</p>
              )}
            </div>

            <CarRuleCard currency={currency} />
            <HomeDepositCard currency={currency} />

            {STATIC_TEMPLATES.map((t) => (
              <div key={t.id} className="card suggestion">
                <h3>{t.name}</h3>
                <p className="muted">{t.blurb}</p>
                <ActionForm focusPrefix="goal-" focusHref="/goals" action={createGoal} submitLabel="Create goal" className="row" resetOnSuccess>
                  <input type="hidden" name="name" value={t.name} />
                  <label>Target amount
                    <input name="target" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" placeholder="0.00" required />
                  </label>
                </ActionForm>
              </div>
            ))}
          </div>
        </div>
      </details>

      {goals.length === 0 ? (
        <div className="card section">
          <div className="empty">
            <IconTarget />
            <strong>No goals yet</strong>
            <span>Create one above, then add money towards it whenever you set some aside.</span>
          </div>
        </div>
      ) : (
        <>
          <div className="grid two goals-grid">
            {goals.map((g) => {
              const pct = percent(g.savedMinor, g.targetMinor);
              const remaining = Math.max(g.targetMinor - g.savedMinor, 0);
              const perMonth = monthlyNeeded(remaining, g.targetDate, today.date);
              const overdue = g.targetDate && g.targetDate < today.date && remaining > 0;
              return (
                <details key={g.id} id={`goal-${g.id}`} className="card goal" open>
                  <summary>
                    <span className="goal-title">{g.name}</span>
                    <span className="goal-meta">
                      <span className="muted">{formatMoney(g.savedMinor, g.currency)} / {formatMoney(g.targetMinor, g.currency)}</span>
                      <span className={pct >= 100 ? "tag done" : "tag"}>{pct >= 100 ? "Reached" : `${pct}%`}</span>
                    </span>
                  </summary>
                  <div className="stack goal-body">
                    <progress max={g.targetMinor} value={Math.min(g.savedMinor, g.targetMinor)} aria-label={`${g.name} progress`} />
                    {g.targetDate && (
                      <p className="muted">
                        By {g.targetDate.toISOString().slice(0, 10)}
                        {perMonth !== null && <> · about {formatMoney(perMonth, g.currency)} a month</>}
                        {overdue && <> · target date has passed</>}
                      </p>
                    )}

                    <ActionForm action={addContribution} submitLabel="Add money" className="row" resetOnSuccess>
                      <input type="hidden" name="goalId" value={g.id} />
                      <label>Amount
                        <input name="amount" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" placeholder="0.00" required />
                      </label>
                      <label>Date
                        <input name="contributedOn" type="date" defaultValue={today.iso} max={today.iso} required />
                      </label>
                    </ActionForm>

                    {g.contributions.length > 0 && (
                      <>
                        <p className="muted">{g.contributions.length >= 100 ? "Latest 100 contributions" : `${g.contributions.length} contribution${g.contributions.length === 1 ? "" : "s"}`}</p>
                        {/* Scrolls inside the card once the list is long. */}
                        <ul className="contrib scroll">
                          {g.contributions.map((c) => (
                            <li key={c.id}>
                              <ActionForm
                                action={deleteContribution}
                                submitLabel="Undo"
                                danger
                                className="row between"
                                confirmMessage="Remove this contribution?"
                              >
                                <input type="hidden" name="id" value={c.id} />
                                <span>
                                  <strong>+{formatMoney(c.amountMinor, g.currency)}</strong>{" "}
                                  <span className="muted">{c.contributedOn.toISOString().slice(0, 10)}</span>
                                </span>
                              </ActionForm>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    <div className="cell-actions">
                      <Link className="btn ghost small" href={`/goals/${g.id}/edit`}>Edit</Link>
                      <ActionForm
                        action={deleteGoal}
                        submitLabel="Delete goal"
                        danger
                        confirmMessage="Delete this goal and its contributions?"
                      >
                        <input type="hidden" name="id" value={g.id} />
                      </ActionForm>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
          <Pager
            basePath="/goals"
            params={{}}
            page={page}
            perPage={perPage}
            hasNext={hasNext}
            rowCount={goals.length}
            options={GOAL_PAGE_SIZES}
          />
        </>
      )}
    </>
  );
}
