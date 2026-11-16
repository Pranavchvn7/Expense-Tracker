"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AuthForm({
  mode,
  emailEnabled,
}: {
  mode: "login" | "signup";
  emailEnabled: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const password = String(fd.get("password") ?? "");
    const name = String(fd.get("name") ?? "").trim().slice(0, 60);

    if (mode === "signup") {
      const res = await authClient.signUp.email({
        email,
        password,
        name: name || "User",
        callbackURL: "/dashboard",
      });
      setPending(false);
      if (res.error) {
        // Generic on purpose: no user enumeration, no server detail.
        setError("Could not create account");
        return;
      }
      if (emailEnabled) {
        router.replace("/verify-email?sent=1");
      } else {
        // No email verification configured: signing up also signs you in.
        router.replace("/dashboard");
        router.refresh();
      }
      return;
    }

    const res = await authClient.signIn.email({ email, password, callbackURL: "/dashboard" });
    setPending(false);
    if (res.error) {
      // 403 only happens after the password was correct, so this reveals nothing to a guesser.
      setError(
        res.error.status === 403
          ? "Please verify your email first. We have sent you a new link."
          : "Invalid email or password",
      );
      return;
    }
    // Password was right but the account has 2FA: no session yet, ask for the code first.
    const needsSecondFactor =
      (res.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect === true;
    if (needsSecondFactor) {
      router.replace("/two-factor");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    // method="post": if JavaScript ever fails to load, the browser must never fall back
    // to a GET submit that would put the email and password into the URL.
    <form method="post" onSubmit={onSubmit} className="card stack" autoComplete="on">
      {mode === "signup" && (
        <label>
          Name
          <input name="name" type="text" maxLength={60} autoComplete="name" required />
        </label>
      )}
      <label>
        Email
        <input name="email" type="email" maxLength={254} autoComplete="email" required />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          minLength={mode === "signup" ? 12 : 1}
          maxLength={128}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
        />
      </label>
      {mode === "signup" && <small>At least 12 characters.</small>}
      <button className="btn" disabled={pending} type="submit">
        {pending ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  );
}
