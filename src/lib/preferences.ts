import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export type Currency = "INR" | "USD" | "EUR" | "GBP";

/**
 * The currency the user chose in Settings. Read from the database for the authenticated user
 * only; the client can never supply it. Cached per request.
 */
export const getUserCurrency = cache(async (): Promise<Currency> => {
  const { userId } = await requireSession();
  const u = await prisma.user.findFirst({ where: { id: userId }, select: { currency: true } });
  const c = u?.currency;
  return c === "USD" || c === "EUR" || c === "GBP" ? c : "INR";
});

export type Theme = "light" | "dark" | "system";

/** Theme cookie is a harmless UI preference; still allowlisted before use. */
export async function getTheme(): Promise<Theme> {
  const v = (await cookies()).get("theme")?.value;
  return v === "light" || v === "dark" ? v : "system";
}
