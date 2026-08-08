import { DEFAULT_PAGE_SIZE } from "./constants";
import type { Paginated } from "./types";

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
