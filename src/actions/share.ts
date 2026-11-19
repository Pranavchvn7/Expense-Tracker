"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError, notFound, safely, type ActionResult, limitReached } from "@/lib/errors";
import { formToObject, idInput, shareInput } from "@/lib/validation";

const MAX_ACTIVE_SHARES = 10;

/** Creates an opt-in, expiring, read-only summary link (UUIDv4 id, never sequential). */
export async function createShare(fd: FormData): Promise<ActionResult<{ id: string }>> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`share:create:${userId}`, 10, 3600);
    const { month, days } = shareInput.parse(formToObject(fd));

    const active = await prisma.sharedReport.count({
      where: { userId, isPublic: true, expiresAt: { gt: new Date() } },
    });
    if (active >= MAX_ACTIVE_SHARES) throw limitReached("active share links", MAX_ACTIVE_SHARES);

    const share = await prisma.sharedReport.create({
      data: { userId, month, expiresAt: new Date(Date.now() + days * 86_400_000) },
      select: { id: true },
    });
    revalidatePath("/settings");
    return share;
  });
}

export async function revokeShare(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`share:revoke:${userId}`, 30, 60);
    const { id } = idInput.parse(formToObject(fd));
    const res = await prisma.sharedReport.deleteMany({ where: { id, userId } });
    if (res.count !== 1) throw notFound();
    revalidatePath("/settings");
    return undefined;
  });
}
