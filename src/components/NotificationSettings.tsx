"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { sendTestPush, setNotifyPrefs, subscribePush, unsubscribePush } from "@/actions/push";
import { clearOfflineCaches } from "@/lib/offline-clear";
import { LAST_WARM_KEY } from "@/lib/offline-clear";

function keyToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function NotificationSettings({
  publicKey,
  notifyBudget,
  notifyRenewals,
}: {
  publicKey: string | null;
  notifyBudget: boolean;
  notifyRenewals: boolean;
}) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const [supported, setSupported] = useState(true);
  const [enabledHere, setEnabledHere] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.getRegistration().then((r) => r?.pushManager.getSubscription()).then((s) => setEnabledHere(Boolean(s))).catch(() => undefined);
  }, []);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    setProblem(null);
    setNote(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setProblem("Notifications are blocked for this site. Allow them in your browser or phone settings, then try again.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }));
      const json = sub.toJSON();
      const res = await subscribePush({ endpoint: json.endpoint, keys: json.keys });
      if (!res.ok) {
        await sub.unsubscribe().catch(() => undefined);
        setProblem(res.message);
        return;
      }
      setEnabledHere(true);
      setNote("Notifications are on for this device.");
      startRefresh(() => router.refresh());
    } catch {
      setProblem("Could not turn notifications on for this device.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setProblem(null);
    setNote(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await unsubscribePush(endpoint);
      }
      setEnabledHere(false);
      setNote("Notifications are off for this device.");
      startRefresh(() => router.refresh());
    } catch {
      setProblem("Could not turn notifications off.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setProblem(null);
    setNote(null);
    try {
      const res = await sendTestPush();
      if (res.ok) setNote("Test sent. It should appear in a few seconds.");
      else setProblem(res.message);
    } catch {
      setProblem("Could not send the test.");
    } finally {
      setBusy(false);
    }
  }

  async function clearDevice() {
    if (!window.confirm("Remove saved pages and any entries not yet synced from this device?")) return;
    await clearOfflineCaches();
    try {
      localStorage.removeItem(LAST_WARM_KEY);
    } catch {
      /* ignore */
    }
    setNote("Offline data removed from this device.");
  }

  return (
    <div className="card stack" data-testid="notification-settings">
      <h3>Push notifications</h3>
      {!publicKey ? (
        <p className="muted">Push notifications are not set up on this server yet.</p>
      ) : !supported ? (
        <p className="muted">
          This browser cannot receive push notifications. On iPhone or iPad, tap Share → Add to Home Screen, open the app from
          the Home Screen, then come back here.
        </p>
      ) : (
        <div className="row">
          {enabledHere ? (
            <>
              <button className="btn ghost" type="button" disabled={busy} data-testid="push-disable" onClick={() => void disable()}>Turn off on this device</button>
              <button className="btn soft" type="button" disabled={busy} data-testid="push-test" onClick={() => void test()}>Send test notification</button>
            </>
          ) : (
            <button className="btn" type="button" disabled={busy || permission === "denied"} data-testid="push-enable" onClick={() => void enable()}>Turn on for this device</button>
          )}
        </div>
      )}
      {permission === "denied" && <p className="muted">Notifications are blocked in this browser’s settings.</p>}
      {note && <p role="status" className="notice">{note}</p>}
      {problem && <p role="alert" className="error">{problem}</p>}

      <ActionForm action={setNotifyPrefs} testId="set-notify-prefs" submitLabel="Save alert choices" className="stack">
        <div className="row">
          <label>Budget alerts (80% used, and over budget)
            <select name="budget" defaultValue={notifyBudget ? "1" : "0"}>
              <option value="1">On</option>
              <option value="0">Off</option>
            </select>
          </label>
          <label>Renewal reminders (2 days before)
            <select name="renewals" defaultValue={notifyRenewals ? "1" : "0"}>
              <option value="1">On</option>
              <option value="0">Off</option>
            </select>
          </label>
        </div>
      </ActionForm>
      <p className="muted">Notifications never show amounts, so nothing private appears on a locked screen.</p>

      <h3>Offline use</h3>
      <p className="muted">
        Pages you have opened stay available without a connection, and expenses or income you add offline are sent
        automatically when you are back online. To install the app, use your browser’s “Install app” or, on iPhone, Share →
        Add to Home Screen.
      </p>
      <div className="row">
        <button className="btn ghost" type="button" data-testid="clear-offline" onClick={() => void clearDevice()}>Clear offline data on this device</button>
      </div>
    </div>
  );
}
