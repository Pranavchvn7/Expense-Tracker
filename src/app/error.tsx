"use client";

// Generic error boundary: shows nothing about the cause, only Next's opaque digest.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="auth">
      <div className="card">
        <div className="empty">
          <strong>Something went wrong</strong>
          <span>Please try again. If it keeps happening, quote this reference: {error.digest ?? "n/a"}</span>
          <button className="btn" onClick={() => reset()}>Try again</button>
        </div>
      </div>
    </main>
  );
}
