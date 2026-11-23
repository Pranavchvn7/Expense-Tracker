import Link from "next/link";
import { buildHref, PER_PAGE_OPTIONS } from "@/lib/paging";
import { PerPageSelect } from "@/components/PerPageSelect";

/**
 * Previous/next links plus a small "rows per page" dropdown. Shown only when there is
 * something to page through. `params` are the other query values to keep (month, filters...).
 */
export function Pager({
  basePath,
  params,
  page,
  perPage,
  hasNext,
  rowCount,
  pageKey = "page",
  sizeKey = "pp",
  options = PER_PAGE_OPTIONS,
  anchor,
}: {
  basePath: string;
  params: Record<string, string | string[] | undefined>;
  page: number;
  perPage: number;
  hasNext: boolean;
  rowCount: number;
  pageKey?: string;
  sizeKey?: string;
  options?: readonly number[];
  anchor?: string;
}) {
  const smallest = options[0] ?? 10;
  if (page === 1 && !hasNext && rowCount <= smallest) return null;
  const link = (p: number) =>
    buildHref(basePath, { ...params, [pageKey]: p > 1 ? p : undefined, [sizeKey]: perPage === smallest ? undefined : perPage }) +
    (anchor ? `#${anchor}` : "");

  return (
    <nav className="pager" aria-label="Pagination" data-testid="pager">
      <div className="pager-links">
        {page > 1 ? (
          <Link className="btn ghost small" href={link(page - 1)} scroll={false} data-testid="pager-prev">← Previous</Link>
        ) : (
          <span className="btn ghost small is-disabled" aria-disabled="true">← Previous</span>
        )}
        <span className="muted">Page {page}</span>
        {hasNext ? (
          <Link className="btn ghost small" href={link(page + 1)} scroll={false} data-testid="pager-next">Next →</Link>
        ) : (
          <span className="btn ghost small is-disabled" aria-disabled="true">Next →</span>
        )}
      </div>
      <PerPageSelect
        basePath={basePath}
        params={params}
        perPage={perPage}
        pageKey={pageKey}
        sizeKey={sizeKey}
        options={options}
        anchor={anchor}
      />
    </nav>
  );
}
