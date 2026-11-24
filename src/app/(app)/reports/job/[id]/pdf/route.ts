import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError, notFound } from "@/lib/errors";
import { getUserPrefs, getUserToday } from "@/lib/preferences";
import { jobReport } from "@/lib/freelance-queries";
import { buildTablePdf } from "@/lib/report-pdf";
import { formatDay, STATUS_LABEL, timeRangeLabel } from "@/lib/job-math";
import { COST_LABEL, KIND_LABEL } from "@/lib/pay-math";
import { uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const num = (minor: number) =>
  `${minor < 0 ? "-" : ""}${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(minor) / 100)}`;

/** GET /reports/job/<id>/pdf */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireSession();
    await rateLimit(`report:pdf:${userId}`, 10, 60);
    const id = uuid.safeParse((await ctx.params).id);
    if (!id.success) throw notFound();
    if ((await getUserPrefs()).workMode === "SALARIED") throw notFound();
    const r = await jobReport(id.data);
    if (!r) throw notFound();
    const today = await getUserToday();
    const j = r.job;
    const when = timeRangeLabel(j.startTime, j.endTime);
    const bytes = await buildTablePdf({
      title: "Job report",
      subtitle: `${j.title} - ${j.client.name}`,
      note: `Amounts in ${j.currency}`,
      generatedOn: today.iso,
      summary: [
        ["Event date", `${formatDay(j.eventDate)}${when ? ` (${when})` : ""}`],
        ["Status", STATUS_LABEL[j.status]],
        ["Service", j.serviceType ?? "-"],
        ["Location", j.location ?? "-"],
        ["Agreed amount", j.agreedAmountMinor > 0 ? num(j.agreedAmountMinor) : "Not agreed"],
        ["Received", num(r.receivedMinor)],
        [r.pay.state === "over" ? "Overpaid by" : "Balance due", num(r.pay.state === "over" ? r.pay.overMinor : r.pay.balanceMinor)],
        ["Job costs", num(r.costsMinor)],
        ["Profit (received minus costs)", num(r.profitMinor)],
      ],
      tables: [
        {
          heading: "Payments received",
          cols: [{ label: "Date", w: 70 }, { label: "Type", w: 120 }, { label: "Note", w: 210 }, { label: "Amount", w: 99, align: "right" }],
          rows: r.payments.map((p) => [p.receivedOn.toISOString().slice(0, 10), p.paymentKind ? KIND_LABEL[p.paymentKind] : "Payment", p.note ?? "", num(p.amountMinor)]),
        },
        {
          heading: "Job costs",
          cols: [{ label: "Date", w: 70 }, { label: "Type", w: 120 }, { label: "Description", w: 210 }, { label: "Amount", w: 99, align: "right" }],
          rows: r.costs.map((c) => [c.spentOn.toISOString().slice(0, 10), c.costKind ? COST_LABEL[c.costKind] : "Cost", c.payee ? `${c.description} (${c.payee})` : c.description, num(c.amountMinor)]),
        },
      ],
    });
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="job-report-${today.iso}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (err instanceof HttpError) return new Response(err.message, { status: err.status });
    console.error("[job-report-pdf-error]", err instanceof Error ? err.name : "unknown");
    return new Response("The report could not be created. Please try again.", { status: 500 });
  }
}
