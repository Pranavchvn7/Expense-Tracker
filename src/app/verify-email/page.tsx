import Link from "next/link";
import { notFound } from "next/navigation";
import { ResendVerification } from "@/components/ResendVerification";
import { LogoMark } from "@/components/icons";
import { isEmailEnabled } from "@/env";

export default function VerifyEmailPage() {
  if (!isEmailEnabled) notFound();
  return (
    <main className="auth">
      <Link href="/" className="auth-brand"><LogoMark /> Expense Tracker</Link>
      <h1>Check your email</h1>
      <p className="lead">
        We sent a verification link. Open it to activate your account, then sign in. It is valid
        for 1 hour.
      </p>
      <div className="card stack">
        <h2>Did not get it?</h2>
        <ResendVerification />
      </div>
      <p className="foot-links">Already verified? <Link href="/login">Sign in</Link></p>
    </main>
  );
}
