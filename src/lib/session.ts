import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { unauthorized } from "@/lib/errors";

/**
 * Zero-trust: every mutation and private read calls this first.
 * The userId ALWAYS comes from the server-validated session, never the client.
 */
export async function requireSession(): Promise<{ userId: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw unauthorized();
  return { userId: session.user.id };
}
