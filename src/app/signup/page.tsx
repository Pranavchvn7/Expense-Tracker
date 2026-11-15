import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <main>
      <h1>Create account</h1>
      <AuthForm mode="signup" />
      <p className="muted">
        Already registered? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
