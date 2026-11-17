"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { notFound, safely, type ActionResult } from "@/lib/errors";
import { currencyInput, formToObject } from "@/lib/validation";

/** The one place the currency is chosen. Applies to new expenses, income and budgets. */
export async function setCurrency(fd: FormData): Promise<ActionResult> {
  return safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`pref:currency:${userId}`, 10, 60);
    const { currency } = currencyInput.parse(formToObject(fd));
    // id comes from the session, never the form.
    const res = await prisma.user.updateMany({ where: { id: userId }, data: { currency } });
    if (res.count !== 1) throw notFound();
    revalidatePath("/", "layout");
    return undefined;
  });
}
