"use client";

import { useEffect, useRef, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * A filter form that never reloads the page. Submitting turns the fields into a query string and
 * navigates softly (router.replace inside a transition), so the rest of the page stays exactly as
 * it is while the region named by `busyId` dims until the new rows arrive. Without JavaScript it
 * still works as an ordinary GET form. Only filter values (dates, ids, words) go in the URL.
 */
export function SoftForm({
  action,
  busyId,
  className,
  label,
  children,
}: {
  action: string;
  busyId: string;
  className?: string;
  label: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
    }
    const el = document.getElementById(busyId);
    if (el) el.setAttribute("aria-busy", pending ? "true" : "false");
  }, [pending, busyId]);

  return (
    <form
      className={className}
      method="get"
      action={action}
      aria-label={label}
      onSubmit={(e) => {
        e.preventDefault();
        const u = new URLSearchParams();
        for (const [k, v] of new FormData(e.currentTarget).entries()) {
          if (typeof v === "string" && v !== "") u.append(k, v);
        }
        const qs = u.toString();
        start(() => router.replace(qs ? `${action}?${qs}` : action, { scroll: false }));
      }}
    >
      {children}
    </form>
  );
}
