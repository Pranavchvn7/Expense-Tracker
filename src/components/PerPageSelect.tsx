"use client";

import { useRouter } from "next/navigation";
import { buildHref } from "@/lib/paging";

/** Rows-per-page dropdown. Changing it goes back to page 1 with the new size. */
export function PerPageSelect({
  basePath,
  params,
  perPage,
  pageKey,
  sizeKey,
  options,
  anchor,
}: {
  basePath: string;
  params: Record<string, string | string[] | undefined>;
  perPage: number;
  pageKey: string;
  sizeKey: string;
  options: readonly number[];
  anchor?: string;
}) {
  const router = useRouter();
  const smallest = options[0] ?? 10;
  return (
    <label className="per-page">
      <span className="muted">Rows</span>
      <select
        aria-label="Rows per page"
        value={perPage}
        onChange={(e) => {
          const n = Number(e.target.value);
          router.push(
            buildHref(basePath, { ...params, [pageKey]: undefined, [sizeKey]: n === smallest ? undefined : n }) +
              (anchor ? `#${anchor}` : ""),
            { scroll: false },
          );
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
