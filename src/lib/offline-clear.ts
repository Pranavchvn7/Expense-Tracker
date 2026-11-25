import { clearOutbox } from "@/lib/outbox";

export const LAST_USER_KEY = "et-last-user";
export const LAST_WARM_KEY = "et-last-warm-2";

/** Remove this device's saved pages. Never throws. */
export async function clearOfflineCaches(): Promise<void> {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("pages-")).map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
  try {
    await clearOutbox();
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(LAST_WARM_KEY);
  } catch {
    /* ignore */
  }
}

/** Stop push on this device only (the browser stops accepting messages for it). */
export async function unsubscribeLocalPush(): Promise<string | null> {
  try {
    if (!("serviceWorker" in navigator)) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return null;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    return endpoint;
  } catch {
    return null;
  }
}

/** Everything that must not outlive a sign-out on a shared device. */
export async function wipeDeviceData(): Promise<void> {
  await clearOfflineCaches();
  await unsubscribeLocalPush();
  try {
    localStorage.removeItem(LAST_USER_KEY);
  } catch {
    /* ignore */
  }
}
