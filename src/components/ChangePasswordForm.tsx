"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function ChangePasswordForm() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setMessage(null);
    const fd = new FormData(form);
    const currentPassword = String(fd.get("current") ?? "");
    const newPassword = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (newPassword !== confirm) {
      setMessage({ ok: false, text: "New passwords do not match" });
      return;
    }
    setPending(true);
    const res = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true, // other devices are signed out
    });
    setPending(false);
    if (res.error) {
      setMessage({ ok: false, text: "Could not change password. Check your current password." });
      return;
    }
    form.reset();
    setMessage({ ok: true, text: "Password changed. Other devices were signed out." });
  }

  return (
    <form method="post" onSubmit={onSubmit} className="stack" data-testid="change-password">
      <label>
        Current password
        <input name="current" type="password" maxLength={128} autoComplete="current-password" required />
      </label>
      <label>
        New password
        <input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required />
      </label>
      <label>
        Confirm new password
        <input name="confirm" type="password" minLength={12} maxLength={128} autoComplete="new-password" required />
      </label>
      <small>At least 12 characters.</small>
      <button className="btn" disabled={pending} type="submit" data-testid="change-password-submit">
        {pending ? "Please wait…" : "Change password"}
      </button>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "muted" : "error"} data-testid="change-password-message">
          {message.text}
        </p>
      )}
    </form>
  );
}
