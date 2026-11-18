import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { notFound } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { LogoMark } from "@/components/icons";
import { env, isEmailEnabled } from "@/env";

export default async function SignupPage() {
  // Registration closed: the page does not exist (the API rejects it too).
  if (!env.SIGNUPS_ENABLED) notFound();
  const session = await getSession();
  if (session?.user?.id) redirect("/dashboard");

  return (
    <main className="auth">
      <Link href="/" className="auth-brand"><LogoMark /> Expense Tracker</Link>
      <h1>Create your account</h1>
      <p className="lead">It takes less than a minute</p>
      <div className="card">
        <AuthForm mode="signup" emailEnabled={isEmailEnabled} />
      </div>
      <p className="foot-links">
        Already registered? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
