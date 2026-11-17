import Link from "next/link";
import { env } from "@/env";
import { IconChart, IconShield, IconWallet, LogoMark, IconCheck } from "@/components/icons";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-nav">
            <span className="brand"><LogoMark /> Expense Tracker</span>
            <Link className="btn ghost small" href="/login">Sign in</Link>
          </div>
          <h1>Know where your money goes.</h1>
          <p className="sub">
            Track expenses and income, set budgets and see your balance at a glance. Private by
            design, built for you and your family.
          </p>
          <div className="actions">
            <Link className="btn" href="/login">Sign in</Link>
            {env.SIGNUPS_ENABLED && (
              <Link className="btn ghost" href="/signup">Create account</Link>
            )}
          </div>
        </div>
      </section>

      <section className="features" aria-label="Features">
        <div className="card feature">
          <span className="pill-icon income"><IconWallet /></span>
          <h2>Income and spending</h2>
          <p className="muted">Record both sides, see your monthly balance and savings rate.</p>
        </div>
        <div className="card feature">
          <span className="pill-icon net"><IconChart /></span>
          <h2>Clear charts</h2>
          <p className="muted">Category breakdown and a six-month trend, no clutter.</p>
        </div>
        <div className="card feature">
          <span className="pill-icon spend"><IconShield /></span>
          <h2>Budgets and sharing</h2>
          <p className="muted">Monthly budgets per category, plus expiring read-only summary links.</p>
        </div>
      </section>

      <section className="trust">
        <h2>Security you can check</h2>
        <ul>
          {[
            "Each person only ever sees their own data",
            "Optional authenticator-app two-factor sign-in",
            "Passwords are hashed; sessions can be revoked per device",
            "Strict browser security headers and rate limiting",
            "Export or delete all your data any time",
            "No ads, no trackers, no third-party scripts",
          ].map((t) => (
            <li key={t}><IconCheck />{t}</li>
          ))}
        </ul>
      </section>
      <p className="foot">Expense Tracker</p>
    </>
  );
}
