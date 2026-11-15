import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main>
      <h1>Sign in</h1>
      <AuthForm mode="login" />
      <p className="muted">
        No account? <Link href="/signup">Create one</Link>
      </p>
    </main>
  );
}
