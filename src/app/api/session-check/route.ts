import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Used by SessionWatcher. Reveals nothing but whether the caller's session is still valid.
export async function GET() {
  let valid = false;
  try {
    valid = Boolean((await getSession())?.user?.id);
  } catch {
    // Database trouble is not a sign-out: answer 503 so the client ignores it.
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(null, { status: valid ? 204 : 401, headers: { "Cache-Control": "no-store" } });
}
