"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  IconDashboard,
  IconMore,
  IconPie,
  IconReport,
  IconPlus,
  IconReceipt,
  IconRepeat,
  IconSettings,
  IconTarget,
  IconWallet,
  LogoMark,
} from "@/components/icons";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: <IconDashboard /> },
  { href: "/expenses", label: "Expenses", icon: <IconReceipt /> },
  { href: "/income", label: "Income", icon: <IconWallet /> },
  { href: "/budgets", label: "Budgets", icon: <IconPie /> },
  { href: "/reports", label: "Reports", icon: <IconReport /> },
  { href: "/recurring", label: "Recurring", icon: <IconRepeat /> },
  { href: "/goals", label: "Goals", icon: <IconTarget /> },
  { href: "/settings", label: "Settings", icon: <IconSettings /> },
];
// Phone bottom bar: the three daily pages, everything else lives under "More".
const primary = items.slice(0, 3);
const secondary = items.slice(3);

export function AppNav({ name, theme }: { name: string; theme: "light" | "dark" | "system" }) {
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

  return (
    <>
      <aside className="sidebar" aria-label="Main">
        <Link href="/dashboard" className="brand">
          <LogoMark /> Expense Tracker
        </Link>
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="nav-link" aria-current={active(i.href) ? "page" : undefined}>
            {i.icon}
            {i.label}
          </Link>
        ))}
        <div className="side-foot">
          <div className="who">
            <span className="avatar" aria-hidden="true">{initial}</span>
            <span className="who-name">{name}</span>
          </div>
          <ThemeToggle initial={theme} />
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
        <Link href={fab.href} className="fab" aria-label={fab.label}>
          <IconPlus />
        </Link>
      )}

      {more && <button type="button" className="sheet-backdrop" aria-label="Close menu" onClick={() => setMore(false)} />}
      {more && (
        <div className="sheet" role="dialog" aria-label="More">
          <div className="who">
            <span className="avatar" aria-hidden="true">{initial}</span>
            <span className="who-name">{name}</span>
          </div>
          {secondary.map((i) => (
            <Link key={i.href} href={i.href} className="nav-link" aria-current={active(i.href) ? "page" : undefined}>
              {i.icon}
              {i.label}
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
          <Link key={i.href} href={i.href} className="tab" aria-current={active(i.href) ? "page" : undefined}>
            {i.icon}
            {i.label}
          </Link>
        ))}
        <button
          type="button"
          className="tab"
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
