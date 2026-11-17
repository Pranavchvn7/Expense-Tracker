import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicReport } from "@/lib/queries";
import { formatMoney, monthLabel } from "@/lib/money";
import { uuid } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Shared summary",
  robots: { index: false, follow: false },
};

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Validate shape before touching the DB; identical 404 for every failure mode.
  if (!uuid.safeParse(id).success) notFound();
  const report = await getPublicReport(id);
  if (!report) notFound();

  return (
    <main className="plain">
      <h1>Summary for {monthLabel(report.month)}</h1>
      <div className="card">
        <table>
          <thead><tr><th>Category</th><th className="num">Total</th></tr></thead>
          <tbody>
            {report.lines.map((l) => (
              <tr key={`${l.category}-${l.currency}`}>
                <td>{l.category}</td>
                <td className="num">{formatMoney(l.totalMinor, l.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
