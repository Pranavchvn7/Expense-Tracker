import Link from "next/link";
import { JOB_STATUSES, STATUS_LABEL, type JobStatus } from "@/lib/job-math";

type Defaults = {
  clientId?: string;
  title?: string;
  serviceType?: string | null;
  eventDate?: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  status?: JobStatus;
  agreedAmountMinor?: number;
  notes?: string | null;
};

const SERVICES = ["Bridal makeup", "Engagement", "Party makeup", "Photoshoot", "Hair styling", "Other"];

/** The job form fields, shared by "Add a job" and "Edit job". Server component, no state. */
export function JobFields({
  clients,
  d = {},
  defaultDate,
}: {
  clients: { id: string; name: string }[];
  d?: Defaults;
  defaultDate?: string;
}) {
  return (
    <>
      {clients.length === 0 ? (
        <p className="notice" role="note">
          You need a client first. <Link href="/clients?add=1">Add a client</Link>, then come back.
        </p>
      ) : null}
      <div className="row">
        <label>Client
          <select name="clientId" defaultValue={d.clientId ?? ""} required>
            <option value="" disabled>Choose a client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Status
          <select name="status" defaultValue={d.status ?? "BOOKED"}>
            {JOB_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
      </div>
      <div className="row">
        <label>Job title
          <input name="title" maxLength={100} defaultValue={d.title ?? ""} placeholder="Bridal makeup, Priya’s wedding" required autoComplete="off" />
        </label>
        <label>Service (optional)
          <input name="serviceType" maxLength={60} list="job-services" defaultValue={d.serviceType ?? ""} autoComplete="off" />
          <datalist id="job-services">
            {SERVICES.map((s) => <option key={s} value={s} />)}
          </datalist>
        </label>
      </div>
      <div className="row">
        <label>Date
          <input name="eventDate" type="date" defaultValue={d.eventDate ?? defaultDate} min="2000-01-01" required />
        </label>
        <label>Start time (optional)
          <input name="startTime" type="time" defaultValue={d.startTime ?? ""} />
        </label>
        <label>End time (optional)
          <input name="endTime" type="time" defaultValue={d.endTime ?? ""} />
        </label>
      </div>
      <div className="row">
        <label>Location (optional)
          <input name="location" maxLength={200} defaultValue={d.location ?? ""} autoComplete="off" />
        </label>
        <label>Agreed amount (optional)
          <input
            name="agreed"
            inputMode="decimal"
            pattern="\d{1,9}(\.\d{1,2})?"
            placeholder="0.00"
            defaultValue={d.agreedAmountMinor ? (d.agreedAmountMinor / 100).toFixed(2) : ""}
          />
        </label>
      </div>
      <label>Notes (optional)
        <textarea name="notes" maxLength={1000} rows={3} defaultValue={d.notes ?? ""} />
      </label>
    </>
  );
}
