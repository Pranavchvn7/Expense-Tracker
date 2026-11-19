"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createExpense } from "@/actions/expenses";
import { createIncome } from "@/actions/income";
import { listOutbox, markFailed, removeItem, clearError, type OutboxItem } from "@/lib/outbox";
import { clearOfflineCaches, LAST_USER_KEY, LAST_WARM_KEY } from "@/lib/offline-clear";

const WARM_PAGES = ["/dashboard", "/expenses", "/income", "/budgets", "/reports", "/recurring", "/goals", "/debts"];
const WARM_EVERY_MS = 6 * 3600_000;

/**
 * Registers the service worker, keeps this device's saved pages fresh, sends entries that were
 * added offline, and shows a small status banner. Mounted once inside the signed-in layout.
 */
export function OfflineManager({ userId }: { userId: string }) {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const syncing = useRef(false);

  const reload = useCallback(async () => {
    try {
      setItems(await listOutbox());
    } catch {
      setItems([]);
    }
  }, []);

  const sync = useCallback(async () => {
    if (syncing.current || !navigator.onLine) return;
    syncing.current = true;
    let sent = 0;
    try {
      for (const item of await listOutbox()) {
        if (item.error) continue;
        const fd = new FormData();
        for (const [k, v] of Object.entries(item.fields)) fd.set(k, v);
        fd.set("clientRef", item.id);
        let res: { ok: boolean; message?: string };
        try {
          res = await (item.kind === "expense" ? createExpense(fd) : createIncome(fd));
        } catch {
          break; // still no connection: keep everything, try again later
        }
        if (res.ok) {
          await removeItem(item.id);
          sent += 1;
        } else {
          await markFailed(item.id, res.message ?? "Could not be saved");
        }
      }
    } finally {
      syncing.current = false;
      await reload();
    }
    if (sent > 0) {
      setMsg(`${sent} offline entr${sent === 1 ? "y" : "ies"} synced.`);
      window.setTimeout(() => setMsg(null), 5000);
      router.refresh();
    }
  }, [reload, router]);

  // Different person on this device: drop the previous person's saved pages and queue.
  useEffect(() => {
    try {
      const last = localStorage.getItem(LAST_USER_KEY);
      if (last && last !== userId) void clearOfflineCaches();
      localStorage.setItem(LAST_USER_KEY, userId);
    } catch {
      /* storage blocked: skip */
    }
  }, [userId]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }
    setOnline(navigator.onLine);
    void reload();
    void sync();
    const goOnline = () => {
      setOnline(true);
      void sync();
    };
    const goOffline = () => setOnline(false);
    const changed = () => void reload();
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("outbox-changed", changed);
    const timer = window.setInterval(() => void sync(), 60_000);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("outbox-changed", changed);
      window.clearInterval(timer);
    };
  }, [reload, sync]);

  // Quietly save the main pages once in a while so they open without a connection.
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !navigator.onLine) return;
    let last = 0;
    try {
      last = Number(localStorage.getItem(LAST_WARM_KEY) ?? 0);
    } catch {
      /* ignore */
    }
    if (Date.now() - last < WARM_EVERY_MS) return;
    let cancelled = false;
    const run = async () => {
      await navigator.serviceWorker.ready;
      for (const path of WARM_PAGES) {
        if (cancelled || !navigator.onLine) return;
        try {
          await fetch(path, { headers: { "X-Warm": "1" }, credentials: "same-origin", cache: "no-store" });
        } catch {
          return;
        }
      }
      try {
        localStorage.setItem(LAST_WARM_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    };
    const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const start = window.setTimeout(() => (idle ? idle(() => void run()) : void run()), 4000);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, []);

  const waiting = items.filter((i) => !i.error);
  const failed = items.filter((i) => i.error);
  if (online && waiting.length === 0 && failed.length === 0 && !msg) return null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      {!online && <span>You are offline. Saved pages still open, and new entries are kept on this device.</span>}
      {waiting.length > 0 && (
        <span>{waiting.length} entr{waiting.length === 1 ? "y" : "ies"} waiting to sync{online ? "…" : "."}</span>
      )}
      {msg && <span>{msg}</span>}
      {failed.map((f) => (
        <span key={f.id} className="offline-failed">
          Could not save {f.kind === "expense" ? f.fields.description ?? "an expense" : f.fields.source ?? "income"}: {f.error}
          <button className="btn ghost small" type="button" onClick={() => void clearError(f.id).then(() => sync())}>Retry</button>
          <button className="btn ghost small" type="button" onClick={() => void removeItem(f.id)}>Discard</button>
        </span>
      ))}
    </div>
  );
}
