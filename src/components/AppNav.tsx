"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { IconDashboard, IconReceipt, IconSettings, IconWallet, LogoMark } from "@/components/icons";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: <IconDashboard /> },
  { href: "/expenses", label: "Expenses", icon: <IconReceipt /> },
  { href: "/income", label: "Income", icon: <IconWallet /> },
  { href: "/settings", label: "Settings", icon: <IconSettings /> },
];

export function AppNav({ name }: { name: string }) {
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
          <SignOutButton />
        </div>
      </aside>

      <header className="topbar">
        <Link href="/dashboard" className="brand">
          <LogoMark /> Expense Tracker
        </Link>
        <SignOutButton />
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
