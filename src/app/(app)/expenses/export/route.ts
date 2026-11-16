import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError } from "@/lib/errors";
import { monthRange } from "@/lib/queries";
import { currentMonth } from "@/lib/money";
import { monthSchema } from "@/lib/validation";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const MAX_ROWS = 20_000; // bounded work: the request must finish well inside a serverless timeout

/** GET /expenses/export?month=YYYY-MM   or   /expenses/export?all=1 (most recent 20,000). */
export async function GET(req: Request) {
  try {
    const { userId } = await requireSession();
    await rateLimit(`export:${userId}`, 10, 3600);

    const params = new URL(req.url).searchParams;
    const all = params.get("all") === "1";
    const month = monthSchema.safeParse(params.get("month") ?? currentMonth());
    if (!all && !month.success) return new Response("Bad request", { status: 400 });

    // userId is always in the filter: only the caller's own rows can ever be exported.
    const where: Prisma.ExpenseWhereInput = { userId };
    if (!all && month.success) {
      const { start, end } = monthRange(month.data);
      where.spentOn = { gte: start, lt: end };
    }

    const rows = await prisma.expense.findMany({
      where,
      orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
      take: MAX_ROWS,
      select: {
        spentOn: true,
        description: true,
        amountMinor: true,
        currency: true,
        note: true,
        category: { select: { name: true } },
      },
    });

    const csv = toCsv([
      ["Date", "Description", "Category", "Amount", "Currency", "Note"],
      ...rows.map((r) => [
        r.spentOn.toISOString().slice(0, 10),
        r.description,
        r.category?.name ?? "",
        (r.amountMinor / 100).toFixed(2),
        r.currency,
        r.note ?? "",
      ]),
    ]);

    const name = all ? "all" : month.success ? month.data : "export";
    return new Response(`﻿${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        // The filename is built only from validated input (a YYYY-MM month or "all").
        "Content-Disposition": `attachment; filename="expenses-${name}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof HttpError) return new Response(err.message, { status: err.status });
    console.error("[export-error]", err instanceof Error ? err.name : "unknown");
    return new Response("Something went wrong", { status: 500 });
  }
}
