"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ResendVerification() {
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim().toLowerCase();
    try {
      await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" });
    } catch {
      // Identical response either way (no account enumeration).
    }
    setPending(false);
    setDone(true);
  }

  if (done) {
    return (
      <p className="notice" role="status">
        If that address needs verifying, a new link is on its way.
      </p>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} className="row">
      <label>
        Email
        <input name="email" type="email" maxLength={254} autoComplete="email" required />
      </label>
      <button className="btn ghost" disabled={pending} type="submit">
        {pending ? "Please wait…" : "Resend link"}
      </button>
    </form>
  );
}
