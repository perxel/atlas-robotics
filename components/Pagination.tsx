import Link from "next/link";
import { translateText } from "@/cms/multilingual";
import { canonicalPageHref, buildPageWindow } from "@/cms/pagination";

const ELLIPSIS = "…" as const;

/**
 * Generic numbered pagination, shared by BlogListingBlock,
 * ProductListingBlock's "all" mode, and the blog/products taxonomy archive
 * routes — anything that paginates over an already-fetched array with
 * cms/pagination's paginateItems(). `basePath` is the listing/archive page's
 * own URL (e.g. CMSCollection.getCollectionPath({ collectionName: "blog", lang: locale })); links go through
 * canonicalPageHref so the URL shape (`basePath` for page 1, `basePath/page/N`
 * otherwise) only has to be spelled out in one place.
 *
 * `uiDictionary` is a resolved `{sourceText: translation}` snapshot (see
 * CMSDictionary.loadMap / translateText, cms/multilingual), passed down as
 * plain data rather than fetched here — this component renders both from
 * true server routes (the taxonomy archive pages) and from inside
 * PageView's client-rendered visual-editing tree (BlogListingBlock/
 * ProductListingBlock), and only plain data can safely cross that boundary.
 */
export default function Pagination({
  currentPage,
  totalPages,
  basePath,
  uiDictionary,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  uiDictionary: Record<string, string>;
}) {
  if (totalPages <= 1) return null;

  const t = (text: string) => translateText(uiDictionary, text);
  const hrefFor = (page: number) => canonicalPageHref(basePath, page);

  return (
    <nav aria-label={t("Pagination")} className="mt-10 flex items-center justify-center gap-1">
      <Link
        href={hrefFor(currentPage - 1)}
        aria-label={t("Previous")}
        aria-disabled={currentPage <= 1}
        tabIndex={currentPage <= 1 ? -1 : undefined}
        className={`rounded-md px-3 py-1.5 text-sm ${
          currentPage <= 1
            ? "pointer-events-none text-muted-foreground/50"
            : "text-foreground hover:bg-surface-muted"
        }`}
      >
        {t("Previous")}
      </Link>

      {buildPageWindow(currentPage, totalPages).map((page, i) =>
        page === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground">
            {ELLIPSIS}
          </span>
        ) : (
          <Link
            key={page}
            href={hrefFor(page)}
            aria-label={`${t("Page")} ${page}`}
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
        aria-label={t("Next")}
        aria-disabled={currentPage >= totalPages}
        tabIndex={currentPage >= totalPages ? -1 : undefined}
        className={`rounded-md px-3 py-1.5 text-sm ${
          currentPage >= totalPages
            ? "pointer-events-none text-muted-foreground/50"
            : "text-foreground hover:bg-surface-muted"
        }`}
      >
        {t("Next")}
      </Link>
    </nav>
  );
}
