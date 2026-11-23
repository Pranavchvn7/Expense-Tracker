import Link from "next/link";
import { IconInbox } from "@/components/icons";

/** Shown on freelance pages for accounts set to Salaried. */
export function FreelanceOff({ title }: { title: string }) {
  return (
    <>
      <div className="page-head"><div><h1>{title}</h1></div></div>
      <div className="card section" data-testid="freelance-off">
        <div className="empty">
          <IconInbox />
          <strong>Freelance mode is off</strong>
          <span>Turn it on to manage clients, jobs and client payments next to your regular income and expenses.</span>
          <Link className="btn" href="/settings#work-type">Open settings</Link>
        </div>
      </div>
    </>
  );
}
