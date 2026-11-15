"use client";

import { useActionState, type ReactNode } from "react";

type Result = { ok: true } | { ok: false; message: string; ref?: string } | null;

/** Runs a server action, shows only the safe generic message (plus correlation ref). */
export function ActionForm({
  action,
  children,
  submitLabel,
  className,
  danger,
}: {
  action: (fd: FormData) => Promise<{ ok: boolean; message?: string; ref?: string }>;
  children?: ReactNode;
  submitLabel: string;
  className?: string;
  danger?: boolean;
}) {
  const [state, run, pending] = useActionState<Result, FormData>(async (_prev, fd) => {
    const r = await action(fd);
    return r.ok ? { ok: true } : { ok: false, message: r.message ?? "Error", ref: r.ref };
  }, null);

  return (
    <form action={run} className={className}>
      {children}
      <button type="submit" disabled={pending} className={danger ? "btn danger" : "btn"}>
        {pending ? "Working…" : submitLabel}
      </button>
      {state && !state.ok && (
        <p role="alert" className="error">
          {state.message}
          {state.ref ? ` (ref ${state.ref.slice(0, 8)})` : ""}
        </p>
      )}
    </form>
  );
}
