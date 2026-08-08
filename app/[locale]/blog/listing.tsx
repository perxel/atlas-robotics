import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { CMSMultilingual, type Locale, CMSCollection, CMSDictionary, CMSSeo } from "@/lib/cms";
import { resolveLocaleAlternates } from "@/lib/locale-alternates";
import { getPageQuery, getPageBlockData, getSiteSettings } from "@/lib/tina-content";
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
export async function generateBlogMetadata(locale: Locale): Promise<Metadata> {
  const headersList = await headers();
  const pathname =
    headersList.get("x-pathname") || CMSCollection.getCollectionPath({ collectionName: "blog", lang: locale });
  const [result, settings, alternates, uiDictionary] = await Promise.all([
    getPageQuery(locale, "blog"),
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
    fallbackTitle: page?.title || `${t("Blog")} — ${settings?.title || t("Lorem ipsum")}`,
  });
}

export async function BlogListing({
  locale,
  requestedPage,
}: {
  locale: Locale;
  requestedPage: number;
}) {
  const result = await getPageQuery(locale, "blog");

  if (!result) notFound();

  const { latestPosts, products, uiDictionary } = await getPageBlockData(locale, result.data.pages.blocks);

  // The BlogListingBlock on this locked document paginates the same
  // `latestPosts` array — checking here too lets an out-of-range page
  // number redirect to the canonical URL instead of duplicating content.
  const { currentPage } = paginateItems(latestPosts, requestedPage);
  redirectIfPageMismatch(
    requestedPage,
    currentPage,
    CMSCollection.getCollectionPath({ collectionName: "blog", lang: locale })
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
