import Link from "next/link";

export const metadata = { title: "Offline" };

/** Shown when a page was never opened on this device and there is no connection. */
export default function OfflinePage() {
  return (
    <main className="auth">
      <div className="card stack">
        <h1>You are offline</h1>
        <p className="muted">
          This page was not saved on this device. Pages you have opened before, and anything you add while offline, will
          still work and sync when the connection is back.
        </p>
        <Link className="btn" href="/dashboard">Try the dashboard</Link>
      </div>
    </main>
  );
}
