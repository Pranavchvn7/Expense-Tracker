import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError } from "@/lib/errors";
import { toCsv } from "@/lib/csv";
import { STATUS_LABEL } from "@/lib/job-math";


export const dynamic = "force-dynamic";

const money = (minor: number) => (minor / 100).toFixed(2);

/** GET /jobs/export: the signed-in user's jobs with agreed, received and balance (their own rows only, bounded). */
export async function GET() {
  try {
    const { userId } = await requireSession();
    await rateLimit(`export:${userId}`, 10, 3600);
    const rows = await prisma.job.findMany({
      where: { userId },
      orderBy: [{ eventDate: "desc" }, { id: "asc" }],
      take: 5000,
      select: {
        title: true, serviceType: true, eventDate: true, startTime: true, location: true, status: true,
        agreedAmountMinor: true, currency: true,
        client: { select: { name: true } },
        payments: { select: { amountMinor: true } },
      },
    });
    const csv = toCsv([
      ["Date", "Start", "Job", "Client", "Service", "Location", "Status", "Currency", "Agreed", "Received", "Balance"],
      ...rows.map((r) => {
        const received = r.payments.reduce((n, p) => n + p.amountMinor, 0);
        const balance = r.status === "CANCELLED" ? 0 : Math.max(0, r.agreedAmountMinor - received);
        return [
          r.eventDate.toISOString().slice(0, 10), r.startTime ?? "", r.title, r.client.name, r.serviceType ?? "", r.location ?? "",
          STATUS_LABEL[r.status], r.currency, money(r.agreedAmountMinor), money(received), money(balance),
        ];
      }),
    ]);
    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="jobs-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof HttpError) return new Response(err.message, { status: err.status });
    console.error("[export-error]", err instanceof Error ? err.name : "unknown");
    return new Response("Something went wrong", { status: 500 });
  }
}
