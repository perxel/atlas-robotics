import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Locale } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { collectionPath } from "@/lib/collection-slugs";
import { resolveLocaleAlternates } from "@/lib/locale-alternates";
import { getPageQuery, getPageBlockData, getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";
import { paginateItems, redirectIfPageMismatch } from "@/cms/pagination";
import PageView from "@/components/pages/PageView";

/**
 * Shared by page.tsx (page 1, canonical) and page/[pageNum]/page.tsx
 * (page >= 2) — same content document and query, only the requested page
 * number differs. Not a route file itself: Next.js only treats reserved
 * filenames (page.tsx, layout.tsx, ...) as routes, so a plain module like
 * this one next to them is just imported, never matched as a URL.
 */
export async function generateProductsMetadata(locale: Locale): Promise<Metadata> {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || collectionPath(locale, "products");
  const [result, settings, alternates] = await Promise.all([
    getPageQuery(locale, "products"),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
  ]);
  const page = result?.data.pages;
  const dict = getDictionary(locale);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    alternates,
    seo: page?.seo,
    fallbackTitle:
      page?.title || `${dict.products.pageTitle} — ${settings?.title || dict.siteName}`,
    fallbackDescription: dict.products.pageDescription,
  });
}

export async function ProductsListing({
  locale,
  requestedPage,
}: {
  locale: Locale;
  requestedPage: number;
}) {
  const result = await getPageQuery(locale, "products");

  if (!result) notFound();

  const { latestPosts, products } = await getPageBlockData(locale, result.data.pages.blocks);

  // The "all" mode ProductListingBlock on this locked document paginates
  // the same `products` array — checking here too lets an out-of-range
  // page number (e.g. /page/99 with only 2 actual pages) redirect to the
  // canonical URL instead of silently duplicating page 2's content.
  const { currentPage } = paginateItems(products, requestedPage);
  redirectIfPageMismatch(requestedPage, currentPage, collectionPath(locale, "products"));

  return (
    <PageView
      query={result.query}
      variables={result.variables}
      data={result.data}
      locale={locale}
      latestPosts={latestPosts}
      products={products}
      currentPage={currentPage}
    />
  );
}
