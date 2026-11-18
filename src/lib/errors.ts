import "server-only";
import { ZodError } from "zod";

/**
 * Deliberately uninformative errors. Details go to server logs with a
 * correlation id; the client only ever sees the generic message + id.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 429 | 500,
    message: string,
  ) {
    super(message);
  }
}

export const unauthorized = () => new HttpError(401, "Unauthorized");
export const forbidden = () => new HttpError(403, "Forbidden");
export const notFound = () => new HttpError(404, "Not found");
export const tooMany = () => new HttpError(429, "Too many requests");

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; ref?: string; fieldErrors?: Record<string, string[]> };

/** Wrap a server-action body: converts any thrown error to a safe result. */
export async function safely<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof HttpError) {
      return { ok: false, message: err.message };
    }
    // Bad input is the caller's problem, not a server fault: say so, without echoing values.
    if (err instanceof ZodError) {
      return { ok: false, message: "Please check your input and try again" };
    }
    const ref = crypto.randomUUID();
    // Server-side only. Never log request bodies, tokens or PII.
    console.error(`[action-error ${ref}]`, err instanceof Error ? err.name : "unknown");
    return { ok: false, message: "Something went wrong", ref };
  }
}
