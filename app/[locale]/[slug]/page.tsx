import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { defaultLocale, isLocale, localePath, stripLocalePrefix } from "@/lib/i18n";
import { resolveLocaleAlternates } from "@/lib/locale-alternates";
import { getPageQuery, getPageBlockData, getSiteSettings } from "@/lib/tina-content";
import { CMSDictionary, CMSSeo } from "@/lib/cms";
import { translateText } from "@/cms/multilingual";
import PageView from "@/components/pages/PageView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || localePath(locale, `/${slug}`);
  const [result, settings, alternates, uiDictionary] = await Promise.all([
    getPageQuery(locale, slug),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
    CMSDictionary.loadMap(locale),
  ]);
  const page = result?.data.pages;

  return CMSSeo.buildMetadata({
    lang: locale,
    pathWithoutLocale: stripLocalePrefix(pathname),
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
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  // The "home" document is rendered at the site root (app/[locale]/page.tsx)
  // — redirect this second URL rather than rendering the same content
  // twice under two different paths.
  if (slug === "home") redirect(localePath(locale, "/"));

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
