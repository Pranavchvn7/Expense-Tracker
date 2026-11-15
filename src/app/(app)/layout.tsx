import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Authoritative server-side session check for every private page.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  return (
    <>
      <nav>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/expenses">Expenses</Link>
        <Link href="/settings">Settings</Link>
        <span className="spacer" />
        <SignOutButton />
      </nav>
      <main>{children}</main>
    </>
  );
}
