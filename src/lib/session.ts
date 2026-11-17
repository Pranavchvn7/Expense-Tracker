import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { unauthorized } from "@/lib/errors";

/**
 * One session lookup per request. React's cache() shares the result between the layout,
 * the page and every query in the same render, so a page no longer pays for 5-6 identical
 * database round-trips. It is request-scoped: nothing is shared between users or requests.
 */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/**
 * Zero-trust: every mutation and private read calls this first.
 * The userId ALWAYS comes from the server-validated session, never from the client.
 * sessionId is the current session's row id (used to tell "this device" from the others).
 */
export async function requireSession(): Promise<{ userId: string; sessionId: string }> {
  const session = await getSession();
  if (!session?.user?.id || !session.session?.id) throw unauthorized();
  return { userId: session.user.id, sessionId: session.session.id };
}
