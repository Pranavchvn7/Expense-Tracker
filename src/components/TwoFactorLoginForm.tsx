"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

/** Second step of sign-in for accounts with 2FA: authenticator code or a one-time backup code. */
export function TwoFactorLoginForm() {
  const router = useRouter();
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s+/g, "");
    const res = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code });
    setPending(false);
    if (res.error) {
      // One generic message for every failure (wrong, expired, rate limited).
      setError("Invalid code");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form method="post" onSubmit={onSubmit} className="stack" autoComplete="off">
      <label>
        {useBackup ? "Backup code" : "6-digit code from your authenticator app"}
        {useBackup ? (
          <input key="backup" name="code" type="text" maxLength={24} autoComplete="off" required />
        ) : (
          <input
            key="totp"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            required
          />
        )}
      </label>
      <button className="btn" disabled={pending} type="submit">
        {pending ? "Please wait…" : "Verify"}
      </button>
      <button
        type="button"
        className="btn ghost"
        onClick={() => {
          setUseBackup((v) => !v);
          setError(null);
        }}
      >
        {useBackup ? "Use authenticator app instead" : "Use a backup code instead"}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  );
}
