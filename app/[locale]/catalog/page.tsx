import type { Metadata } from "next";
import { headers } from "next/headers";
import { defaultLocale, isLocale, localePath } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getCatalogTabs, getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";
import { slugify } from "@/lib/slugify";
import CatalogViewer from "@/components/catalog/CatalogViewer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || localePath(locale, "/catalog");
  const [tabs, settings] = await Promise.all([getCatalogTabs(locale), getSiteSettings(locale)]);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    seo: tabs[0]?.seo,
    fallbackTitle: `${getDictionary(locale).catalog.pageTitle} — ${settings?.title || getDictionary(locale).siteName}`,
  });
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const { tab } = await searchParams;
  const tabs = await getCatalogTabs(locale);
  const dict = getDictionary(locale);

  const viewerTabs = tabs.map((t) => ({
    slug: slugify(t.name),
    name: t.name,
    status: t.status,
    intro: t.intro,
    pages: (t.pages || []).filter((p): p is NonNullable<typeof p> => !!p),
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{dict.catalog.pageTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{dict.catalog.pageDescription}</p>

      <div className="mt-8">
        <CatalogViewer tabs={viewerTabs} initialTabSlug={tab} locale={locale} />
      </div>
    </div>
  );
}
