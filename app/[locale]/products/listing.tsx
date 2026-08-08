import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { CMSMultilingual, type Locale, CMSCollection, CMSDictionary, CMSSeo, getPageQuery, getSiteSettings } from "@/lib/cms";
import { resolveLocaleAlternates } from "@/lib/locale-alternates";
import { getPageBlockData } from "@/lib/tina-content";
import { translateText } from "@/cms/multilingual";
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
  const pathname =
    headersList.get("x-pathname") || CMSCollection.getCollectionPath({ collectionName: "products", lang: locale });
  const [result, settings, alternates, uiDictionary] = await Promise.all([
    getPageQuery(locale, "products"),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
    CMSDictionary.loadMap(locale),
  ]);
  const page = result?.data.pages;
  const t = (text: string) => translateText(uiDictionary, text);

  return CMSSeo.buildMetadata({
    lang: locale,
    pathWithoutLocale: CMSMultilingual.stripLocalePrefix(pathname),
    alternates,
    seo: page?.seo,
    fallbackTitle: page?.title || `${t("Products")} — ${settings?.title || t("Lorem ipsum")}`,
    fallbackDescription: t("Everything Lorem ipsum ships, in one place."),
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

  const { latestPosts, products, uiDictionary } = await getPageBlockData(locale, result.data.pages.blocks);

  // The "all" mode ProductListingBlock on this locked document paginates
  // the same `products` array — checking here too lets an out-of-range
  // page number (e.g. /page/99 with only 2 actual pages) redirect to the
  // canonical URL instead of silently duplicating page 2's content.
  const { currentPage } = paginateItems(products, requestedPage);
  redirectIfPageMismatch(
    requestedPage,
    currentPage,
    CMSCollection.getCollectionPath({ collectionName: "products", lang: locale })
  );

  return (
    <PageView
      query={result.query}
      variables={result.variables}
      data={result.data}
      locale={locale}
      latestPosts={latestPosts}
      products={products}
      currentPage={currentPage}
      uiDictionary={uiDictionary}
    />
  );
}
