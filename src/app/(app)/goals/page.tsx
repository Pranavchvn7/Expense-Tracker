import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { addContribution, createGoal, deleteContribution, deleteGoal } from "@/actions/goals";
import { listGoals } from "@/lib/goal-queries";
import { monthlyNeeded, percent } from "@/lib/goal-math";
import { formatMoney } from "@/lib/money";
import { utcToday } from "@/lib/recurrence";
import { IconTarget } from "@/components/icons";

export default async function GoalsPage() {
  const goals = await listGoals({ recent: true });
  const today = utcToday();
  const todayIso = today.toISOString().slice(0, 10);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Savings goals</h1>
          <p>Set a target, add money towards it and watch it fill up</p>
        </div>
      </div>

      <details className="add" open={goals.length === 0}>
        <summary>New goal</summary>
        <div className="body">
          <ActionForm action={createGoal} submitLabel="Create goal" className="stack" resetOnSuccess>
            <label>Name
              <input name="name" maxLength={80} placeholder="Emergency fund, Trip, Laptop…" required />
            </label>
            <div className="row">
              <label>Target amount
                <input name="target" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" placeholder="0.00" required />
              </label>
              <label>Target date (optional)
                <input name="targetDate" type="date" min={todayIso} />
              </label>
            </div>
          </ActionForm>
        </div>
      </details>

      {goals.length === 0 ? (
        <div className="card">
          <div className="empty">
            <IconTarget />
            <strong>No goals yet</strong>
            <span>Create one above, then add money towards it whenever you set some aside.</span>
          </div>
        </div>
      ) : (
        <div className="grid two">
          {goals.map((g) => {
            const pct = percent(g.savedMinor, g.targetMinor);
            const remaining = Math.max(g.targetMinor - g.savedMinor, 0);
            const perMonth = monthlyNeeded(remaining, g.targetDate, today);
            const overdue = g.targetDate && g.targetDate < today && remaining > 0;
            return (
              <div key={g.id} className="card stack">
                <div className="row between">
                  <h2>{g.name}</h2>
                  <span className={pct >= 100 ? "tag done" : "tag"}>{pct >= 100 ? "Reached" : `${pct}%`}</span>
                </div>
                <progress max={g.targetMinor} value={Math.min(g.savedMinor, g.targetMinor)} aria-label={`${g.name} progress`} />
                <div className="row between">
                  <strong>{formatMoney(g.savedMinor, g.currency)}</strong>
                  <span className="muted">of {formatMoney(g.targetMinor, g.currency)}</span>
                </div>
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
                    <input name="contributedOn" type="date" defaultValue={todayIso} max={todayIso} required />
                  </label>
                </ActionForm>

                {g.recent.length > 0 && (
                  <ul className="devices">
                    {g.recent.map((c) => (
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
            );
          })}
        </div>
      )}
    </>
  );
}
