import type { PageWindowItem } from "./types";

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
