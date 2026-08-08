import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { defaultLocale, isLocale, collectionPath } from "@/lib/cms";
import { parsePageParam } from "@/cms/pagination";
import { generateBlogArchiveMetadata, BlogArchive } from "../../archive";

// URL: /blog/category/<term-slug>/page/2. Same reasoning as
// app/[locale]/products/[slug]/[term]/page/[pageNum]/page.tsx.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; term: string; pageNum: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug: taxonomySegment, term: termSlug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  return generateBlogArchiveMetadata(locale, taxonomySegment, termSlug);
}

export default async function BlogTaxonomyArchivePageByNumber({
  params,
}: {
  params: Promise<{ locale: string; slug: string; term: string; pageNum: string }>;
}) {
  const { locale: rawLocale, slug: taxonomySegment, term: termSlug, pageNum } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const page = parsePageParam(pageNum);

  if (page === null) notFound();
  if (page <= 1) {
    redirect(collectionPath(locale, "blog", `/${taxonomySegment}/${termSlug}`));
  }

  return (
    <BlogArchive
      locale={locale}
      taxonomySegment={taxonomySegment}
      termSlug={termSlug}
      requestedPage={page}
    />
  );
}
