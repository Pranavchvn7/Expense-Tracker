import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { updateGoal } from "@/actions/goals";
import { getGoal } from "@/lib/goal-queries";
import { uuid } from "@/lib/validation";

export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const goal = await getGoal(id);
  if (!goal) notFound();

  return (
    <>
      <div className="page-head"><h1>Edit goal</h1></div>
      <ActionForm action={updateGoal} testId="update-goal" submitLabel="Save changes" className="card stack" successHref="/goals">
        <input type="hidden" name="id" value={goal.id} />
        <label>Name
          <input name="name" maxLength={80} defaultValue={goal.name} required />
        </label>
        <div className="row">
          <label>Target amount
            <input
              name="target"
              inputMode="decimal"
              pattern="\d{1,9}(\.\d{1,2})?"
              defaultValue={(goal.targetMinor / 100).toFixed(2)}
              required
            />
          </label>
          <label>Target date (optional)
            <input name="targetDate" type="date" defaultValue={goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : ""} />
          </label>
        </div>
      </ActionForm>
      <p><Link href="/goals">Cancel</Link></p>
    </>
  );
}
