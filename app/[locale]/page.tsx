import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { defaultLocale, isLocale, localePath } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getPageQuery, getPageBlockData, getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";
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
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || localePath(locale, "/");
  const [result, settings] = await Promise.all([
    getPageQuery(locale, "home"),
    getSiteSettings(locale),
  ]);
  const page = result?.data.pages;
  const dict = getDictionary(locale);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    seo: page?.seo || settings?.defaultSeo,
    fallbackTitle: page?.title || settings?.title || dict.siteName,
  });
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const result = await getPageQuery(locale, "home");

  if (!result) notFound();

  const { latestPosts, newsletterFormCopy } = await getPageBlockData(
    locale,
    result.data.pages.blocks
  );

  return (
    <PageView
      query={result.query}
      variables={result.variables}
      data={result.data}
      locale={locale}
      latestPosts={latestPosts}
      newsletterFormCopy={newsletterFormCopy}
    />
  );
}
