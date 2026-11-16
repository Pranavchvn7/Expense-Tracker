import "server-only";
import { env } from "@/env";

/**
 * Plain-text transactional email via Resend's HTTP API (no extra dependency).
 * Text-only on purpose: no HTML means no HTML injection through user-supplied names.
 * Only called when isEmailEnabled is true. Swap this one function to change provider.
 */
export async function sendEmail(input: { to: string; subject: string; text: string }) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error("email provider not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
    signal: AbortSignal.timeout(8000), // never hold a serverless function open
  });
  if (!res.ok) {
    // Status only: never log the recipient, body or API response.
    throw new Error(`email send failed (${res.status})`);
  }
}
