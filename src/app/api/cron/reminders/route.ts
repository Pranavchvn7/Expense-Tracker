import { timingSafeEqual } from "node:crypto";
import { env, isPushEnabled } from "@/env";
import { runRenewalReminders } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(req: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) return false;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Vercel Cron calls this once a day with the CRON_SECRET as a Bearer token. */
export async function GET(req: Request) {
  // Same answer whether the secret is missing, wrong or not configured: nothing to learn.
  if (!authorised(req)) return new Response("Unauthorized", { status: 401 });
  if (!isPushEnabled) return new Response(null, { status: 204 });
  try {
    const result = await runRenewalReminders();
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[cron-reminders-error]", err instanceof Error ? err.name : "unknown");
    return new Response("Failed", { status: 500 });
  }
}
