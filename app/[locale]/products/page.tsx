import type { Metadata } from "next";
import { defaultLocale, CMSMultilingual } from "@/lib/registry";
import { generateProductsMetadata, ProductsListing } from "./listing";

// Same pattern as app/[locale]/blog/page.tsx — a `pages` document with the
// fixed, locked filename "products", rendered here (not the generic [slug]
// catch-all) because this physical route folder has to exist anyway for
// the nested detail/taxonomy-archive/pagination routes. Page 1 of the
// listing; page/[pageNum]/page.tsx handles page >= 2 via the same
// ProductsListing (see listing.tsx).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  return generateProductsMetadata(locale);
}

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  return <ProductsListing locale={locale} requestedPage={1} />;
}
