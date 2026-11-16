"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { sessionRef } from "@/lib/session-ref";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError, notFound, safely, type ActionResult } from "@/lib/errors";
import { formToObject, sessionRefInput } from "@/lib/validation";

/** Sign out one other device. The row is looked up among the caller's OWN sessions only. */
export async function revokeSession(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId, sessionId } = await requireSession();
    await rateLimit(`session:revoke:${userId}`, 30, 60);
    const { ref } = sessionRefInput.parse(formToObject(fd));

    const own = await prisma.session.findMany({
      where: { userId },
      select: { id: true },
      take: 100,
    });
    const match = own.find((s) => sessionRef(s.id) === ref);
    if (!match) throw notFound();
    if (match.id === sessionId) throw new HttpError(400, "Use Sign out for this device");

    await prisma.session.deleteMany({ where: { id: match.id, userId } });
    revalidatePath("/settings");
    return undefined;
  });
}

/** Sign out every device except the current one. */
export async function revokeOtherSessions(): Promise<ActionResult> {
  return safely(async () => {
    const { userId, sessionId } = await requireSession();
    await rateLimit(`session:revoke-others:${userId}`, 10, 60);
    await prisma.session.deleteMany({ where: { userId, id: { not: sessionId } } });
    revalidatePath("/settings");
    return undefined;
  });
}
