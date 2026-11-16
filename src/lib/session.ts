import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { unauthorized } from "@/lib/errors";

/**
 * Zero-trust: every mutation and private read calls this first.
 * The userId ALWAYS comes from the server-validated session, never from the client.
 * sessionId is the current session's row id (used to tell "this device" from the others).
 */
export async function requireSession(): Promise<{ userId: string; sessionId: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id || !session.session?.id) throw unauthorized();
  return { userId: session.user.id, sessionId: session.session.id };
}
