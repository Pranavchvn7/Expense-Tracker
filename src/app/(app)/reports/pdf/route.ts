import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError } from "@/lib/errors";
import { getUserToday } from "@/lib/preferences";
import { getReport } from "@/lib/report-queries";
import { parseReportQuery, resolveRange } from "@/lib/report-range";
import { buildReportPdf } from "@/lib/report-pdf";
import { paymentLabel } from "@/lib/payment-method";

export const dynamic = "force-dynamic";

/** GET /reports/pdf?period=month&month=2026-04 (or year / custom, plus optional cat=...). */
export async function GET(req: Request) {
  try {
    const { userId } = await requireSession();
    // PDF generation is the heaviest request in the app: keep it to 10 a minute per user.
    await rateLimit(`report:pdf:${userId}`, 10, 60);

    const sp = Object.fromEntries(new URL(req.url).searchParams.entries()) as Record<string, string | string[]>;
    const all = new URL(req.url).searchParams.getAll("cat");
    if (all.length) sp.cat = all;
    const { input, categoryIds, includeNone } = parseReportQuery(sp);
    const today = await getUserToday();
    const { range } = resolveRange(input, today.iso);

    const r = await getReport(range, categoryIds, includeNone);
    const lastShown = range.endIso > today.iso ? today.iso : range.endIso;
    const bytes = await buildReportPdf({
      rangeLabel: range.label,
      currency: r.currency,
      generatedOn: today.iso,
      filtered: r.filtered,
      days: Math.max(1, Math.round((Date.parse(lastShown) - Date.parse(range.startIso)) / 86_400_000) + 1),
      spentMinor: r.spentMinor,
      incomeMinor: r.incomeMinor,
      expenseCount: r.expenseCount,
      categories: r.categories,
      payments: r.payments.map((p) => ({ label: paymentLabel(p.method), value: p.value, count: p.count })),
      months: r.months,
      monthlySpent: r.monthlySpent,
      monthlyIncome: r.monthlyIncome,
      top: r.top,
    });

    // The filename is built only from validated values (range kind and start date).
    const name = `report-${range.kind}-${range.startIso}`;
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (err instanceof HttpError) return new Response(err.message, { status: err.status });
    console.error("[report-pdf-error]", err instanceof Error ? err.name : "unknown");
    return new Response("The report could not be created. Please try again.", { status: 500 });
  }
}
