"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type ActionResponse = { ok: boolean; message?: string; ref?: string; data?: unknown };

/** After a create, wait for the new card to render, scroll to it and flash it briefly. */
function focusWhenRendered(id: string) {
  let tries = 0;
  const timer = window.setInterval(() => {
    const el = document.getElementById(id);
    tries += 1;
    if (el) {
      window.clearInterval(timer);
      if (el instanceof HTMLDetailsElement) el.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("flash");
      window.setTimeout(() => el.classList.remove("flash"), 2200);
    } else if (tries > 30) {
      window.clearInterval(timer);
    }
  }, 100);
}

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
  focusPrefix,
  focusHref,
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
  /** If the action returns { id }, scroll to the element with id `${focusPrefix}${id}` once it renders. */
  focusPrefix?: string;
  /** Page to show first (e.g. page 1 of the list) so the new item is on screen. */
  focusHref?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  // The refresh after an action runs as a transition: the page you are looking at stays in place
  // and only the parts whose data changed are swapped in (no blank screen, no scroll jump).
  const [refreshing, startRefresh] = useTransition();
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
        const newId = (r.data as { id?: unknown } | undefined)?.id;
        if (focusPrefix && typeof newId === "string") {
          if (focusHref) router.replace(focusHref, { scroll: false });
          focusWhenRendered(`${focusPrefix}${newId}`);
        }
        startRefresh(() => router.refresh());
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
      <button type="submit" disabled={pending || refreshing} className={danger ? "btn danger" : "btn"}>
        {pending || refreshing ? "Working…" : submitLabel}
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
