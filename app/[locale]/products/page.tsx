import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { collectionPath } from "@/lib/collection-slugs";
import { resolveLocaleAlternates } from "@/lib/locale-alternates";
import { getPageQuery, getPageBlockData, getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";
import PageView from "@/components/pages/PageView";

// Same pattern as app/[locale]/blog/page.tsx — a `pages` document with the
// fixed, locked filename "products", rendered here (not the generic [slug]
// catch-all) because this physical route folder has to exist anyway for
// the nested detail/taxonomy-archive routes.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
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

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const result = await getPageQuery(locale, "products");

  if (!result) notFound();

  const { latestPosts, products } = await getPageBlockData(locale, result.data.pages.blocks);

  return (
    <PageView
      query={result.query}
      variables={result.variables}
      data={result.data}
      locale={locale}
      latestPosts={latestPosts}
      products={products}
    />
  );
}
