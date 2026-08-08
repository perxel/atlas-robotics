import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { defaultLocale, CMSDictionary, CMSSeo, CMSMultilingual } from "@/lib/cms";
import { resolveLocaleAlternates } from "@/lib/locale-alternates";
import { getPageQuery, getPageBlockData, getSiteSettings } from "@/lib/tina-content";
import { translateText } from "@/cms/multilingual";
import PageView from "@/components/pages/PageView";

// The home page is a `pages` document with slug "home" — same collection
// and rendering path as any other page (see app/[locale]/[slug]/page.tsx),
// just mounted at the site root instead of a dynamic segment because "/"
// has zero URL segments to bind a [slug] param to.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || CMSMultilingual.localePath(locale, "/");
  const [result, settings, alternates, uiDictionary] = await Promise.all([
    getPageQuery(locale, "home"),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
    CMSDictionary.loadMap(locale),
  ]);
  const page = result?.data.pages;

  return CMSSeo.buildMetadata({
    lang: locale,
    pathWithoutLocale: CMSMultilingual.stripLocalePrefix(pathname),
    alternates,
    seo: page?.seo || settings?.defaultSeo,
    fallbackTitle: page?.title || settings?.title || translateText(uiDictionary, "Lorem ipsum"),
  });
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  const result = await getPageQuery(locale, "home");

  if (!result) notFound();

  const { latestPosts, products, uiDictionary } = await getPageBlockData(locale, result.data.pages.blocks);

  return (
    <PageView
      query={result.query}
      variables={result.variables}
      data={result.data}
      locale={locale}
      latestPosts={latestPosts}
      products={products}
      uiDictionary={uiDictionary}
    />
  );
}
