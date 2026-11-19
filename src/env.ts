import "server-only";
import { z } from "zod";

// The app refuses to start if a critical variable is missing or weak.
// No hardcoded or mock fallback secrets.

// Treat an empty value (e.g. `RESEND_API_KEY=""` copied from .env.example) as "not set".
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

// Trim spaces and trailing slashes so a copy-paste slip cannot break a deployment.
// The scheme (https://) must still be written out explicitly.
const normalizeOrigin = (v: unknown) =>
  typeof v === "string" ? blankToUndefined(v.trim().replace(/\/+$/, "")) : v;

const schema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgres"),
  DIRECT_URL: z.string().url().startsWith("postgres").optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.preprocess(
    normalizeOrigin,
    z
      .string({ required_error: "is missing or empty for this environment" })
      .url("must be a full URL such as https://your-app.vercel.app")
      .refine((u) => /^https?:\/\//i.test(u), "must start with https://"),
  ),
  // Optional transactional email (Resend). Set BOTH to turn on email verification and
  // password reset by email; leave both empty to run without email.
  RESEND_API_KEY: z.preprocess(blankToUndefined, z.string().min(10).optional()),
  EMAIL_FROM: z.preprocess(blankToUndefined, z.string().min(5).max(200).optional()),
  // Set to "false" once everyone who needs an account has registered.
  // Forgiving about case and spaces ("True", " false ") so a typo in Vercel cannot stop a build.
  SIGNUPS_ENABLED: z
    .preprocess(
      (v) => (typeof v === "string" ? blankToUndefined(v.trim().toLowerCase()) : v),
      z.enum(["true", "false"]).default("true"),
    )
    .transform((v) => v === "true"),
  // "staging" shows a visible banner on every page so staging is never mistaken for production.
  APP_ENV: z.preprocess(
    (v) => (typeof v === "string" ? blankToUndefined(v.trim().toLowerCase()) : v),
    z.enum(["production", "staging"]).default("production"),
  ),
  // OPTIONAL push notifications. Generate the pair once with: npx web-push generate-vapid-keys
  // Set all three VAPID values, or none. The subject is a mailto: or https: contact for push services.
  VAPID_PUBLIC_KEY: z.preprocess(blankToUndefined, z.string().min(60).max(120).optional()),
  VAPID_PRIVATE_KEY: z.preprocess(blankToUndefined, z.string().min(30).max(80).optional()),
  VAPID_SUBJECT: z.preprocess(blankToUndefined, z.string().max(200).regex(/^(mailto:|https:\/\/)/, "must start with mailto: or https://").optional()),
  // Protects the daily reminder job. Vercel Cron sends it automatically as a Bearer token.
  CRON_SECRET: z.preprocess(blankToUndefined, z.string().min(24).optional()),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Say WHAT is wrong with each variable, but never print a value. Zod's enum message quotes
  // the received value, so that one case gets a fixed text.
  const problems = parsed.error.issues
    .map((i) => {
      const reason = i.code === "invalid_enum_value" ? "is not an allowed value" : i.message;
      return `${i.path.join(".")} (${reason})`;
    })
    .join("; ");
  throw new Error(`Invalid environment configuration: ${problems}`);
}

export const env = parsed.data;

if (Boolean(env.RESEND_API_KEY) !== Boolean(env.EMAIL_FROM)) {
  // Names only, never values.
  throw new Error(
    `Set both RESEND_API_KEY and EMAIL_FROM, or neither (RESEND_API_KEY is ${
      env.RESEND_API_KEY ? "set" : "missing"
    }, EMAIL_FROM is ${env.EMAIL_FROM ? "set" : "missing"})`,
  );
}

const vapidCount = [env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT].filter(Boolean).length;
if (vapidCount !== 0 && vapidCount !== 3) {
  throw new Error("Set all of VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT, or none of them");
}
/** True only when push notifications are fully configured. */
export const isPushEnabled = vapidCount === 3;

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

// Deployment guards. Only active on Vercel, where VERCEL_ENV is set ("production" | "preview"),
// so local builds are unaffected. They make mixing up staging and production fail loudly at
// build time, even if someone picks the wrong option in Vercel's Redeploy dialog.
const vercelEnv = process.env.VERCEL_ENV;
const gitBranch = process.env.VERCEL_GIT_COMMIT_REF;
if (vercelEnv === "production") {
  if (env.APP_ENV === "staging") {
    throw new Error("APP_ENV=staging on a production deployment: wrong variables for this environment");
  }
  // Skipped if Vercel does not expose the branch name; then vercel.json is the only branch gate.
  if (gitBranch && gitBranch !== "main") {
    throw new Error("Production deployments must be built from the main branch");
  }
}
if (vercelEnv === "preview" && env.APP_ENV !== "staging") {
  throw new Error("Preview deployments must set APP_ENV=staging (are production variables in use?)");
}
