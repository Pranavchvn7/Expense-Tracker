"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { listOutbox } from "@/lib/outbox";
import { unsubscribePush } from "@/actions/push";
import { clearOfflineCaches, LAST_USER_KEY, unsubscribeLocalPush } from "@/lib/offline-clear";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="btn ghost"
      data-testid="sign-out"
      onClick={async () => {
        try {
          const waiting = (await listOutbox()).length;
          if (waiting > 0 && !window.confirm(`${waiting} entr${waiting === 1 ? "y has" : "ies have"} not synced yet and will be lost if you sign out. Sign out anyway?`)) return;
        } catch {
          /* no IndexedDB: nothing queued */
        }
        // Remove this device's saved pages, queue and push link while the session is still valid.
        const endpoint = await unsubscribeLocalPush();
        if (endpoint) await unsubscribePush(endpoint).catch(() => undefined);
        await clearOfflineCaches();
        try {
          localStorage.removeItem(LAST_USER_KEY);
        } catch {
          /* ignore */
        }
        await authClient.signOut();
        router.replace("/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
