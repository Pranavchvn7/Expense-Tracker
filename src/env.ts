import "server-only";
import { z } from "zod";

// The app refuses to start if a critical variable is missing or weak.
// No hardcoded or mock fallback secrets.

// Treat an empty value (e.g. `RESEND_API_KEY=""` copied from .env.example) as "not set".
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const schema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgres"),
  DIRECT_URL: z.string().url().startsWith("postgres").optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().refine((u) => !u.endsWith("/"), "no trailing slash"),
  // Optional transactional email (Resend). Set BOTH to turn on email verification and
  // password reset by email; leave both empty to run without email.
  RESEND_API_KEY: z.preprocess(blankToUndefined, z.string().min(10).optional()),
  EMAIL_FROM: z.preprocess(blankToUndefined, z.string().min(5).max(200).optional()),
  // Set to "false" once everyone who needs an account has registered.
  SIGNUPS_ENABLED: z
    .preprocess(blankToUndefined, z.enum(["true", "false"]).default("true"))
    .transform((v) => v === "true"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Log only the variable names, never values.
  const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(`Invalid environment configuration: ${names}`);
}

export const env = parsed.data;

if (Boolean(env.RESEND_API_KEY) !== Boolean(env.EMAIL_FROM)) {
  throw new Error("Set both RESEND_API_KEY and EMAIL_FROM, or neither");
}

/** True only when a mail provider is fully configured. Gates every email-based feature. */
export const isEmailEnabled = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);

// `next build` and `next start` always run with NODE_ENV=production, even on your own
// machine. The deployment guards below therefore apply to every origin EXCEPT a plain
// localhost one, and never when running on Vercel (VERCEL is set there), so a misconfigured
// deployment still fails loudly while `npm run build && npm start` works locally.
const host = new URL(env.BETTER_AUTH_URL).hostname;
const isLocalOrigin = (host === "localhost" || host === "127.0.0.1") && !process.env.VERCEL;

if (env.NODE_ENV === "production" && !isLocalOrigin) {
  if (!env.BETTER_AUTH_URL.startsWith("https://")) {
    throw new Error("BETTER_AUTH_URL must be https in production");
  }
  if (!/sslmode=require|sslmode=verify-full/.test(env.DATABASE_URL)) {
    throw new Error("DATABASE_URL must enforce TLS (sslmode=require) in production");
  }
}
