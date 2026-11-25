import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { HttpError } from "@/lib/errors";
import { toCsv } from "@/lib/csv";


export const dynamic = "force-dynamic";

/** GET /clients/export: the signed-in user's clients as CSV (their own rows only, bounded). */
export async function GET() {
  try {
    const { userId } = await requireSession();
    await rateLimit(`export:${userId}`, 10, 3600);
    const rows = await prisma.client.findMany({
      where: { userId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 5000,
      select: { name: true, phone: true, email: true, city: true, address: true, source: true, notes: true, archived: true },
    });
    const csv = toCsv([
      ["Name", "Phone", "Email", "City", "Address", "Source", "Notes", "Archived"],
      ...rows.map((r) => [r.name, r.phone ?? "", r.email ?? "", r.city ?? "", r.address ?? "", r.source ?? "", r.notes ?? "", r.archived ? "yes" : "no"]),
    ]);
    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    if (err instanceof HttpError) return new Response(err.message, { status: err.status });
    console.error("[export-error]", err instanceof Error ? err.name : "unknown");
    return new Response("Something went wrong", { status: 500 });
  }
}
