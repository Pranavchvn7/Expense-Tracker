import "server-only";
import webpush from "web-push";
import { env, isPushEnabled } from "@/env";
import { prisma } from "@/lib/db";

export type PushPayload = { title: string; body: string; url: string; tag?: string };

let configured = false;
function configure(): boolean {
  if (!isPushEnabled) return false;
  if (!configured) {
    webpush.setVapidDetails(env.VAPID_SUBJECT as string, env.VAPID_PUBLIC_KEY as string, env.VAPID_PRIVATE_KEY as string);
    configured = true;
  }
  return true;
}

/**
 * Send one notification to every device the user enabled. Returns how many were accepted by the
 * push service. Devices the push service reports as gone (404/410) are removed. Never throws:
 * a failed notification must not break whatever triggered it.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!configure()) return 0;
  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    take: 10,
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 12 * 3600, urgency: "normal", timeout: 8000 },
        );
        sent += 1;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.deleteMany({ where: { id: s.id, userId } });
        } else {
          // Status code only: the error text can contain the endpoint address.
          console.error("[push-error]", code ?? "unknown");
        }
      }
    }),
  );
  return sent;
}
