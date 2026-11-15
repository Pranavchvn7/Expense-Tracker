import "server-only";
import { z } from "zod";

// The app refuses to start if a critical variable is missing or weak.
// No hardcoded or mock fallback secrets.
const schema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgres"),
  DIRECT_URL: z.string().url().startsWith("postgres").optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().refine((u) => !u.endsWith("/"), "no trailing slash"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Log only the variable names, never values.
  const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
  throw new Error(`Invalid environment configuration: ${names}`);
}

export const env = parsed.data;

if (env.NODE_ENV === "production") {
  if (!env.BETTER_AUTH_URL.startsWith("https://")) {
    throw new Error("BETTER_AUTH_URL must be https in production");
  }
  if (!/sslmode=require|sslmode=verify-full/.test(env.DATABASE_URL)) {
    throw new Error("DATABASE_URL must enforce TLS (sslmode=require) in production");
  }
}
