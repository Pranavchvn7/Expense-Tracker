import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { revokeSession, revokeOtherSessions } from "@/actions/sessions";
import { getSecurityInfo, listSessions } from "@/lib/account-queries";
import { createCategory, deleteCategory } from "@/actions/categories";
import { setBudget, deleteBudget } from "@/actions/budgets";
import { createShare, revokeShare } from "@/actions/share";
import { deleteAccount } from "@/actions/account";
import { setCurrency } from "@/actions/preferences";
import { getUserCurrency } from "@/lib/preferences";
import { listBudgets, listCategories, listShares } from "@/lib/queries";
import { currentMonth, formatMoney } from "@/lib/money";

export default async function SettingsPage() {
  const [cats, shares, budgets, security, sessions, currency] = await Promise.all([
    listCategories(),
    listShares(),
    listBudgets(),
    getSecurityInfo(),
    listSessions(),
    getUserCurrency(),
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Security, categories, budgets and sharing</p>
        </div>
        <nav className="chips" aria-label="Jump to section">
          <Link className="chip" href="#preferences">Preferences</Link>
          <Link className="chip" href="#security">Security</Link>
          <Link className="chip" href="#categories">Categories</Link>
          <Link className="chip" href="#budgets">Budgets</Link>
          <Link className="chip" href="#sharing">Sharing</Link>
          <Link className="chip" href="#danger">Delete</Link>
        </nav>
      </div>

      <section id="preferences" className="section">
        <h2>Currency</h2>
        <p className="lead muted">
          Used for every new expense, income entry and budget. Existing entries keep the currency
          they were saved with and are not converted; the dashboard only totals your current currency.
        </p>
        <div className="card">
          <ActionForm action={setCurrency} submitLabel="Save currency" className="row">
            <label>Currency
              <select name="currency" defaultValue={currency}>
                <option value="INR">INR – Indian rupee</option>
                <option value="USD">USD – US dollar</option>
                <option value="EUR">EUR – Euro</option>
                <option value="GBP">GBP – British pound</option>
              </select>
            </label>
          </ActionForm>
        </div>
      </section>

      <section id="security" className="section">
        <h2>Password</h2>
        <div className="card"><ChangePasswordForm /></div>

        <div className="section">
          <h2>Two-factor authentication</h2>
          <p className="lead muted">
            Adds a 6-digit code from an authenticator app (Google Authenticator, Microsoft
            Authenticator, Authy, 1Password) so a stolen password alone is not enough.
          </p>
          <TwoFactorSetup enabled={security.twoFactorEnabled} />
        </div>

        <div className="section">
          <h2>Signed-in devices</h2>
          <p className="lead muted">If you do not recognise a device, sign it out and change your password.</p>
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
        </div>
      </section>

      <section id="categories" className="section">
        <h2>Categories</h2>
        <div className="card stack">
          <ActionForm action={createCategory} submitLabel="Add category" className="row" resetOnSuccess>
            <label>Name<input name="name" maxLength={40} required /></label>
          </ActionForm>
          {cats.length === 0 ? (
            <p className="muted">No categories yet. Add one such as Food, Rent or Travel.</p>
          ) : (
            <ul className="devices">
              {cats.map((c) => (
                <li key={c.id}>
                  <ActionForm
                    action={deleteCategory}
                    submitLabel="Remove"
                    danger
                    className="row between"
                    confirmMessage="Remove this category? Its expenses become uncategorised and its budgets are deleted."
                  >
                    <input type="hidden" name="id" value={c.id} />
                    <span className="tag">{c.name}</span>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section id="budgets" className="section">
        <h2>Monthly budgets</h2>
        <p className="lead muted">
          A budget applies to every month. Budgets use your currency. Setting one again for the same category updates it.
        </p>
        <div className="card stack">
          {cats.length === 0 ? (
            <p className="muted">Add a category first.</p>
          ) : (
            <ActionForm action={setBudget} submitLabel="Save budget" className="row" resetOnSuccess>
              <label>Category
                <select name="categoryId" required defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label>Amount
                <input name="amount" inputMode="decimal" pattern="\d{1,9}(\.\d{1,2})?" required />
              </label>
            </ActionForm>
          )}
          {budgets.length > 0 && (
            <ul className="devices">
              {budgets.map((b) => (
                <li key={b.id}>
                  <ActionForm
                    action={deleteBudget}
                    submitLabel="Remove"
                    danger
                    className="row between"
                    confirmMessage="Remove this budget?"
                  >
                    <input type="hidden" name="id" value={b.id} />
                    <span>{b.category.name}: <strong>{formatMoney(b.amountMinor, b.currency)}</strong> / month</span>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section id="sharing" className="section">
        <h2>Share a monthly summary</h2>
        <p className="lead muted">
          Creates a read-only link with category totals only (no descriptions or notes). It expires automatically.
        </p>
        <div className="card stack">
          <ActionForm action={createShare} submitLabel="Create link" className="row">
            <label>Month<input type="month" name="month" defaultValue={currentMonth()} required /></label>
            <label>Valid for (days)<input type="number" name="days" min={1} max={30} defaultValue={7} required /></label>
          </ActionForm>
          {shares.length > 0 && (
            <ul className="devices">
              {shares.map((s) => (
                <li key={s.id}>
                  <ActionForm
                    action={revokeShare}
                    submitLabel="Revoke"
                    danger
                    className="row between"
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
          )}
        </div>
      </section>

      <section id="danger" className="section">
        <h2>Delete account</h2>
        <p className="lead muted">Permanently removes your account and all expenses and income. This cannot be undone.</p>
        <div className="card">
          <ActionForm
            action={deleteAccount}
            submitLabel="Delete my account"
            danger
            className="row"
            confirmMessage="This permanently deletes your account and all data. Continue?"
          >
            <label>Type DELETE to confirm<input name="confirm" autoComplete="off" required /></label>
          </ActionForm>
        </div>
      </section>
    </>
  );
}
