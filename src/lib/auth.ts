import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { env, isEmailEnabled } from "@/env";

// Cookies are Secure exactly when the site is served over https (always true when deployed).
const useSecureCookies = env.BETTER_AUTH_URL.startsWith("https://");

/**
 * Send mail after the response is returned so response time does not reveal whether an
 * account exists (user enumeration via timing). Failures are logged without any PII.
 */
function queueEmail(job: () => Promise<void>) {
  const run = async () => {
    try {
      await job();
    } catch {
      console.error("[email-error] failed to send transactional email");
    }
  };
  try {
    after(run);
  } catch {
    void run(); // outside a request scope (e.g. scripts)
  }
}

type MailArgs = { user: { email: string }; url: string };

const sendResetPassword = async ({ user, url }: MailArgs) => {
  queueEmail(() =>
    sendEmail({
      to: user.email,
      subject: "Reset your Expense Tracker password",
      text:
        `Use this link to choose a new password (valid for 15 minutes, single use):\n\n${url}\n\n` +
        `If you did not ask for this, you can ignore this email; your password has not changed.`,
    }),
  );
};

const sendVerificationEmail = async ({ user, url }: MailArgs) => {
  queueEmail(() =>
    sendEmail({
      to: user.email,
      subject: "Verify your Expense Tracker email",
      text:
        `Confirm your email address by opening this link (valid for 1 hour):\n\n${url}\n\n` +
        `If you did not create an account, you can ignore this email.`,
    }),
  );
};

export const auth = betterAuth({
  appName: "Expense Tracker",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // Server-side switch: when false, the sign-up endpoint itself rejects registrations.
    disableSignUp: !env.SIGNUPS_ENABLED,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    // Passwords are hashed by Better Auth (scrypt) – never stored or logged in plaintext.
    requireEmailVerification: isEmailEnabled, // no session until verified (only with email on)
    autoSignIn: !isEmailEnabled,
    resetPasswordTokenExpiresIn: 60 * 15, // reset links live 15 minutes
    revokeSessionsOnPasswordReset: true, // a reset signs out every other device
    // With no mail provider there is no reset function, so the endpoint stays disabled.
    sendResetPassword: isEmailEnabled ? sendResetPassword : undefined,
  },
  emailVerification: {
    sendOnSignUp: isEmailEnabled,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60, // verification links live 1 hour
    sendVerificationEmail: isEmailEnabled ? sendVerificationEmail : undefined,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
    cookieCache: { enabled: false }, // always validate against the DB
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 3600, max: 5 },
      "/forget-password": { window: 3600, max: 3 },
      "/request-password-reset": { window: 3600, max: 3 },
      "/reset-password": { window: 3600, max: 5 },
      "/send-verification-email": { window: 3600, max: 3 },
      "/verify-email": { window: 3600, max: 20 },
      "/change-password": { window: 3600, max: 5 },
    },
  },
  advanced: {
    useSecureCookies,
    defaultCookieAttributes: {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: "lax",
    },
    ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
  },
  plugins: [nextCookies()], // must be last
});
