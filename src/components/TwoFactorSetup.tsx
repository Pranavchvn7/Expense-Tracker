"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as QRCode from "qrcode";
import { authClient } from "@/lib/auth-client";

type Phase = "idle" | "scan" | "codes";

function secretFromUri(uri: string): string | null {
  try {
    return new URL(uri).searchParams.get("secret");
  } catch {
    return null;
  }
}

/**
 * Turn 2FA on/off and manage backup codes. Secrets only live in component state for the
 * moment they are shown; nothing is written to storage and nothing is logged.
 */
export function TwoFactorSetup({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [heldCodes, setHeldCodes] = useState<string[]>([]); // shown only after the first code is confirmed
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const passwordFrom = (form: HTMLFormElement) =>
    String(new FormData(form).get("password") ?? "");

  async function start(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await authClient.twoFactor.enable({ password: passwordFrom(e.currentTarget) });
    const data = res.data as { totpURI?: string; backupCodes?: string[] } | null;
    if (res.error || !data?.totpURI) {
      setBusy(false);
      setError("Could not start setup. Check your password.");
      return;
    }
    setQr(await QRCode.toDataURL(data.totpURI, { width: 220, margin: 1 }));
    setSecret(secretFromUri(data.totpURI));
    setHeldCodes(data.backupCodes ?? []);
    setBusy(false);
    setPhase("scan");
  }

  async function confirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s+/g, "");
    const res = await authClient.twoFactor.verifyTotp({ code });
    setBusy(false);
    if (res.error) {
      setError("That code did not match. Check that your phone's clock is automatic and retry.");
      return;
    }
    setCodes(heldCodes);
    setHeldCodes([]);
    setQr(null);
    setSecret(null);
    setPhase("codes");
    router.refresh();
  }

  async function turnOff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await authClient.twoFactor.disable({ password: passwordFrom(e.currentTarget) });
    setBusy(false);
    if (res.error) {
      setError("Could not turn off 2FA. Check your password.");
      return;
    }
    router.refresh();
  }

  async function regenerate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = e.currentTarget;
    const res = await authClient.twoFactor.generateBackupCodes({ password: passwordFrom(form) });
    setBusy(false);
    const data = res.data as { backupCodes?: string[] } | null;
    if (res.error || !data?.backupCodes) {
      setError("Could not create new codes. Check your password.");
      return;
    }
    form.reset();
    setCodes(data.backupCodes);
    setPhase("codes");
  }

  if (phase === "codes") {
    return (
      <div className="card stack">
        <strong>Save these backup codes now</strong>
        <p className="muted">
          Each works once if you lose your phone. They will not be shown again. Store them in a
          password manager or print them; do not keep them in a note next to your password.
        </p>
        <ul className="codes">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <button
          className="btn"
          onClick={() => {
            setCodes([]);
            setPhase("idle");
          }}
        >
          I have saved them
        </button>
      </div>
    );
  }

  if (phase === "scan") {
    return (
      <form method="post" onSubmit={confirm} className="card stack" autoComplete="off" data-testid="two-factor-confirm">
        <strong>1. Scan this QR code with your authenticator app</strong>
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element -- data: URL, nothing to optimise
          <img className="qr" src={qr} alt="QR code for your authenticator app" width={220} height={220} />
        )}
        {secret && (
          <p className="muted">
            Cannot scan? Enter this key manually: <code>{secret}</code>
          </p>
        )}
        <label>
          2. Enter the 6-digit code it shows
          <input
            name="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            required
          />
        </label>
        <button className="btn" disabled={busy} type="submit">
          {busy ? "Checking…" : "Turn on 2FA"}
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </form>
    );
  }

  if (enabled) {
    return (
      <div className="stack">
        <p role="status">
          <strong>2FA is on.</strong>
        </p>
        <form method="post" onSubmit={regenerate} className="card row" data-testid="two-factor-regenerate">
          <label>
            Password
            <input name="password" type="password" maxLength={128} autoComplete="current-password" required />
          </label>
          <button className="btn ghost" disabled={busy} type="submit">
            New backup codes
          </button>
        </form>
        <form method="post" onSubmit={turnOff} className="card row" data-testid="two-factor-turn-off">
          <label>
            Password
            <input name="password" type="password" maxLength={128} autoComplete="current-password" required />
          </label>
          <button className="btn danger" disabled={busy} type="submit">
            Turn off 2FA
          </button>
        </form>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form method="post" onSubmit={start} className="card row" data-testid="two-factor-start">
      <label>
        Confirm your password to begin
        <input name="password" type="password" maxLength={128} autoComplete="current-password" required />
      </label>
      <button className="btn" disabled={busy} type="submit">
        {busy ? "Please wait…" : "Set up 2FA"}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  );
}
