import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CMSCollection } from "@/lib/cms-server";
import { defaultLocale, CMSMultilingual } from "@/lib/registry";
import { parsePageParam } from "@/cms/pagination";
import { generateProductsArchiveMetadata, ProductsArchive } from "../../archive";

// URL: /products/category/<term-slug>/page/2. This "page" folder sits one
// level deeper than [term] (which itself is nested under the "category"-ish
// [slug] segment — see archive.tsx), so it doesn't collide with anything:
// nothing else currently exists at this depth, and it doesn't interact with
// the top-level /products/page/[pageNum] listing pagination route at all
// (different depth, different parent).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; term: string; pageNum: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug: taxonomySegment, term: termSlug } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  return generateProductsArchiveMetadata(locale, taxonomySegment, termSlug);
}

export default async function ProductsTaxonomyArchivePageByNumber({
  params,
}: {
  params: Promise<{ locale: string; slug: string; term: string; pageNum: string }>;
}) {
  const { locale: rawLocale, slug: taxonomySegment, term: termSlug, pageNum } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  const page = parsePageParam(pageNum);

  if (page === null) notFound();
  if (page <= 1) {
    redirect(
      CMSCollection.getCollectionPath({
        collectionName: "products",
        lang: locale,
        rest: `/${taxonomySegment}/${termSlug}`,
      })
    );
  }

  return (
    <ProductsArchive
      locale={locale}
      taxonomySegment={taxonomySegment}
      termSlug={termSlug}
      requestedPage={page}
    />
  );
}
