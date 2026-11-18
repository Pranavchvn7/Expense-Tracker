import "server-only";
import { prisma } from "@/lib/db";
import { tooMany } from "@/lib/errors";

/**
 * Fixed-window limiter backed by Postgres (works on serverless, no extra service).
 * Single atomic upsert using a parameterized tagged template – no string concat.
 * Throws 429 when the limit is exceeded.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const rows = await prisma.$queryRaw<{ count: number; retryAfter: number }[]>`
    INSERT INTO "ActionLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "ActionLimit"."windowStart" < NOW() - (${windowSeconds} * INTERVAL '1 second') THEN 1
        ELSE "ActionLimit"."count" + 1 END,
      "windowStart" = CASE
        WHEN "ActionLimit"."windowStart" < NOW() - (${windowSeconds} * INTERVAL '1 second') THEN NOW()
        ELSE "ActionLimit"."windowStart" END
    RETURNING "count",
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("windowStart" + (${windowSeconds} * INTERVAL '1 second') - NOW()))))::int AS "retryAfter"
  `;
  const count = rows[0]?.count ?? 1;
  if (count > limit) throw tooMany(rows[0]?.retryAfter);
}
