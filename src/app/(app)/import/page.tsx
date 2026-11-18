import { ImportForm } from "@/components/ImportForm";
import { getUserCurrency } from "@/lib/preferences";

export default async function ImportPage() {
  const currency = await getUserCurrency();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Import from CSV</h1>
          <p>Bring in a bank or spreadsheet export. You see a preview before anything is saved.</p>
        </div>
      </div>

      <ImportForm currency={currency} />

      <div className="card section stack">
        <h2>File format</h2>
        <ul>
          <li>The first row must be column names. Needed: <strong>Date</strong>, <strong>Description</strong> (<strong>Source</strong> for income) and <strong>Amount</strong>. Optional: <strong>Category</strong> and <strong>Note</strong>.</li>
          <li>Amounts are positive numbers such as <code>1,234.50</code>. Rows with negative or zero amounts are skipped.</li>
          <li>Everything is saved in your currency ({currency}); no conversion is done.</li>
          <li>Up to 1,000 rows and about 80 KB per file. Rows that already exist (same date, amount and text) are skipped, so importing a file twice is safe.</li>
          <li>Files exported from this app (Expenses &gt; CSV) import as they are.</li>
        </ul>
      </div>
    </>
  );
}
