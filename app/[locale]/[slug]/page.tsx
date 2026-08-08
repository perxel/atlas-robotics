import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  defaultLocale,
  CMSDictionary,
  CMSSeo,
  CMSMultilingual,
  getPageQuery,
  getSiteSettings,
  resolveLocaleAlternates,
  getPageBlockData,
} from "@/lib/cms";
import { translateText } from "@/cms/multilingual";
import PageView from "@/components/pages/PageView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || CMSMultilingual.localePath(locale, `/${slug}`);
  const [result, settings, alternates, uiDictionary] = await Promise.all([
    getPageQuery(locale, slug),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
    CMSDictionary.loadMap(locale),
  ]);
  const page = result?.data.pages;

  return CMSSeo.buildMetadata({
    lang: locale,
    pathWithoutLocale: CMSMultilingual.stripLocalePrefix(pathname),
    alternates,
    seo: page?.seo,
    fallbackTitle: page?.title || settings?.title || translateText(uiDictionary, "Lorem ipsum"),
  });
}

export default async function GenericPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;

  // The "home" document is rendered at the site root (app/[locale]/page.tsx)
  // — redirect this second URL rather than rendering the same content
  // twice under two different paths.
  if (slug === "home") redirect(CMSMultilingual.localePath(locale, "/"));

  const result = await getPageQuery(locale, slug);

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
