"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { enqueue, type OutboxKind } from "@/lib/outbox";

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
  offlineKind,
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
  /** Adds that may be saved on this device and sent later when there is no connection. */
  offlineKind?: OutboxKind;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  // The refresh after an action runs as a transition: the page you are looking at stays in place
  // and only the parts whose data changed are swapped in (no blank screen, no scroll jump).
  const [refreshing, startRefresh] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; ref?: string } | null>(null);

  async function saveForLater(form: HTMLFormElement, fd: FormData, ref: string) {
    const fields: Record<string, string> = {};
    for (const [k, v] of fd.entries()) if (typeof v === "string" && k !== "clientRef" && !k.startsWith("$ACTION")) fields[k] = v;
    try {
      await enqueue(offlineKind as OutboxKind, ref, fields);
      if (resetOnSuccess) form.reset();
      setNotice("Saved on this device. It will be sent when you are back online.");
    } catch {
      setError({ message: "You are offline and this device could not save it. Please try again when connected." });
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    const form = e.currentTarget;
    setPending(true);
    setError(null);
    setNotice(null);
    const fd = new FormData(form);
    // A random reference makes a retry harmless: the server stores one entry per reference.
    const ref = offlineKind ? crypto.randomUUID() : "";
    if (offlineKind) fd.set("clientRef", ref);
    if (offlineKind && typeof navigator !== "undefined" && !navigator.onLine) {
      await saveForLater(form, fd, ref);
      setPending(false);
      return;
    }
    try {
      const r = await action(fd);
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
      if (offlineKind) await saveForLater(form, fd, ref);
      else setError({ message: "Something went wrong" });
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
      {notice && <p role="status" className="notice">{notice}</p>}
      {error && (
        <p role="alert" className="error">
          {error.message}
          {error.ref ? ` (ref ${error.ref.slice(0, 8)})` : ""}
        </p>
      )}
    </form>
  );
}
