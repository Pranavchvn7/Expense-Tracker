"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { notFound, safely, type ActionResult } from "@/lib/errors";
import { formToObject, profileInput } from "@/lib/validation";

/**
 * Non-sensitive profile settings: display name, country and timezone. Email and password
 * are deliberately not editable here. The user id comes from the session, never the form.
 */
export async function updateProfile(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`profile:update:${userId}`, 20, 60);
    const input = profileInput.parse(formToObject(fd));
    const res = await prisma.user.updateMany({
      where: { id: userId },
      data: { name: input.name, country: input.country ?? null, timezone: input.timezone ?? null },
    });
    if (res.count !== 1) throw notFound();
    revalidatePath("/", "layout");
    return undefined;
  });
}
