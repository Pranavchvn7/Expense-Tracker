import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Authoritative server-side session check for every private page.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="shell">
      <AppNav name={session.user.name} />
      <main className="content">{children}</main>
    </div>
  );
}
