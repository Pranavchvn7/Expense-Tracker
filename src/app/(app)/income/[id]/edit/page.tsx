import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { updateIncome } from "@/actions/income";
import { getIncome } from "@/lib/finance-queries";
import { uuid } from "@/lib/validation";

export default async function EditIncomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // A missing row and another user's row both give the same 404.
  if (!uuid.safeParse(id).success) notFound();
  const income = await getIncome(id);
  if (!income) notFound();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="page-head"><h1>Edit income</h1></div>
      <ActionForm action={updateIncome} testId="update-income" submitLabel="Save changes" className="card stack" successHref="/income">
        <input type="hidden" name="id" value={income.id} />
        <div className="row">
          <label>Amount
            <input
              name="amount"
              inputMode="decimal"
              pattern="\d{1,9}(\.\d{1,2})?"
              defaultValue={(income.amountMinor / 100).toFixed(2)}
              required
            />
          </label>
          <label>Date received
            <input name="receivedOn" type="date" defaultValue={income.receivedOn.toISOString().slice(0, 10)} max={today} required />
          </label>
        </div>
        <label>Source
          <input name="source" maxLength={80} defaultValue={income.source} required />
        </label>
        <label>Note (optional)
          <textarea name="note" maxLength={500} rows={2} defaultValue={income.note ?? ""} />
        </label>
      </ActionForm>
      <p><Link href="/income">Cancel</Link></p>
    </>
  );
}
