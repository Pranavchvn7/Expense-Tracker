import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { isValidTimeZone, todayDate, todayIso, currentMonthIn } from "@/lib/tz";

export type Currency = "INR" | "USD" | "EUR" | "GBP";

/**
 * The signed-in user's own preferences, read from the database for the session user only
 * (the client can never supply them). One query per request thanks to cache().
 */
export const getUserPrefs = cache(async () => {
  const { userId } = await requireSession();
  const u = await prisma.user.findFirst({
    where: { id: userId },
    select: { currency: true, country: true, timezone: true, name: true },
  });
  const c = u?.currency;
  const currency: Currency = c === "USD" || c === "EUR" || c === "GBP" ? c : "INR";
  const tz = u?.timezone && isValidTimeZone(u.timezone) ? u.timezone : null;
  return {
    currency,
    country: u?.country ?? null,
    name: u?.name ?? "",
    timezone: tz ?? "UTC",
    timezoneSet: tz !== null,
  };
});

export async function getUserCurrency(): Promise<Currency> {
  return (await getUserPrefs()).currency;
}

/** "Today" as the user sees it: YYYY-MM-DD, a UTC-midnight Date, and the current month key. */
export async function getUserToday() {
  const { timezone } = await getUserPrefs();
  return { iso: todayIso(timezone), date: todayDate(timezone), month: currentMonthIn(timezone), timezone };
}

export type Theme = "light" | "dark" | "system";

/** Theme cookie is a harmless UI preference; still allowlisted before use. */
export async function getTheme(): Promise<Theme> {
  const v = (await cookies()).get("theme")?.value;
  return v === "light" || v === "dark" ? v : "system";
}
