// Stable category colours. Seven palette slots (c1..c7) plus a neutral grey (c8) for
// "Uncategorised" and "Other". The slot is stored on the category when it is created, so a
// category keeps its colour everywhere (tags, donut, budgets) even when others are deleted.

export function colorClass(color: number | null | undefined): string {
  return color && color >= 1 && color <= 7 ? `c${color}` : "c8";
}

/** Next slot to hand out: cycles 1..7 by how many categories already exist. */
export function nextColor(existingCount: number): number {
  return (existingCount % 7) + 1;
}
