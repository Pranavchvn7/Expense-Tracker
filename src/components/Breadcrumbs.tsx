"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Human names for the top-level sections. Anything else is treated as a detail page.
const SECTION: Record<string, string> = {
  dashboard: "Dashboard",
  expenses: "Expenses",
  income: "Income",
  budgets: "Budgets",
  reports: "Reports",
  debts: "Debts",
  recurring: "Recurring",
  goals: "Goals",
  settings: "Settings",
  clients: "Clients",
  jobs: "Jobs",
  calendar: "Calendar",
  import: "Import",
};

/** Where you are, as clickable crumbs: Section / Detail. Hidden on the dashboard root. */
export function Breadcrumbs() {
  const pathname = usePathname() ?? "/";
  const parts = pathname.split("/").filter(Boolean);
  const first = parts[0] ?? "";
  const section = SECTION[first];
  if (!section) return null;

  const crumbs: { href: string; label: string }[] = [{ href: `/${first}`, label: section }];
  // A second segment is a record id or a sub-page; name sub-pages, call anything else "Details".
  const second = parts[1];
  if (second) {
    const label = second === "new" || second === "add" ? "New" : second === "export" ? "Export" : second === "due" ? "Balances due" : "Details";
    crumbs.push({ href: pathname, label });
  }

  return (
    <nav aria-label="Breadcrumb" className="crumbs" data-testid="breadcrumbs">
      <ol>
        <li><Link href="/dashboard">Home</Link><span className="sep" aria-hidden="true">/</span></li>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.href}>
              {last ? <span aria-current="page">{c.label}</span> : <Link href={c.href}>{c.label}</Link>}
              {!last && <span className="sep" aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
