import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { updateExpense } from "@/actions/expenses";
import { getExpense, listCategories } from "@/lib/queries";
import { uuid } from "@/lib/validation";
import { PAYMENT_METHODS } from "@/lib/payment-method";
import { getUserToday } from "@/lib/preferences";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Validate shape first. A missing row and another user's row both give the same 404.
  if (!uuid.safeParse(id).success) notFound();
  const [expense, cats] = await Promise.all([getExpense(id), listCategories()]);
  if (!expense) notFound();

  const today = (await getUserToday()).iso;

  return (
    <>
      <div className="page-head"><h1>Edit expense</h1></div>
      <ActionForm
        action={updateExpense}
        submitLabel="Save changes"
        className="card stack"
        successHref="/expenses"
      >
        <input type="hidden" name="id" value={expense.id} />
        <div className="row">
          <label>Amount
            <input
              name="amount"
              inputMode="decimal"
              pattern="\d{1,9}(\.\d{1,2})?"
              defaultValue={(expense.amountMinor / 100).toFixed(2)}
              required
            />
          </label>
          <label>Date
            <input
              name="spentOn"
              type="date"
              defaultValue={expense.spentOn.toISOString().slice(0, 10)}
              max={today}
              required
            />
          </label>
        </div>
        <label>Description
          <input name="description" maxLength={120} defaultValue={expense.description} required />
        </label>
        <label>Category
          <select name="categoryId" defaultValue={expense.categoryId ?? ""}>
            <option value="">Uncategorised</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Paid with
          <select name="paymentMethod" defaultValue={expense.paymentMethod ?? ""}>
            <option value="">Not set</option>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label>Note (optional)
          <textarea name="note" maxLength={500} rows={2} defaultValue={expense.note ?? ""} />
        </label>
      </ActionForm>
      <p><Link href="/expenses">Cancel</Link></p>
    </>
  );
}
