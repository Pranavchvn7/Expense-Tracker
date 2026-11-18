"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IconDashboard, IconReceipt, IconRepeat, IconSettings, IconWallet, LogoMark } from "@/components/icons";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: <IconDashboard /> },
  { href: "/expenses", label: "Expenses", icon: <IconReceipt /> },
  { href: "/income", label: "Income", icon: <IconWallet /> },
  { href: "/recurring", label: "Recurring", icon: <IconRepeat /> },
  { href: "/settings", label: "Settings", icon: <IconSettings /> },
];

export function AppNav({ name, theme }: { name: string; theme: "light" | "dark" | "system" }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const initial = (name.trim()[0] ?? "?").toUpperCase();

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
        <div className="actions">
          <ThemeToggle initial={theme} />
          <SignOutButton />
        </div>
      </header>

      <nav className="bottom-bar" aria-label="Main">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="tab" aria-current={active(i.href) ? "page" : undefined}>
            {i.icon}
            {i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
