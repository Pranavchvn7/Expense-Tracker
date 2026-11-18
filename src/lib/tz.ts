// Pure time-zone helpers (Intl only). A user's "today" depends on where they are.

export function isValidTimeZone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Local calendar date in `tz` as YYYY-MM-DD. Falls back to UTC for an invalid zone. */
export function todayIso(tz: string, now = new Date()): string {
  const zone = isValidTimeZone(tz) ? tz : "UTC";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The local calendar date as a UTC-midnight Date (matches Postgres DATE columns). */
export function todayDate(tz: string, now = new Date()): Date {
  return new Date(`${todayIso(tz, now)}T00:00:00Z`);
}

export function currentMonthIn(tz: string, now = new Date()): string {
  return todayIso(tz, now).slice(0, 7);
}

/** Zones to offer in a <select>: the runtime's full list when available, else a short fallback. */
export function listTimeZones(): string[] {
  const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  const all = fn ? fn("timeZone") : [];
  const base = all.length ? all : ["UTC", "Asia/Kolkata", "Europe/London", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];
  // ICU lists some zones under their old names (Asia/Calcutta); show the current ones people expect.
  const renamed: Record<string, string> = { "Asia/Calcutta": "Asia/Kolkata", "Asia/Katmandu": "Asia/Kathmandu", "Asia/Saigon": "Asia/Ho_Chi_Minh", "Europe/Kiev": "Europe/Kyiv" };
  const set = new Set(base.map((z) => renamed[z] ?? z));
  set.add("UTC");
  return [...set].filter(isValidTimeZone).sort();
}
