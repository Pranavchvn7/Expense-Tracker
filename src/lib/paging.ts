// Pure paging helpers (no imports): validate ?page= and ?pp= and build safe links.

export const PER_PAGE_OPTIONS = [10, 20, 50] as const;
type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parsePaging(
  sp: SP,
  opts: { pageKey?: string; sizeKey?: string; options?: readonly number[]; defaultSize?: number } = {},
): { page: number; perPage: number } {
  const options = opts.options ?? PER_PAGE_OPTIONS;
  const defaultSize = opts.defaultSize ?? options[0] ?? 10;
  const rawPage = Number(first(sp[opts.pageKey ?? "page"]));
  const rawSize = Number(first(sp[opts.sizeKey ?? "pp"]));
  return {
    page: Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 1000 ? rawPage : 1,
    perPage: options.includes(rawSize) ? rawSize : defaultSize,
  };
}

/** Build "/path?a=1&b=2" from defined values only. URLSearchParams does the escaping. */
export function buildHref(path: string, params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") u.set(k, String(v));
  }
  const qs = u.toString();
  return qs ? `${path}?${qs}` : path;
}
