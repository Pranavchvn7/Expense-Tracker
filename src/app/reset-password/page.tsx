import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { LogoMark } from "@/components/icons";
import { isEmailEnabled } from "@/env";

// The reset token is in the URL, so never leak it through the Referer header.
export const metadata: Metadata = {
  title: "Reset password",
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
}) {
  if (!isEmailEnabled) notFound();
  const sp = await searchParams;
  const raw = Array.isArray(sp.token) ? sp.token[0] : sp.token;
  const token = raw && /^[A-Za-z0-9_-]{10,200}$/.test(raw) ? raw : null;

  return (
    <main className="auth">
      <Link href="/" className="auth-brand"><LogoMark /> Expense Tracker</Link>
      <h1>Choose a new password</h1>
      <div className="card">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p role="alert">
            This reset link is invalid or has expired.{" "}
            <Link href="/forgot-password">Request a new one</Link>.
          </p>
        )}
      </div>
    </main>
  );
}
