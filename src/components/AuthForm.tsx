"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
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

    const res =
      mode === "signup"
        ? await authClient.signUp.email({ email, password, name: name || "User" })
        : await authClient.signIn.email({ email, password });

    setPending(false);
    if (res.error) {
      // Generic on purpose: no user enumeration, no server detail.
      setError(mode === "login" ? "Invalid email or password" : "Could not create account");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card stack" autoComplete="on">
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
