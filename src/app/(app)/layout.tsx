import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { getTheme, getUserPrefs } from "@/lib/preferences";
import { AppNav } from "@/components/AppNav";
import { SessionWatcher } from "@/components/SessionWatcher";
import { Shortcuts } from "@/components/Shortcuts";
import Link from "next/link";
import { IconSearch } from "@/components/icons";
import { OfflineManager } from "@/components/OfflineManager";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Authoritative server-side session check for every private page.
  const [session, theme] = await Promise.all([getSession(), getTheme()]);
  if (!session?.user?.id) redirect("/login");
  const { workMode } = await getUserPrefs();

  const navCollapsed = (await cookies()).get("nav")?.value === "collapsed";
  return (
    <div className="shell">
      <SessionWatcher />
      <OfflineManager userId={session.user.id} />
      <Shortcuts />
      {/* When this page was produced; shown if a saved copy is opened offline. */}
      <span id="page-rendered" hidden data-at={new Date().toISOString()} />
      <AppNav name={session.user.name} theme={theme} workMode={workMode} collapsed={navCollapsed} />
      <header className="appbar">
        <Breadcrumbs />
        <form className="global-search" action="/expenses" method="get" role="search">
          <IconSearch />
          <input name="q" type="search" placeholder="Search expenses" aria-label="Search expenses" maxLength={80} autoComplete="off" data-testid="appbar-search" />
        </form>
        <Link href="/settings" className="user-pill" data-testid="appbar-user">
          <span className="avatar" aria-hidden="true">{(session.user.name.trim()[0] ?? "?").toUpperCase()}</span>
          <span>{session.user.name}</span>
        </Link>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
