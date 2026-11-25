"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { commitImport, previewImport, type ImportPreview } from "@/actions/import";

const MAX_CHARS = 80_000;

type Kind = "EXPENSE" | "INCOME";
type Fmt = "YMD" | "DMY" | "MDY";

/**
 * Two steps: preview (nothing saved), then import. The file is read in the browser and sent as
 * text; the server re-validates everything on both steps and never trusts the preview.
 */
export function ImportForm({ currency }: { currency: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("EXPENSE");
  const [fmt, setFmt] = useState<Fmt>("YMD");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  const reset = () => {
    setPreview(null);
    setError(null);
    setDone(null);
  };

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    reset();
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_CHARS) {
      setCsv("");
      setFileName("");
      setError("That file is too large. Split it into files under about 80 KB (roughly 1,000 rows).");
      return;
    }
    setCsv(await file.text());
    setFileName(file.name);
  }

  const payload = () => {
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("dateFormat", fmt);
    fd.set("csv", csv);
    return fd;
  };

  async function run(step: "preview" | "commit") {
    setBusy(true);
    setError(null);
    try {
      if (step === "preview") {
        const r = await previewImport(payload());
        if (r.ok) setPreview(r.data);
        else setError(r.message);
      } else {
        const r = await commitImport(payload());
        if (r.ok) {
          setDone(r.data.imported);
          setPreview(null);
          setCsv("");
          setFileName("");
          router.refresh();
        } else setError(r.message);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const money = (minor: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(minor / 100);

  return (
    <div className="stack">
      <div className="card stack">
        <div className="row">
          <label>What are you importing?
            <select data-testid="import-kind" value={kind} onChange={(e) => { setKind(e.target.value as Kind); reset(); }}>
              <option value="EXPENSE">Expenses</option>
              <option value="INCOME">Income</option>
            </select>
          </label>
          <label>Date format in the file
            <select data-testid="import-format" value={fmt} onChange={(e) => { setFmt(e.target.value as Fmt); reset(); }}>
              <option value="YMD">2026-03-31 (year-month-day)</option>
              <option value="DMY">31/03/2026 (day/month/year)</option>
              <option value="MDY">03/31/2026 (month/day/year)</option>
            </select>
          </label>
        </div>
        <label>CSV file
          <input type="file" accept=".csv,text/csv" onChange={onFile} data-testid="import-file" />
        </label>
        <div className="actions">
          <button type="button" className="btn" disabled={busy || !csv} onClick={() => run("preview")} data-testid="import-preview">
            {busy && !preview ? "Checking…" : "Preview"}
          </button>
          {fileName && <span className="muted">{fileName}</span>}
        </div>
        {error && <p role="alert" className="error" data-testid="import-error">{error}</p>}
        {done !== null && (
          <p className="notice" role="status" data-testid="import-notice">
            Imported {done} {done === 1 ? "entry" : "entries"}.
          </p>
        )}
      </div>

      {preview && (
        <div className="card stack">
          <h2>Preview (nothing saved yet)</h2>
          <p>
            <strong>{preview.importable}</strong> of {preview.totalRows} rows will be imported
            {preview.duplicates > 0 && <>, <strong>{preview.duplicates}</strong> already exist and will be skipped</>}
            {preview.errorCount > 0 && <>, <strong>{preview.errorCount}</strong> have problems and will be skipped</>}.
          </p>
          {preview.unmatchedCategories.length > 0 && (
            <p className="muted">
              These categories do not exist in your account, so those rows import as uncategorised:{" "}
              {preview.unmatchedCategories.join(", ")}. Create them in Settings first if you want them matched.
            </p>
          )}
          {preview.sample.length > 0 && (
            <table>
              <thead>
                <tr><th>Date</th><th>{kind === "INCOME" ? "Source" : "Description"}</th>{kind === "EXPENSE" && <th>Category</th>}<th className="num">Amount</th></tr>
              </thead>
              <tbody>
                {preview.sample.map((r, i) => (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>{r.text}</td>
                    {kind === "EXPENSE" && <td>{r.category || "—"}</td>}
                    <td className="num">{money(r.minor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {preview.errors.length > 0 && (
            <ul>
              {preview.errors.map((e) => (
                <li key={e.line} className="muted">Line {e.line}: {e.message}</li>
              ))}
            </ul>
          )}
          <div className="actions">
            <button
              type="button"
              className="btn"
              disabled={busy || preview.importable === 0}
              onClick={() => run("commit")}
              data-testid="import-confirm"
            >
              {busy ? "Importing…" : `Import ${preview.importable} ${preview.importable === 1 ? "entry" : "entries"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
