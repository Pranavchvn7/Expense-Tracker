import type { ReactNode } from "react";
import { IconDots } from "@/components/icons";

// One "more actions" menu per record row. Plain <details>, so it works without client JavaScript
// and every action inside is still a normal form or link. Children are styled as menu items.
export function RowMenu({ children }: { children: ReactNode }) {
  return (
    <details className="row-menu" data-testid="row-menu">
      <summary className="row-menu-btn" aria-label="More actions" title="More actions">
        <IconDots />
      </summary>
      <div className="row-menu-panel">{children}</div>
    </details>
  );
}
