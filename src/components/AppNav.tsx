"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  IconPanel,
  IconBriefcase,
  IconCalendar,
  IconCard,
  IconDashboard,
  IconMore,
  IconPie,
  IconReport,
  IconPlus,
  IconReceipt,
  IconRepeat,
  IconSettings,
  IconUsers,
  IconTarget,
  IconWallet,
  LogoMark,
} from "@/components/icons";

const baseItems = [
  { href: "/dashboard", label: "Dashboard", icon: <IconDashboard /> },
  { href: "/expenses", label: "Expenses", icon: <IconReceipt /> },
  { href: "/income", label: "Income", icon: <IconWallet /> },
  { href: "/budgets", label: "Budgets", icon: <IconPie /> },
  { href: "/reports", label: "Reports", icon: <IconReport /> },
  { href: "/debts", label: "Debts", icon: <IconCard /> },
  { href: "/recurring", label: "Recurring", icon: <IconRepeat /> },
  { href: "/goals", label: "Goals", icon: <IconTarget /> },
  { href: "/settings", label: "Settings", icon: <IconSettings /> },
];
// Freelance pages appear after Income for people who work as freelancers (alone or next to a job).
const freelanceItems = [
  { href: "/clients", label: "Clients", icon: <IconUsers /> },
  { href: "/jobs", label: "Jobs", icon: <IconBriefcase /> },
  { href: "/calendar", label: "Calendar", icon: <IconCalendar /> },
];

export function AppNav({
  collapsed,
  name,
  theme,
  workMode = "SALARIED",
}: {
  collapsed?: boolean;
  name: string;
  theme: "light" | "dark" | "system";
  workMode?: "SALARIED" | "FREELANCE" | "BOTH";
}) {
  const items = workMode === "SALARIED" ? baseItems : [...baseItems.slice(0, 3), ...freelanceItems, ...baseItems.slice(3)];
  // Phone bottom bar: the three daily pages, everything else lives under "More".
  const primary = items.slice(0, 3);
  const secondary = items.slice(3);
  // Desktop sidebar groups: daily pages first, setup and planning pages under their own label.
  const mainCount = workMode === "SALARIED" ? 3 : 6;
  const main = items.slice(0, mainCount);
  const manage = items.slice(mainCount);
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  const moreActive = secondary.some((i) => active(i.href));

  // Close the sheet after navigating, and on Escape.
  useEffect(() => setMore(false), [pathname]);
  useEffect(() => {
    if (!more) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [more]);

  // One floating "+" that adds whatever the current page lists.
  const fab = pathname.startsWith("/income")
    ? { href: "/income?add=1", label: "Add income" }
    : pathname.startsWith("/dashboard") || pathname.startsWith("/expenses")
      ? { href: "/expenses?add=1", label: "Add expense" }
      : null;

  const [isCollapsed, setIsCollapsed] = useState(collapsed ?? false);
  function toggleNav() {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      document.cookie = `nav=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // Cookies blocked: the menu still toggles for this visit.
    }
  }

  return (
    <>
      <aside className={isCollapsed ? "sidebar is-collapsed" : "sidebar"} aria-label="Main">
        <div className="brand-row">
          <Link href="/dashboard" className="brand" title="Expense Tracker">
            <LogoMark /><span className="brand-text">Expense Tracker</span>
          </Link>
          <button type="button" className="nav-toggle" onClick={toggleNav} aria-expanded={!isCollapsed} aria-label={isCollapsed ? "Expand menu" : "Collapse menu"} data-testid="nav-toggle">
            <IconPanel />
          </button>
        </div>
        <nav className="side-nav" aria-label="Pages">
          <p className="nav-label">Main menu</p>
          {main.map((i) => (
            <Link key={i.href} href={i.href} className="nav-link" title={i.label} data-testid={`side-nav-${i.href.slice(1)}`} aria-current={active(i.href) ? "page" : undefined}>
              {i.icon}
              <span className="nav-text">{i.label}</span>
            </Link>
          ))}
          <p className="nav-label">Manage</p>
          {manage.map((i) => (
            <Link key={i.href} href={i.href} className="nav-link" title={i.label} data-testid={`side-nav-${i.href.slice(1)}`} aria-current={active(i.href) ? "page" : undefined}>
              {i.icon}
              <span className="nav-text">{i.label}</span>
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <div className="who">
            <span className="avatar" aria-hidden="true">{initial}</span>
            <span className="who-name">{name}</span>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <header className="topbar">
        <Link href="/dashboard" className="brand">
          <LogoMark /> Expense Tracker
        </Link>
        <span className="avatar" aria-hidden="true">{initial}</span>
      </header>

      {fab && (
        <Link href={fab.href} className="fab" data-testid="fab-add" aria-label={fab.label} title={`${fab.label} (N)`}>
          <IconPlus />
        </Link>
      )}

      {more && <button type="button" className="sheet-backdrop" aria-label="Close menu" onClick={() => setMore(false)} />}
      {more && (
        <div className="sheet hide-scroll" role="dialog" aria-label="More">
          <div className="who">
            <span className="avatar" aria-hidden="true">{initial}</span>
            <span className="who-name">{name}</span>
          </div>
          {secondary.map((i) => (
            <Link key={i.href} href={i.href} className="nav-link" data-testid={`sheet-nav-${i.href.slice(1)}`} aria-current={active(i.href) ? "page" : undefined}>
              {i.icon}
              <span className="nav-text">{i.label}</span>
            </Link>
          ))}
          <div className="sheet-foot">
            <ThemeToggle initial={theme} />
            <SignOutButton />
          </div>
        </div>
      )}

      <nav className="bottom-bar" aria-label="Main">
        {primary.map((i) => (
          <Link key={i.href} href={i.href} className="tab" data-testid={`tab-${i.href.slice(1)}`} aria-current={active(i.href) ? "page" : undefined}>
            {i.icon}
            <span className="nav-text">{i.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className="tab"
          data-testid="tab-more"
          aria-expanded={more}
          aria-current={moreActive ? "page" : undefined}
          onClick={() => setMore((v) => !v)}
        >
          <IconMore />
          More
        </button>
      </nav>
    </>
  );
}
