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
        <div className="row between">
          <h2>File format</h2>
          <a className="btn soft small" href="/sample-import.csv" download>Download sample CSV</a>
        </div>
        <ol className="steps">
          <li>
            <strong>Add column names in the first row.</strong> You need <strong>Date</strong>, <strong>Description</strong>
            {" "}(<strong>Source</strong> for income) and <strong>Amount</strong>. <strong>Category</strong> and <strong>Note</strong> are optional.
          </li>
          <li>
            <strong>Use positive amounts</strong> such as <code>1,234.50</code>. Rows with negative or zero amounts are skipped.
          </li>
          <li>
            <strong>Check the currency.</strong> Everything is saved in your currency ({currency}); no conversion is done.
          </li>
          <li>
            <strong>Keep files small.</strong> Up to 1,000 rows and about 80 KB per file.
          </li>
          <li>
            <strong>Import twice safely.</strong> Rows that already exist (same date, amount and text) are skipped.
          </li>
        </ol>
        <p className="muted">Files exported from this app (Expenses &gt; CSV) import as they are.</p>
      </div>
    </>
  );
}
