import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { StaticTinaMarkdown } from "tinacms/dist/rich-text/static";
import { defaultLocale, isLocale, localePath } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getCatalogTabs, getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || localePath(locale, "/catalog/text");
  const settings = await getSiteSettings(locale);
  const dict = getDictionary(locale);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    fallbackTitle: `${dict.catalogText.pageTitle} — ${settings?.title || dict.siteName}`,
  });
}

export default async function CatalogTextPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const tabs = await getCatalogTabs(locale);
  const dict = getDictionary(locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{dict.catalogText.pageTitle}</h1>
        <Link
          href={localePath(locale, "/catalog")}
          className="text-sm text-accent underline hover:no-underline"
        >
          {dict.catalogText.viewInteractive}
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{dict.catalogText.pageDescription}</p>

      <div className="mt-8 space-y-10">
        {tabs.map((tab) => (
          <section key={tab.id} aria-label={tab.name}>
            <h2 className="text-lg font-semibold">
              {tab.name}
              {tab.status === "inactive" ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {dict.catalogText.inactiveSuffix}
                </span>
              ) : null}
            </h2>
            {tab.intro ? (
              <div className="prose prose-sm mt-2 max-w-none text-muted-foreground">
                <StaticTinaMarkdown content={tab.intro} />
              </div>
            ) : null}
            {tab.pages && tab.pages.length ? (
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-foreground/80">
                {tab.pages.map(
                  (page, i) =>
                    page && <li key={i}>{page.alt || dict.catalog.imageFallback(i + 1)}</li>
                )}
              </ol>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
