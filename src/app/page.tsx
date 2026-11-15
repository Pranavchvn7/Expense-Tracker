import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Expense Tracker</h1>
      <p className="muted">Private, secure expense tracking for you and your family.</p>
      <div className="row">
        <Link className="btn" href="/login">Sign in</Link>
        <Link className="btn ghost" href="/signup">Create account</Link>
      </div>
    </main>
  );
}
