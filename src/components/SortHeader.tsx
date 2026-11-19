import Link from "next/link";
import { buildHref } from "@/lib/paging";

/** A column heading that sorts the table. Clicking the active column flips the direction. */
export function SortHeader({
  label,
  column,
  sort,
  dir,
  basePath,
  params,
  className,
}: {
  label: string;
  column: string;
  sort: string;
  dir: "asc" | "desc";
  basePath: string;
  params: Record<string, string | string[] | undefined>;
  className?: string;
}) {
  const active = sort === column;
  const nextDir = active && dir === "asc" ? "desc" : "asc";
  const href = buildHref(basePath, { ...params, sort: column, dir: nextDir });
  return (
    <th className={className} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={href} className={`sort-link${active ? " is-active" : ""}`} scroll={false}>
        {label}
        <span className="sort-arrow" aria-hidden="true">{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </Link>
    </th>
  );
}
