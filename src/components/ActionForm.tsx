"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type ActionResponse = { ok: boolean; message?: string; ref?: string };

/**
 * Runs a server action and shows only the safe generic message (plus correlation ref).
 * Uses onSubmit (not React's form reset) so a failed submit keeps what the user typed.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  className,
  danger,
  successHref,
  resetOnSuccess,
  confirmMessage,
}: {
  action: (fd: FormData) => Promise<ActionResponse>;
  children?: ReactNode;
  submitLabel: string;
  className?: string;
  danger?: boolean;
  /** Internal path to navigate to after success. */
  successHref?: string;
  resetOnSuccess?: boolean;
  /** Ask the browser to confirm first (use for destructive actions). */
  confirmMessage?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; ref?: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    const form = e.currentTarget;
    setPending(true);
    setError(null);
    try {
      const r = await action(new FormData(form));
      if (r.ok) {
        if (resetOnSuccess) form.reset();
        if (successHref) router.push(successHref);
        router.refresh();
      } else {
        setError({ message: r.message ?? "Something went wrong", ref: r.ref });
      }
    } catch {
      setError({ message: "Something went wrong" });
    } finally {
      setPending(false);
    }
  }

  return (
    // method="post": never fall back to a GET submit if scripts fail to load.
    <form method="post" onSubmit={onSubmit} className={className}>
      {children}
      <button type="submit" disabled={pending} className={danger ? "btn danger" : "btn"}>
        {pending ? "Working…" : submitLabel}
      </button>
      {error && (
        <p role="alert" className="error">
          {error.message}
          {error.ref ? ` (ref ${error.ref.slice(0, 8)})` : ""}
        </p>
      )}
    </form>
  );
}
