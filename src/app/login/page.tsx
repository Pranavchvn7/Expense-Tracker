import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { env, isEmailEnabled } from "@/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string | string[] }>;
}) {
  const sp = await searchParams;
  const justReset = sp.reset === "1";

  return (
    <main>
      <h1>Sign in</h1>
      {justReset && (
        <p className="card" role="status">
          Password updated. Please sign in with your new password.
        </p>
      )}
      <AuthForm mode="login" emailEnabled={isEmailEnabled} />
      {isEmailEnabled && (
        <p className="muted">
          <Link href="/forgot-password">Forgot password?</Link>
        </p>
      )}
      {env.SIGNUPS_ENABLED && (
        <p className="muted">
          No account? <Link href="/signup">Create one</Link>
        </p>
      )}
    </main>
  );
}
