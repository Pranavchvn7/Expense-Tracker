import Link from "next/link";
import { LogoMark } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="auth">
      <Link href="/" className="auth-brand"><LogoMark /> Expense Tracker</Link>
      <div className="card">
        <div className="empty">
          <strong>Page not found</strong>
          <span>It may not exist, or you may not have access to it.</span>
          <Link className="btn" href="/dashboard">Go to dashboard</Link>
        </div>
      </div>
    </main>
  );
}
