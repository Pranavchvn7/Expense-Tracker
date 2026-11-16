import Link from "next/link";
import { TwoFactorLoginForm } from "@/components/TwoFactorLoginForm";

export default function TwoFactorPage() {
  return (
    <main>
      <h1>Two-factor verification</h1>
      <p className="muted">Enter the code to finish signing in.</p>
      <TwoFactorLoginForm />
      <p className="muted">
        <Link href="/login">Back to sign in</Link>
      </p>
    </main>
  );
}
