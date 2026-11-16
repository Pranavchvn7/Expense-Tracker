import { ActionForm } from "@/components/ActionForm";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { revokeSession, revokeOtherSessions } from "@/actions/sessions";
import { getSecurityInfo, listSessions } from "@/lib/account-queries";
import { createCategory, deleteCategory } from "@/actions/categories";
import { setBudget, deleteBudget } from "@/actions/budgets";
import { createShare, revokeShare } from "@/actions/share";
import { deleteAccount } from "@/actions/account";
import { listBudgets, listCategories, listShares } from "@/lib/queries";
import { currentMonth, formatMoney } from "@/lib/money";

export default async function SettingsPage() {
  const [cats, shares, budgets, security, sessions] = await Promise.all([
    listCategories(),
    listShares(),
    listBudgets(),
    getSecurityInfo(),
    listSessions(),
  ]);

  return (
    <>
      <h1>Settings</h1>

      <h2>Change password</h2>
      <ChangePasswordForm />

      <h2>Two-factor authentication</h2>
      <p className="muted">
        Adds a 6-digit code from an authenticator app (Google Authenticator, Microsoft
        Authenticator, Authy, 1Password) to sign-in, so a stolen password alone is not enough.
      </p>
      <TwoFactorSetup enabled={security.twoFactorEnabled} />

      <h2>Signed-in devices</h2>
      <p className="muted">
        If you do not recognise a device, sign it out and change your password.
      </p>
      <ul className="devices">
        {sessions.map((s) => (
          <li key={s.ref}>
            {s.current ? (
              <strong>This device</strong>
            ) : (
              <ActionForm
                action={revokeSession}
                submitLabel="Sign out"
                danger
                className="row"
                confirmMessage="Sign out this device?"
              >
                <input type="hidden" name="ref" value={s.ref} />
                <strong>Another device</strong>
              </ActionForm>
            )}
            <div className="muted">{s.device}</div>
            <div className="muted">
              IP {s.ipAddress} · signed in {s.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
            </div>
          </li>
        ))}
      </ul>
      {sessions.length > 1 && (
        <ActionForm
          action={revokeOtherSessions}
          submitLabel="Sign out all other devices"
          danger
          confirmMessage="Sign out every device except this one?"
        />
      )}

      <h2>Categories</h2>
      <ActionForm action={createCategory} submitLabel="Add" className="card row" resetOnSuccess>
        <label>Name<input name="name" maxLength={40} required /></label>
      </ActionForm>
      <ul>
        {cats.map((c) => (
          <li key={c.id}>
            <ActionForm
              action={deleteCategory}
              submitLabel="Remove"
              danger
              className="row"
              confirmMessage="Remove this category? Its expenses become uncategorised and its budgets are deleted."
            >
              <input type="hidden" name="id" value={c.id} />
              <span>{c.name}</span>
            </ActionForm>
          </li>
        ))}
      </ul>

      <h2>Monthly budgets</h2>
      <p className="muted">
        A budget applies to every month. Setting one again for the same category and currency
        updates it.
      </p>
      {cats.length === 0 ? (
        <p className="muted">Add a category first.</p>
      ) : (
        <ActionForm action={setBudget} submitLabel="Save budget" className="card row" resetOnSuccess>
          <label>Category
            <select name="categoryId" required defaultValue="">
              <option value="" disabled>Choose…</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Amount
            <input name="amount" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" required />
          </label>
          <label>Currency
            <select name="currency" defaultValue="INR">
              <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
            </select>
          </label>
        </ActionForm>
      )}
      <ul>
        {budgets.map((b) => (
          <li key={b.id}>
            <ActionForm
              action={deleteBudget}
              submitLabel="Remove"
              danger
              className="row"
              confirmMessage="Remove this budget?"
            >
              <input type="hidden" name="id" value={b.id} />
              <span>{b.category.name}: {formatMoney(b.amountMinor, b.currency)} / month</span>
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
            <ActionForm
              action={revokeShare}
              submitLabel="Revoke"
              danger
              className="row"
              confirmMessage="Revoke this link? Anyone using it will lose access."
            >
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
      <ActionForm
        action={deleteAccount}
        submitLabel="Delete my account"
        danger
        className="card row"
        confirmMessage="This permanently deletes your account and all data. Continue?"
      >
        <label>Type DELETE to confirm<input name="confirm" autoComplete="off" required /></label>
      </ActionForm>
    </>
  );
}
