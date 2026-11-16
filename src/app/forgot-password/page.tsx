import Link from "next/link";
import { notFound } from "next/navigation";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { isEmailEnabled } from "@/env";

export default function ForgotPasswordPage() {
  if (!isEmailEnabled) notFound();
  return (
    <main>
      <h1>Forgot password</h1>
      <ForgotPasswordForm />
      <p className="muted">
        <Link href="/login">Back to sign in</Link>
      </p>
    </main>
  );
}
