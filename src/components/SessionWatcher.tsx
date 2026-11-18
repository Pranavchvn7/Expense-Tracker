"use client";

import { useEffect } from "react";

/**
 * Signs this screen out soon after the session is revoked elsewhere ("sign out all other
 * devices", password reset, expiry). It asks a tiny endpoint every 30 seconds while the tab is
 * visible and whenever the tab regains focus. Only a definite 401 logs out: being offline or a
 * server hiccup never does.
 */
export function SessionWatcher() {
  useEffect(() => {
    let stopped = false;
    async function check() {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/session-check", { cache: "no-store", credentials: "same-origin" });
        if (res.status === 401) window.location.assign("/login");
      } catch {
        /* offline or network error: ignore */
      }
    }
    const timer = window.setInterval(check, 30_000);
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);
  return null;
}
