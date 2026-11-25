import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError, notFound } from "@/lib/errors";
import { getUserPrefs, getUserToday } from "@/lib/preferences";
import { clientReport } from "@/lib/freelance-queries";
import { buildTablePdf } from "@/lib/report-pdf";
import { STATUS_LABEL } from "@/lib/job-math";
import { COST_LABEL, KIND_LABEL } from "@/lib/pay-math";
import { uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const num = (minor: number) =>
  `${minor < 0 ? "-" : ""}${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(minor) / 100)}`;

/** GET /reports/client/<id>/pdf */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireSession();
    await rateLimit(`report:pdf:${userId}`, 10, 60);
    const id = uuid.safeParse((await ctx.params).id);
    if (!id.success) throw notFound();
    if ((await getUserPrefs()).workMode === "SALARIED") throw notFound();
    const r = await clientReport(id.data);
    if (!r) throw notFound();
    const today = await getUserToday();
    const t = r.totals;
    const bytes = await buildTablePdf({
      title: "Client report",
      subtitle: r.client.name,
      note: `Amounts in ${r.currency}`,
      generatedOn: today.iso,
      summary: [
        ["Jobs", String(r.rows.length)],
        ["Agreed (excluding cancelled)", num(t.agreedMinor)],
        ["Received", num(t.receivedMinor)],
        ["Balance due", num(t.balanceMinor)],
        ["Job costs", num(t.costsMinor)],
        ["Profit (received minus costs)", num(t.profitMinor)],
      ],
      tables: [
        {
          heading: "Jobs",
          cols: [
            { label: "Date", w: 60 }, { label: "Job", w: 110 }, { label: "Status", w: 60 },
            { label: "Agreed", w: 67, align: "right" }, { label: "Received", w: 67, align: "right" },
            { label: "Costs", w: 67, align: "right" }, { label: "Profit", w: 68, align: "right" },
          ],
          rows: r.rows.map((j) => [j.eventDate.toISOString().slice(0, 10), j.title, STATUS_LABEL[j.status], num(j.agreedAmountMinor), num(j.receivedMinor), num(j.costsMinor), num(j.profitMinor)]),
        },
        {
          heading: "Payments received",
          cols: [{ label: "Date", w: 70 }, { label: "Job", w: 230 }, { label: "Type", w: 100 }, { label: "Amount", w: 99, align: "right" }],
          rows: r.payments.map((p) => [p.receivedOn.toISOString().slice(0, 10), p.job?.title ?? "", p.paymentKind ? KIND_LABEL[p.paymentKind] : "Payment", num(p.amountMinor)]),
        },
        {
          heading: "Job costs",
          cols: [{ label: "Date", w: 70 }, { label: "Job", w: 140 }, { label: "Cost", w: 190 }, { label: "Amount", w: 99, align: "right" }],
          rows: r.costRows.map((c) => [c.spentOn.toISOString().slice(0, 10), c.job?.title ?? "", c.costKind ? `${COST_LABEL[c.costKind]}: ${c.description}` : c.description, num(c.amountMinor)]),
        },
      ],
    });
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="client-report-${today.iso}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (err instanceof HttpError) return new Response(err.message, { status: err.status });
    console.error("[client-report-pdf-error]", err instanceof Error ? err.name : "unknown");
    return new Response("The report could not be created. Please try again.", { status: 500 });
  }
}
