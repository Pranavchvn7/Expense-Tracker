import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { updateDebt } from "@/actions/debts";
import { getDebt } from "@/lib/debt-queries";
import { getUserToday } from "@/lib/preferences";
import { uuid } from "@/lib/validation";

export default async function EditDebtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const [debt, today] = await Promise.all([getDebt(id), getUserToday()]);
  if (!debt) notFound();

  return (
    <>
      <div className="page-head"><h1>Edit debt</h1></div>
      <ActionForm action={updateDebt} submitLabel="Save changes" className="card stack" successHref="/debts">
        <input type="hidden" name="id" value={debt.id} />
        <div className="row">
          <label>Name<input name="name" maxLength={80} defaultValue={debt.name} required /></label>
          <label>Type
            <select name="kind" defaultValue={debt.kind}>
              <option value="LOAN">Loan</option>
              <option value="CREDIT_CARD">Credit card</option>
            </select>
          </label>
        </div>
        <div className="row">
          <label>Amount owed on the start date
            <input name="original" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" defaultValue={(debt.originalMinor / 100).toFixed(2)} required />
          </label>
          <label>Interest rate % a year
            <input name="apr" inputMode="decimal" pattern="\d{1,2}(\.\d{1,2})?" defaultValue={(debt.aprBp / 100).toFixed(2)} required />
          </label>
        </div>
        <div className="row">
          <label>Usual monthly payment
            <input name="minPayment" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" defaultValue={(debt.minPaymentMinor / 100).toFixed(2)} required />
          </label>
          <label>Start date
            <input name="startDate" type="date" defaultValue={debt.startDate.toISOString().slice(0, 10)} max={today.iso} required />
          </label>
        </div>
        <p className="muted">Changing the amount, rate or start date recalculates principal and interest for every payment.</p>
      </ActionForm>
      <p><Link href="/debts">Cancel</Link></p>
    </>
  );
}
