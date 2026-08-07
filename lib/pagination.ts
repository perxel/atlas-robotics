import { redirect } from "next/navigation";

// Shared by every paginated listing (BlogListingBlock, ProductListingBlock's
// "all" mode, and the blog/products taxonomy archive routes). Pagination
// happens in application code over an already-fetched array — same pattern
// as filterByTaxonomyTerm in lib/tina-content.ts — rather than a
// GraphQL-level offset/limit, since these collections are small and already
// fetched in full for filtering.
export const DEFAULT_PAGE_SIZE = 6;

export function paginate<T>(items: T[], page: number, pageSize: number = DEFAULT_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    currentPage,
    totalPages,
  };
}

/**
 * Parses a `/page/[pageNum]` route param — a positive integer with no
 * leading zero (so "2" and "02" aren't two URLs for the same page) — or
 * null if it isn't one.
 */
export function parsePageParam(value: string): number | null {
  return /^[1-9]\d*$/.test(value) ? Number(value) : null;
}

/** `basePath` for page 1, `basePath/page/N` for every other page — the one place this URL shape is spelled out. */
export function canonicalPageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}/page/${page}`;
}

/**
 * Redirects to the canonical URL for `currentPage` (paginate()'s clamped
 * result) when it doesn't match what was actually requested — e.g.
 * `/page/1` (page 1 already lives at the bare URL) or `/page/99` on a
 * collection with only 2 pages. Keeps one URL per page, same "never a
 * duplicate URL" rule this app already applies to locale routing.
 */
export function redirectIfPageMismatch(requestedPage: number, currentPage: number, basePath: string) {
  if (requestedPage !== currentPage) {
    redirect(canonicalPageHref(basePath, currentPage));
  }
}
