import "server-only";
import { createHmac } from "node:crypto";
import { env } from "@/env";

/**
 * Opaque, non-reversible handle for a session row. The UI only ever sees this, never the
 * session id or token, and the server re-derives it from the user's OWN sessions to find
 * the row to revoke. Changes if BETTER_AUTH_SECRET is rotated, which is fine (it is only
 * used within one page load).
 */
export function sessionRef(sessionRowId: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`session-ref:${sessionRowId}`)
    .digest("hex")
    .slice(0, 24);
}
