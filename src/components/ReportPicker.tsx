"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Opt = { id: string; label: string };

/** Period / Client / Job report switcher. The two dropdown buttons open a list; choosing one shows that report. */
export function ReportPicker({
  clients,
  jobs,
  client,
  job,
}: {
  clients: Opt[];
  jobs: Opt[];
  client?: string;
  job?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<"client" | "job" | null>(null);
  const period = !client && !job;

  function pick(kind: "client" | "job", id: string) {
    if (!id) return;
    setOpen(null);
    router.push(`/reports?${kind}=${encodeURIComponent(id)}`);
  }

  const toggle = (k: "client" | "job") => setOpen((cur) => (cur === k ? null : k));

  return (
    <div className="picker" data-testid="report-picker">
      <div className="picker-bar">
        <Link className={`btn ghost${period ? " is-on" : ""}`} href="/reports" aria-pressed={period} data-testid="picker-period-btn">
          Period report
        </Link>
        <button
          type="button"
          className={`btn ghost${client ? " is-on" : ""}`}
          aria-expanded={open === "client"}
          aria-pressed={Boolean(client)}
          aria-controls="picker-client"
          onClick={() => toggle("client")}
          data-testid="picker-client-btn"
        >
          Client report <span className="caret" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`btn ghost${job ? " is-on" : ""}`}
          aria-expanded={open === "job"}
          aria-pressed={Boolean(job)}
          aria-controls="picker-job"
          onClick={() => toggle("job")}
          data-testid="picker-job-btn"
        >
          Job report <span className="caret" aria-hidden="true" />
        </button>
      </div>

      {open === "client" && (
        <div className="picker-panel" id="picker-client">
          <label>
            <span className="sr-only">Choose a client</span>
            <select value={client ?? ""} onChange={(e) => pick("client", e.target.value)} data-testid="picker-client-select" autoFocus>
              <option value="">{clients.length === 0 ? "No clients yet" : "Choose a client…"}</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        </div>
      )}
      {open === "job" && (
        <div className="picker-panel" id="picker-job">
          <label>
            <span className="sr-only">Choose a job</span>
            <select value={job ?? ""} onChange={(e) => pick("job", e.target.value)} data-testid="picker-job-select" autoFocus>
              <option value="">{jobs.length === 0 ? "No jobs yet" : "Choose a job…"}</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
