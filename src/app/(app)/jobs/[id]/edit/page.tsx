import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { JobFields } from "@/components/JobFields";
import { updateJob } from "@/actions/jobs";
import { clientOptions, getJob } from "@/lib/job-queries";
import { getUserPrefs } from "@/lib/preferences";
import { uuid } from "@/lib/validation";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const prefs = await getUserPrefs();
  if (prefs.workMode === "SALARIED") notFound();
  const [job, options] = await Promise.all([getJob(id), clientOptions()]);
  if (!job) notFound();
  // An archived client is not offered for new jobs, but this job's own client must stay selectable.
  const clients = options.some((c) => c.id === job.client.id) ? options : [{ id: job.client.id, name: job.client.name }, ...options];

  return (
    <>
      <div className="page-head"><h1>Edit job</h1></div>
      <ActionForm action={updateJob} testId="update-job" submitLabel="Save changes" className="card stack" successHref={`/jobs/${job.id}`}>
        <input type="hidden" name="id" value={job.id} />
        <JobFields
          clients={clients}
          d={{ ...job, eventDate: job.eventDate.toISOString().slice(0, 10) }}
        />
      </ActionForm>
      <p><Link href={`/jobs/${job.id}`}>Cancel</Link></p>
    </>
  );
}
