import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { ClientFields } from "@/components/ClientFields";
import { updateClient } from "@/actions/clients";
import { getClient } from "@/lib/client-queries";
import { getUserPrefs } from "@/lib/preferences";
import { uuid } from "@/lib/validation";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const prefs = await getUserPrefs();
  if (prefs.workMode === "SALARIED") notFound();
  const client = await getClient(id);
  if (!client) notFound();

  return (
    <>
      <div className="page-head"><h1>Edit client</h1></div>
      <ActionForm
        action={updateClient}
        testId="update-client"
        submitLabel="Save changes"
        className="card stack"
        successHref={`/clients/${client.id}`}
      >
        <input type="hidden" name="id" value={client.id} />
        <ClientFields d={client} />
      </ActionForm>
      <p><Link href={`/clients/${client.id}`}>Cancel</Link></p>
    </>
  );
}
