import { ActionForm } from "@/components/ActionForm";
import { createCategory, deleteCategory } from "@/actions/categories";
import { createShare, revokeShare } from "@/actions/share";
import { deleteAccount } from "@/actions/account";
import { listCategories, listShares } from "@/lib/queries";
import { currentMonth } from "@/lib/money";

export default async function SettingsPage() {
  const [cats, shares] = await Promise.all([listCategories(), listShares()]);

  return (
    <>
      <h1>Settings</h1>

      <h2>Categories</h2>
      <ActionForm action={createCategory} submitLabel="Add" className="card row">
        <label>Name<input name="name" maxLength={40} required /></label>
      </ActionForm>
      <ul>
        {cats.map((c) => (
          <li key={c.id}>
            <ActionForm action={deleteCategory} submitLabel="Remove" danger className="row">
              <input type="hidden" name="id" value={c.id} />
              <span>{c.name}</span>
            </ActionForm>
          </li>
        ))}
      </ul>

      <h2>Share a monthly summary</h2>
      <p className="muted">
        Creates a read-only link with category totals only (no descriptions or notes). It expires automatically.
      </p>
      <ActionForm action={createShare} submitLabel="Create link" className="card row">
        <label>Month<input type="month" name="month" defaultValue={currentMonth()} required /></label>
        <label>Valid for (days)<input type="number" name="days" min={1} max={30} defaultValue={7} required /></label>
      </ActionForm>
      <ul>
        {shares.map((s) => (
          <li key={s.id}>
            <ActionForm action={revokeShare} submitLabel="Revoke" danger className="row">
              <input type="hidden" name="id" value={s.id} />
              <span>
                <a href={`/share/${s.id}`}>{s.month}</a>{" "}
                <span className="muted">expires {s.expiresAt.toISOString().slice(0, 10)}</span>
              </span>
            </ActionForm>
          </li>
        ))}
      </ul>

      <h2>Delete account</h2>
      <p className="muted">Permanently removes your account and all expenses. This cannot be undone.</p>
      <ActionForm action={deleteAccount} submitLabel="Delete my account" danger className="card row">
        <label>Type DELETE to confirm<input name="confirm" autoComplete="off" required /></label>
      </ActionForm>
    </>
  );
}
