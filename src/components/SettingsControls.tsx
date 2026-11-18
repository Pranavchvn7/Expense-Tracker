"use client";

import { useEffect } from "react";

/**
 * Expand/collapse every settings module, and open the module a #hash link points at
 * (so "Set it in your profile" works even when that module is collapsed).
 */
export function SettingsControls() {
  useEffect(() => {
    function openHash() {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ block: "start" });
      }
    }
    openHash();
    window.addEventListener("hashchange", openHash);
    return () => window.removeEventListener("hashchange", openHash);
  }, []);

  function setAll(open: boolean) {
    document.querySelectorAll<HTMLDetailsElement>("details.module").forEach((d) => {
      d.open = open;
    });
  }
  return (
    <div className="actions">
      <button type="button" className="btn soft small" onClick={() => setAll(true)}>Expand all</button>
      <button type="button" className="btn soft small" onClick={() => setAll(false)}>Collapse all</button>
    </div>
  );
}
