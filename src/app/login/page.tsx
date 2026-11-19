import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AuthForm } from "@/components/AuthForm";
import { LogoMark } from "@/components/icons";
import { env, isEmailEnabled } from "@/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string | string[] }>;
}) {
  const session = await getSession();
  if (session?.user?.id) redirect("/dashboard");
  const sp = await searchParams;
  const justReset = sp.reset === "1";

  return (
    <main className="auth">
      <Link href="/" className="auth-brand"><LogoMark /> Expense Tracker</Link>
      <h1>Welcome back</h1>
      <p className="lead">Sign in to your account</p>
      <div className="card">
        {justReset && (
          <p className="notice" role="status">
            Password updated. Please sign in with your new password.
          </p>
        )}
        <AuthForm mode="login" emailEnabled={isEmailEnabled} />
      </div>
      <p className="foot-links">
        {isEmailEnabled && <><Link href="/forgot-password">Forgot password?</Link>{" · "}</>}
        {env.SIGNUPS_ENABLED && <>No account? <Link href="/signup">Create one</Link></>}
      </p>
    </main>
  );
}
