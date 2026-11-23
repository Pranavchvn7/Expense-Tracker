import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { updateRule } from "@/actions/recurring";
import { getRule } from "@/lib/recurring-queries";
import { listCategories } from "@/lib/queries";
import { uuid } from "@/lib/validation";

export default async function EditRulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const [rule, cats] = await Promise.all([getRule(id), listCategories()]);
  if (!rule) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Edit recurring item</h1>
          <p>Changes apply to future entries only. Type, repeat and first date cannot be changed.</p>
        </div>
      </div>
      <ActionForm action={updateRule} testId="update-rule" submitLabel="Save changes" className="card stack" successHref="/recurring">
        <input type="hidden" name="id" value={rule.id} />
        <div className="row">
          <label>Amount
            <input
              name="amount"
              inputMode="decimal"
              pattern="\d{1,9}(\.\d{1,2})?"
              defaultValue={(rule.amountMinor / 100).toFixed(2)}
              required
            />
          </label>
          <label>Ends on (optional)
            <input name="endDate" type="date" defaultValue={rule.endDate ? rule.endDate.toISOString().slice(0, 10) : ""} />
          </label>
        </div>
        <label>Name
          <input name="label" maxLength={80} defaultValue={rule.label} required />
        </label>
        {rule.kind === "EXPENSE" && (
          <label>Category
            <select name="categoryId" defaultValue={rule.categoryId ?? ""}>
              <option value="">Uncategorised</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        <label>Note (optional)
          <textarea name="note" maxLength={500} rows={2} defaultValue={rule.note ?? ""} />
        </label>
      </ActionForm>
      <p><Link href="/recurring">Cancel</Link></p>
    </>
  );
}
