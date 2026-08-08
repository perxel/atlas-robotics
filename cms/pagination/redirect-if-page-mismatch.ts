import { redirect } from "next/navigation";
import { canonicalPageHref } from "./canonical-page-href";

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
