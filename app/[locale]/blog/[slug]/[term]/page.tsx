import type { Metadata } from "next";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { generateBlogArchiveMetadata, BlogArchive } from "./archive";

// Page 1 of a taxonomy archive (e.g. /blog/category/news);
// page/[pageNum]/page.tsx handles page >= 2 via the same BlogArchive (see
// archive.tsx for the shared metadata/data-fetching logic and why the
// folder above this one is named [slug] rather than [taxonomy]).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; term: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug: taxonomySegment, term: termSlug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  return generateBlogArchiveMetadata(locale, taxonomySegment, termSlug);
}

export default async function BlogTaxonomyArchivePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; term: string }>;
}) {
  const { locale: rawLocale, slug: taxonomySegment, term: termSlug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  return (
    <BlogArchive
      locale={locale}
      taxonomySegment={taxonomySegment}
      termSlug={termSlug}
      requestedPage={1}
    />
  );
}
