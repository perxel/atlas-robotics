import Link from "next/link";
import { getDictionary } from "@/lib/dictionary";
import { canonicalPageHref } from "@/lib/pagination";
import type { Locale } from "@/lib/i18n";

const ELLIPSIS = "…" as const;

/** Windows page numbers around the current page, e.g. [1, "…", 4, 5, 6, "…", 12]. */
function pageWindow(currentPage: number, totalPages: number): (number | typeof ELLIPSIS)[] {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const result: (number | typeof ELLIPSIS)[] = [];
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) result.push(ELLIPSIS);
    result.push(page);
  });
  return result;
}

/**
 * Generic numbered pagination, shared by BlogListingBlock,
 * ProductListingBlock's "all" mode, and the blog/products taxonomy archive
 * routes — anything that paginates over an already-fetched array with
 * lib/pagination.ts's paginate(). `basePath` is the listing/archive page's
 * own URL (e.g. collectionPath(locale, "blog")); links go through
 * canonicalPageHref so the URL shape (`basePath` for page 1, `basePath/page/N`
 * otherwise) only has to be spelled out in one place.
 */
export default function Pagination({
  currentPage,
  totalPages,
  basePath,
  locale,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  locale: Locale;
}) {
  if (totalPages <= 1) return null;

  const dict = getDictionary(locale);
  const hrefFor = (page: number) => canonicalPageHref(basePath, page);

  return (
    <nav aria-label={dict.pagination.navLabel} className="mt-10 flex items-center justify-center gap-1">
      <Link
        href={hrefFor(currentPage - 1)}
        aria-label={dict.pagination.previous}
        aria-disabled={currentPage <= 1}
        tabIndex={currentPage <= 1 ? -1 : undefined}
        className={`rounded-md px-3 py-1.5 text-sm ${
          currentPage <= 1
            ? "pointer-events-none text-muted-foreground/50"
            : "text-foreground hover:bg-surface-muted"
        }`}
      >
        {dict.pagination.previous}
      </Link>

      {pageWindow(currentPage, totalPages).map((page, i) =>
        page === ELLIPSIS ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground">
            {ELLIPSIS}
          </span>
        ) : (
          <Link
            key={page}
            href={hrefFor(page)}
            aria-label={`${dict.pagination.page} ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
            className={`min-w-9 rounded-md px-3 py-1.5 text-center text-sm ${
              page === currentPage
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-surface-muted"
            }`}
          >
            {page}
          </Link>
        )
      )}

      <Link
        href={hrefFor(currentPage + 1)}
        aria-label={dict.pagination.next}
        aria-disabled={currentPage >= totalPages}
        tabIndex={currentPage >= totalPages ? -1 : undefined}
        className={`rounded-md px-3 py-1.5 text-sm ${
          currentPage >= totalPages
            ? "pointer-events-none text-muted-foreground/50"
            : "text-foreground hover:bg-surface-muted"
        }`}
      >
        {dict.pagination.next}
      </Link>
    </nav>
  );
}
