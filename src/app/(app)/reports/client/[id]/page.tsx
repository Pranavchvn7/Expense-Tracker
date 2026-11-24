import { notFound, redirect } from "next/navigation";
import { uuid } from "@/lib/validation";

/** The report now lives on the Reports page; this keeps old links working. */
export default async function ClientReportRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  redirect(`/reports?client=${id}`);
}
