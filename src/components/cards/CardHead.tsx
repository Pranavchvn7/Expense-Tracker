import type { ReactNode } from "react";

/** The one header every card uses: same height, same spacing, optional action on the right. */
export function CardHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card-head">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
