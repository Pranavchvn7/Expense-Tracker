import path from "node:path";
import dotenv from "dotenv";

// Load e2e/.env for local runs. In CI the same names come from GitHub secrets/variables instead.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export type E2EEnv = {
  baseUrl: string;
  userEmail: string;
  userPassword: string;
  vercelBypassSecret: string | null;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Copy e2e/.env.example to e2e/.env and fill it in (or set it as a CI secret).`);
  }
  return value;
}

/**
 * Reads and validates settings once. Fails fast with a clear message, and refuses to run
 * against any host listed in E2E_BLOCK_HOSTS (put your Production host there) so a typo in
 * E2E_BASE_URL can never make the tests create and delete data in the real app.
 */
export function loadEnv(): E2EEnv {
  const baseUrl = required("E2E_BASE_URL").replace(/\/+$/, "");
  let host: string;
  try {
    host = new URL(baseUrl).hostname.toLowerCase();
  } catch {
    throw new Error(`E2E_BASE_URL is not a valid URL: ${baseUrl}`);
  }
  const blocked = (process.env.E2E_BLOCK_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (blocked.includes(host)) {
    throw new Error(`Refusing to run: ${host} is in E2E_BLOCK_HOSTS (it looks like Production). Point E2E_BASE_URL at Staging.`);
  }
  return {
    baseUrl,
    userEmail: required("E2E_USER_EMAIL"),
    userPassword: required("E2E_USER_PASSWORD"),
    vercelBypassSecret: process.env.VERCEL_BYPASS_SECRET?.trim() || null,
  };
}
