"use client";

import { useEffect, useState } from "react";

// Generic error boundary: shows nothing about the cause, only Next's opaque digest.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [offline, setOffline] = useState(false);
  useEffect(() => setOffline(!navigator.onLine), []);
  return (
    <main className="auth">
      <div className="card">
        <div className="empty">
          {offline ? (
            <>
              <strong>You are offline</strong>
              <span>This page was not saved on this device yet. Open it once while online, then it will work offline.</span>
              <a className="btn" href="/dashboard">Go to the dashboard</a>
            </>
          ) : (
            <>
              <strong>Something went wrong</strong>
              <span>Please try again. If it keeps happening, quote this reference: {error.digest ?? "n/a"}</span>
              <button className="btn" onClick={() => reset()}>Try again</button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
