import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { revokeSession, revokeOtherSessions } from "@/actions/sessions";
import { getSecurityInfo, listSessions } from "@/lib/account-queries";
import { createCategory, deleteCategory } from "@/actions/categories";
import { createShare, revokeShare } from "@/actions/share";
import { deleteAccount } from "@/actions/account";
import { setCurrency } from "@/actions/preferences";
import { getUserPrefs } from "@/lib/preferences";
import { setWorkMode, updateProfile } from "@/actions/profile";
import { countryOptions } from "@/lib/countries";
import { listTimeZones } from "@/lib/tz";
import { TimezoneField } from "@/components/TimezoneField";
import { NotificationSettings } from "@/components/NotificationSettings";
import { env } from "@/env";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { SettingsControls } from "@/components/SettingsControls";
import { CategoryTag } from "@/components/CategoryTag";
import { listCategories, listShares } from "@/lib/queries";

export default async function SettingsPage() {
  const [cats, shares, security, sessions, prefs] = await Promise.all([
    listCategories(),
    listShares(),
    getSecurityInfo(),
    listSessions(),
    getUserPrefs(),
  ]);
  const { currency } = prefs;
  const { userId } = await requireSession();
  const notify = await prisma.user.findFirst({ where: { id: userId }, select: { notifyBudget: true, notifyRenewals: true, notifyJobs: true } });
  const countries = countryOptions();
  const zones = listTimeZones();
  const thisMonth = new Date().toISOString().slice(0, 7);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Profile, security, categories and sharing</p>
        </div>
        <SettingsControls />
        <nav className="chips" aria-label="Jump to section">
          <Link className="chip" href="#profile">Profile</Link>
          <Link className="chip" href="#preferences">Currency</Link>
          <Link className="chip" href="#security">Security</Link>
          <Link className="chip" href="#categories">Categories</Link>
          <Link className="chip" href="#work-type">Work type</Link>
          <Link className="chip" href="#sharing">Sharing</Link>
          <Link className="chip" href="#danger">Delete</Link>
        </nav>
      </div>

      <details id="profile" className="module" open>
        <summary><h2>Profile</h2></summary>
        <div className="module-body">
          <p className="lead muted">
            Only non-sensitive details. Your country and timezone decide what &ldquo;today&rdquo; means for new
            entries and when recurring items are added. Email and password are not editable here.
          </p>
          <div className="card">
            <ActionForm action={updateProfile} testId="update-profile" submitLabel="Save profile" className="stack">
              <label>Display name
                <input name="name" maxLength={60} defaultValue={prefs.name} required autoComplete="name" />
              </label>
              <div className="row">
                <label>Country
                  <select name="country" defaultValue={prefs.country ?? ""}>
                    <option value="">Not set</option>
                    {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </label>
                <TimezoneField zones={zones} defaultValue={prefs.timezoneSet ? prefs.timezone : ""} />
              </div>
            </ActionForm>
          </div>
        </div>
      </details>

      <details id="work-type" className="module" open>
        <summary><h2>Work type</h2></summary>
        <div className="module-body">
          <p className="lead muted">
            Choose how you earn. Freelance and Both add Clients (and soon Jobs, a calendar and client reports) to the menu.
            Nothing is hidden or deleted when you switch, and everything for salaried work stays available.
          </p>
          <div className="card">
            <ActionForm action={setWorkMode} testId="set-work-mode" submitLabel="Save work type" className="row">
              <label>I work as
                <select name="mode" defaultValue={prefs.workMode}>
                  <option value="SALARIED">Salaried (fixed pay)</option>
                  <option value="FREELANCE">Freelance (clients and jobs)</option>
                  <option value="BOTH">Both salaried and freelance</option>
                </select>
              </label>
            </ActionForm>
          </div>
        </div>
      </details>

      <details id="preferences" className="module" open>
        <summary><h2>Currency</h2></summary>
        <div className="module-body">
        <p className="lead muted">
          Used for every new expense, income entry and budget. Existing entries keep the currency
          they were saved with and are not converted; the dashboard only totals your current currency.
        </p>
        <div className="card">
          <ActionForm action={setCurrency} testId="set-currency" submitLabel="Save currency" className="row">
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
      </div>
      </details>

      <details id="security" className="module" open>
        <summary><h2>Password</h2></summary>
        <div className="module-body">
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
                    action={revokeSession} testId="revoke-session"
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
              action={revokeOtherSessions} testId="revoke-other-sessions"
              submitLabel="Sign out all other devices"
              danger
              confirmMessage="Sign out every device except this one?"
            />
          )}
        </div>
      </div>
      </details>

      <details id="categories" className="module" open>
        <summary><h2>Categories</h2></summary>
        <div className="module-body">
        <div className="card stack">
          <ActionForm action={createCategory} testId="create-category" submitLabel="Add category" className="row" resetOnSuccess>
            <label>Name<input name="name" maxLength={40} required /></label>
          </ActionForm>
          {cats.length === 0 ? (
            <p className="muted">No categories yet. Add one such as Food, Rent or Travel.</p>
          ) : (
            <ul className="devices">
              {cats.map((c) => (
                <li key={c.id}>
                  <ActionForm
                    action={deleteCategory} testId="delete-category"
                    submitLabel="Remove"
                    danger
                    className="row between"
                    confirmMessage="Remove this category? Its expenses become uncategorised and its budgets are deleted."
                  >
                    <input type="hidden" name="id" value={c.id} />
                    <CategoryTag name={c.name} color={c.color} />
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </details>

      <details id="notifications" className="module">
        <summary><h2>Notifications &amp; offline</h2></summary>
        <div className="module-body">
          <NotificationSettings
            publicKey={env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT ? (env.VAPID_PUBLIC_KEY ?? null) : null}
            notifyBudget={notify?.notifyBudget ?? true}
            notifyRenewals={notify?.notifyRenewals ?? true}
            notifyJobs={notify?.notifyJobs ?? true}
            showJobs={prefs.workMode !== "SALARIED"}
          />
        </div>
      </details>

      <details id="sharing" className="module" open>
        <summary><h2>Share a monthly summary</h2></summary>
        <div className="module-body">
        <p className="lead muted">
          Creates a read-only link with category totals only (no descriptions or notes). It expires automatically.
        </p>
        <div className="card stack">
          <ActionForm action={createShare} testId="create-share" submitLabel="Create link" className="row">
            <label>Month<input type="month" name="month" defaultValue={thisMonth} required /></label>
            <label>Valid for (days)<input type="number" name="days" min={1} max={30} defaultValue={7} required /></label>
          </ActionForm>
          {shares.length > 0 && (
            <ul className="devices">
              {shares.map((s) => (
                <li key={s.id}>
                  <ActionForm
                    action={revokeShare} testId="revoke-share"
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
      </div>
      </details>

      <details id="danger" className="module">
        <summary><h2>Delete account</h2></summary>
        <div className="module-body">
        <p className="lead muted">Permanently removes your account and all expenses and income. This cannot be undone.</p>
        <div className="card">
          <ActionForm
            action={deleteAccount} testId="delete-account"
            submitLabel="Delete my account"
            danger
            className="row"
            confirmMessage="This permanently deletes your account and all data. Continue?"
          >
            <label>Type DELETE to confirm<input name="confirm" autoComplete="off" required /></label>
          </ActionForm>
        </div>
      </div>
      </details>
    </>
  );
}
