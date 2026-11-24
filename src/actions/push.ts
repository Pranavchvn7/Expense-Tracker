"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError, safely, type ActionResult, limitReached } from "@/lib/errors";
import { isPushEnabled } from "@/env";
import { sendPushToUser } from "@/lib/push";
import { isAllowedPushEndpoint, isValidPushKeys } from "@/lib/push-validate";
import { formToObject } from "@/lib/validation";

const MAX_DEVICES = 10;

const subscription = z.object({
  endpoint: z.string().refine(isAllowedPushEndpoint, "is not a supported push service address"),
  keys: z.object({ p256dh: z.string(), auth: z.string() }).refine((k) => isValidPushKeys(k.p256dh, k.auth), "are not valid"),
});

/** Remember this device for push notifications. Everything comes from the browser, so it is checked. */
export async function subscribePush(raw: unknown): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    if (!isPushEnabled) throw new HttpError(400, "Push notifications are not set up on this server yet.");
    await rateLimit(`push:subscribe:${userId}`, 10, 60);
    const sub = subscription.parse(raw);

    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint: sub.endpoint }, select: { userId: true } });
    if (!existing || existing.userId !== userId) {
      if ((await prisma.pushSubscription.count({ where: { userId } })) >= MAX_DEVICES) throw limitReached("notification devices", MAX_DEVICES);
    }
    const ua = (await headers()).get("user-agent")?.replace(/[\u0000-\u001f]/g, "").slice(0, 200) ?? null;
    // A device belongs to whoever enabled it last, so a shared computer never keeps sending the
    // previous person's alerts.
    await prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: ua },
      update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: ua },
      select: { id: true },
    });
    revalidatePath("/settings");
    return undefined;
  });
}

export async function unsubscribePush(endpoint: unknown): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`push:unsubscribe:${userId}`, 30, 60);
    const ep = z.string().max(1000).parse(endpoint);
    await prisma.pushSubscription.deleteMany({ where: { endpoint: ep, userId } });
    revalidatePath("/settings");
    return undefined;
  });
}

const prefs = z.object({ budget: z.enum(["0", "1"]), renewals: z.enum(["0", "1"]), jobs: z.enum(["0", "1"]).optional() });

export async function setNotifyPrefs(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`push:prefs:${userId}`, 30, 60);
    const input = prefs.parse(formToObject(fd));
    await prisma.user.update({
      where: { id: userId },
      data: {
        notifyBudget: input.budget === "1",
        notifyRenewals: input.renewals === "1",
        // Only sent by the form for freelance accounts; otherwise the saved choice is left alone.
        ...(input.jobs ? { notifyJobs: input.jobs === "1" } : {}),
      },
      select: { id: true },
    });
    revalidatePath("/settings");
    return undefined;
  });
}

export async function sendTestPush(): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    if (!isPushEnabled) throw new HttpError(400, "Push notifications are not set up on this server yet.");
    await rateLimit(`push:test:${userId}`, 5, 3600);
    const sent = await sendPushToUser(userId, { title: "Test notification", body: "Notifications are working on this device.", url: "/settings", tag: "test" });
    if (sent === 0) throw new HttpError(400, "No device could be reached. Turn notifications on for this device first, then try again.");
    return undefined;
  });
}
