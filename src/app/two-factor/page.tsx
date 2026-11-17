import Link from "next/link";
import { TwoFactorLoginForm } from "@/components/TwoFactorLoginForm";
import { LogoMark } from "@/components/icons";

export default function TwoFactorPage() {
  return (
    <main className="auth">
      <Link href="/" className="auth-brand"><LogoMark /> Expense Tracker</Link>
      <h1>Two-factor verification</h1>
      <p className="lead">Enter the code to finish signing in</p>
      <div className="card"><TwoFactorLoginForm /></div>
      <p className="foot-links"><Link href="/login">Back to sign in</Link></p>
    </main>
  );
}
