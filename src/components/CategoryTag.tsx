import { colorClass } from "@/lib/category-color";

/** Category pill in the same colour as its slice on the dashboard chart. */
export function CategoryTag({ name, color }: { name: string | null | undefined; color: number | null | undefined }) {
  if (!name) return <span className="tag cat c8"><i className="dot c8" />Uncategorised</span>;
  const c = colorClass(color);
  return (
    <span className={`tag cat ${c}`}>
      <i className={`dot ${c}`} />
      {name}
    </span>
  );
}
