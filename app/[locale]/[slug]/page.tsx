import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { StaticTinaMarkdown } from "tinacms/dist/rich-text/static";
import { defaultLocale, isLocale, localePath } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getPageBySlug, getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";
import { isBlocksEnabled } from "@/lib/pages-config";
import BlocksRenderer from "@/components/blocks/BlocksRenderer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || localePath(locale, `/${slug}`);
  const [page, settings] = await Promise.all([
    getPageBySlug(locale, slug),
    getSiteSettings(locale),
  ]);
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
  const page = await getPageBySlug(locale, slug);

  if (!page) notFound();

  const blocksEnabled = isBlocksEnabled(slug);

  return (
    <article>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold">{page.title}</h1>
        {page.intro && (
          <div className="prose prose-sm mt-4 max-w-none text-muted-foreground">
            <StaticTinaMarkdown content={page.intro} />
          </div>
        )}
      </div>

      {blocksEnabled && page.blocks && page.blocks.length > 0 && (
        <BlocksRenderer blocks={page.blocks} />
      )}
    </article>
  );
}
