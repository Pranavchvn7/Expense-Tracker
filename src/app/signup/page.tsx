import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { env, isEmailEnabled } from "@/env";

export default function SignupPage() {
  // Registration closed: the page does not exist (the API rejects it too).
  if (!env.SIGNUPS_ENABLED) notFound();

  return (
    <main>
      <h1>Create account</h1>
      <AuthForm mode="signup" emailEnabled={isEmailEnabled} />
      <p className="muted">
        Already registered? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
