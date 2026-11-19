import "server-only";
import { ZodError } from "zod";
import { describeIssues } from "@/lib/zod-messages";

/**
 * Errors tell the user WHAT went wrong in plain words, but never HOW the system works:
 * - validation: which field and which rule (never the value that was typed);
 * - limits, rate limits, missing items: the exact cause and what to do;
 * - sign-in problems stay deliberately vague elsewhere (no account enumeration);
 * - unexpected faults: a short apology plus a reference id. Stack traces, SQL, table names
 *   and table ids stay in the server log, which uses the same id.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 429 | 500,
    message: string,
  ) {
    super(message);
  }
}

export const unauthorized = () => new HttpError(401, "Your session has expired. Please sign in again.");
export const forbidden = () => new HttpError(403, "You are not allowed to do that.");
/** Same message whether the item is missing or belongs to someone else (no existence leak). */
export const notFound = () =>
  new HttpError(404, "That item no longer exists. It may have been deleted. Refresh the page and try again.");

export const limitReached = (what: string, max: number) =>
  new HttpError(400, `You have reached the limit of ${max.toLocaleString("en-US")} ${what}. Delete some to add more.`);

export const tooMany = (retryAfterSeconds?: number) => {
  const s = Math.max(1, Math.ceil(retryAfterSeconds ?? 60));
  const wait = s > 90 ? `${Math.ceil(s / 60)} minutes` : `${s} second${s === 1 ? "" : "s"}`;
  return new HttpError(429, `You are doing that too often. Please wait ${wait} and try again.`);
};

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; ref?: string; fieldErrors?: Record<string, string[]> };

function prismaCode(err: unknown): string | null {
  if (typeof err === "object" && err && (err as { name?: string }).name === "PrismaClientKnownRequestError") {
    const c = (err as { code?: unknown }).code;
    return typeof c === "string" ? c : null;
  }
  return null;
}

/** Wrap a server-action body: converts any thrown error to a safe, helpful result. */
export async function safely<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof HttpError) return { ok: false, message: err.message };
    if (err instanceof ZodError) return { ok: false, message: describeIssues(err.issues as never) };

    const code = prismaCode(err);
    if (code === "P2002") {
      return { ok: false, message: "That already exists. Change the name, date or amount and try again." };
    }
    if (code === "P2025") return { ok: false, message: notFound().message };

    const ref = crypto.randomUUID();
    // Server-side only. Never log request bodies, tokens or PII.
    console.error(`[action-error ${ref}]`, err instanceof Error ? err.name : "unknown", code ?? "");
    return {
      ok: false,
      message: "The server hit an unexpected problem and could not finish. Please try again in a moment.",
      ref,
    };
  }
}
