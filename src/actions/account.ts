"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { safely, type ActionResult } from "@/lib/errors";
import { deleteAccountInput, formToObject } from "@/lib/validation";

/** Permanently deletes the account and all owned data (FK cascades). */
export async function deleteAccount(fd: FormData): Promise<ActionResult> {
  const result = await safely(async () => {
    const { userId } = await requireSession();
    await rateLimit(`account:delete:${userId}`, 3, 3600);
    deleteAccountInput.parse(formToObject(fd));

    // Sessions, accounts, expenses, categories and shares cascade from User.
    await prisma.user.delete({ where: { id: userId }, select: { id: true } });
    await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
    return undefined;
  });
  if (result.ok) redirect("/");
  return result;
}
