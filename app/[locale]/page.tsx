import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { defaultLocale, isLocale, localePath } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || localePath(locale, "/");
  const settings = await getSiteSettings(locale);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    seo: settings?.defaultSeo,
    fallbackTitle: settings?.title || getDictionary(locale).siteName,
  });
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const dict = getDictionary(locale);

  const sections = [
    { path: "/catalog", ...dict.home.sections.catalog },
    { path: "/story-cards", ...dict.home.sections.storyCards },
    { path: "/blog", ...dict.home.sections.blog },
    { path: "/contact", ...dict.home.sections.contact },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-semibold">{dict.home.title}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{dict.home.description}</p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.path}
            href={localePath(locale, section.path)}
            className="block rounded-lg border border-border bg-surface p-6 hover:border-accent"
          >
            <h2 className="text-lg font-semibold">{section.label}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
