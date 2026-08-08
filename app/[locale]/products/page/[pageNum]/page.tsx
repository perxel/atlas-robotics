import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { defaultLocale, CMSCollection, CMSMultilingual } from "@/lib/cms";
import { parsePageParam } from "@/cms/pagination";
import { generateProductsMetadata, ProductsListing } from "../../listing";

// URL: /products/page/2. This folder is literally named "page" (a URL
// segment), unrelated to the reserved page.tsx filename one level down —
// Next.js resolves this literal segment ahead of the dynamic [slug] detail
// route at the same level (see CLAUDE.md's "content-only migration" note
// for the same rule applied to /blog), so it never collides with a
// product's own /products/<slug> URL. The one edge case: a product
// literally slugged "page" would become unreachable at its detail URL,
// since this literal folder always wins for that exact segment — not
// currently guarded against (products doesn't use slugField's `reserved`
// option the way the `pages` collection does).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; pageNum: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  return generateProductsMetadata(locale);
}

export default async function ProductsPageByNumber({
  params,
}: {
  params: Promise<{ locale: string; pageNum: string }>;
}) {
  const { locale: rawLocale, pageNum } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  const page = parsePageParam(pageNum);

  if (page === null) notFound();
  // Page 1 already lives at the bare /products URL — one URL per page.
  if (page <= 1) redirect(CMSCollection.getCollectionPath({ collectionName: "products", lang: locale }));

  return <ProductsListing locale={locale} requestedPage={page} />;
}
