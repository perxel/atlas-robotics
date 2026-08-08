import type { Metadata } from "next";
import { defaultLocale, CMSMultilingual } from "@/lib/cms";
import { generateProductsArchiveMetadata, ProductsArchive } from "./archive";

// Page 1 of a taxonomy archive (e.g. /products/category/automation);
// page/[pageNum]/page.tsx handles page >= 2 via the same ProductsArchive
// (see archive.tsx for the shared metadata/data-fetching logic and why the
// folder above this one is named [slug] rather than [taxonomy]).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; term: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug: taxonomySegment, term: termSlug } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  return generateProductsArchiveMetadata(locale, taxonomySegment, termSlug);
}

export default async function ProductsTaxonomyArchivePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; term: string }>;
}) {
  const { locale: rawLocale, slug: taxonomySegment, term: termSlug } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  return (
    <ProductsArchive
      locale={locale}
      taxonomySegment={taxonomySegment}
      termSlug={termSlug}
      requestedPage={1}
    />
  );
}
