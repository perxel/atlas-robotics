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

// The blog listing is a `pages` document too (fixed filename "blog", same
// pattern as home's fixed "home" — see lib/collection-slugs.ts's
// `listingPageFilename` and lib/pages-config.ts's lockedSlugFilenames),
// rendered here rather than through the generic [slug] catch-all: this
// physical route folder has to exist anyway for the detail/taxonomy-archive
// routes nested under it (blog/[slug], blog/[slug]/[term]), and Next.js
// always resolves a literal folder over a same-level dynamic sibling — so
// deleting this file wouldn't make "/blog" fall through to the catch-all,
// it would just 404.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || collectionPath(locale, "blog");
  const [result, settings, alternates] = await Promise.all([
    getPageQuery(locale, "blog"),
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
    fallbackTitle: page?.title || `${dict.blog.pageTitle} — ${settings?.title || dict.siteName}`,
  });
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const result = await getPageQuery(locale, "blog");

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
