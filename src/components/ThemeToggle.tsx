"use client";

import { useState } from "react";
import { IconMonitor, IconMoon, IconSun } from "@/components/icons";

type Theme = "light" | "dark" | "system";

const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Light", icon: <IconSun /> },
  { value: "system", label: "System", icon: <IconMonitor /> },
  { value: "dark", label: "Dark", icon: <IconMoon /> },
];

/**
 * Light / system / dark. The server reads the "theme" cookie and renders data-theme on <html>,
 * so there is no flash and no inline script (the CSP forbids those). The cookie holds only a
 * harmless UI preference and is allowlisted again on the server.
 */
export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function choose(next: Theme) {
    setTheme(next);
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  }

  return (
    <div className="theme-toggle" role="group" aria-label="Colour theme">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => choose(o.value)}
          aria-pressed={theme === o.value}
          aria-label={o.label}
          title={o.label}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}
