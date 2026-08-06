import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { defaultLocale, isLocale, localePath } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getPageQuery, getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";
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
  const [result, settings] = await Promise.all([
    getPageQuery(locale, slug),
    getSiteSettings(locale),
  ]);
  const page = result?.data.pages;
  const dict = getDictionary(locale);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    seo: page?.seo,
    fallbackTitle: page?.title || settings?.title || dict.siteName,
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

  return (
    <PageView query={result.query} variables={result.variables} data={result.data} />
  );
}
