"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim().toLowerCase();
    try {
      await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    } catch {
      // Ignored on purpose: the response must look identical whether or not the account exists.
    }
    setPending(false);
    setDone(true);
  }

  if (done) {
    return (
      <p className="notice" role="status" data-testid="forgot-password-sent">
        If an account exists for that email, we have sent a reset link. It is valid for 15 minutes.
      </p>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} className="stack" data-testid="forgot-password">
      <label>
        Email
        <input name="email" type="email" maxLength={254} autoComplete="email" required />
      </label>
      <button className="btn" disabled={pending} type="submit" data-testid="forgot-password-submit">
        {pending ? "Please wait…" : "Send reset link"}
      </button>
    </form>
  );
}
