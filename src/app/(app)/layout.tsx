import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getTheme } from "@/lib/preferences";
import { AppNav } from "@/components/AppNav";
import { SessionWatcher } from "@/components/SessionWatcher";
import { Shortcuts } from "@/components/Shortcuts";
import { OfflineManager } from "@/components/OfflineManager";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Authoritative server-side session check for every private page.
  const [session, theme] = await Promise.all([getSession(), getTheme()]);
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="shell">
      <SessionWatcher />
      <OfflineManager userId={session.user.id} />
      <Shortcuts />
      {/* When this page was produced; shown if a saved copy is opened offline. */}
      <span id="page-rendered" hidden data-at={new Date().toISOString()} />
      <AppNav name={session.user.name} theme={theme} />
      <main className="content">{children}</main>
    </div>
  );
}
