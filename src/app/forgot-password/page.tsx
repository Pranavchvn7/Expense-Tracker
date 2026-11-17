import Link from "next/link";
import { notFound } from "next/navigation";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { LogoMark } from "@/components/icons";
import { isEmailEnabled } from "@/env";

export default function ForgotPasswordPage() {
  if (!isEmailEnabled) notFound();
  return (
    <main className="auth">
      <Link href="/" className="auth-brand"><LogoMark /> Expense Tracker</Link>
      <h1>Forgot password</h1>
      <p className="lead">We will email you a reset link</p>
      <div className="card"><ForgotPasswordForm /></div>
      <p className="foot-links"><Link href="/login">Back to sign in</Link></p>
    </main>
  );
}
