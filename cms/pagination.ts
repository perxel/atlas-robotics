import { redirect } from "next/navigation";

/** A semantic marker, not the "…" glyph itself — rendering it as "…", "...",
 * or an icon stays a components/ presentation choice. */
export type PageWindowItem = number | "ellipsis";

export type Paginated<T> = {
  items: T[];
  currentPage: number;
  totalPages: number;
};

/** Single source of truth for "how many items per page by default" — imported
 * by CollectionService/TaxonomyService as their pageSize fallback. */
export const DEFAULT_PAGE_SIZE = 6;

/**
 * Parses a `/page/[pageNum]` route param — a positive integer with no
 * leading zero (so "2" and "02" aren't two URLs for the same page) — or
 * null if it isn't one.
 */
export function parsePageParam(value: string): number | null {
  return /^[1-9]\d*$/.test(value) ? Number(value) : null;
}

/** Slices `items` into one page — pagination happens in application code
 * over an already-fetched array, not a GraphQL-level offset/limit. */
export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE
): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    currentPage,
    totalPages,
  };
}

/** `basePath` for page 1, `basePath/page/N` for every other page — the one place this URL shape is spelled out. */
export function canonicalPageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}/page/${page}`;
}

/** Windows page numbers around the current page, e.g. [1, "ellipsis", 4, 5, 6, "ellipsis", 12]. */
export function buildPageWindow(currentPage: number, totalPages: number): PageWindowItem[] {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const result: PageWindowItem[] = [];
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) result.push("ellipsis");
    result.push(page);
  });
  return result;
}

/**
 * Redirects to the canonical URL for `currentPage` (paginateItems()'s
 * clamped result) when it doesn't match what was actually requested — e.g.
 * `/page/1` (page 1 already lives at the bare URL) or `/page/99` on a
 * collection with only 2 pages. Keeps one URL per page, same "never a
 * duplicate URL" rule this app already applies to locale routing.
 */
export function redirectIfPageMismatch(requestedPage: number, currentPage: number, basePath: string) {
  if (requestedPage !== currentPage) {
    redirect(canonicalPageHref(basePath, currentPage));
  }
}
