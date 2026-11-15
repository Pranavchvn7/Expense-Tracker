import Link from "next/link";
import { notFound } from "next/navigation";
import { ResendVerification } from "@/components/ResendVerification";
import { isEmailEnabled } from "@/env";

export default function VerifyEmailPage() {
  if (!isEmailEnabled) notFound();
  return (
    <main>
      <h1>Check your email</h1>
      <p className="muted">
        We sent a verification link. Open it to activate your account, then sign in. The link is
        valid for 1 hour.
      </p>
      <h2>Did not get it?</h2>
      <ResendVerification />
      <p className="muted">
        Already verified? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
