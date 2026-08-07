import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getProductQuery, getProducts, getRelatedEntries, getSiteSettings } from "@/lib/tina-content";
import { getDictionary } from "@/lib/dictionary";
import { collectionPath } from "@/lib/collection-slugs";
import { resolveLocaleAlternates } from "@/lib/locale-alternates";
import ProductView from "@/components/products/ProductView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || collectionPath(locale, "products", `/${slug}`);
  const [result, settings, alternates] = await Promise.all([
    getProductQuery(locale, slug),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
  ]);
  const product = result?.data.products;
  const dict = getDictionary(locale);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    alternates,
    seo: product?.seo,
    fallbackTitle:
      product?.title || `${dict.products.pageTitle} — ${settings?.title || dict.siteName}`,
    fallbackDescription: product?.excerpt,
    fallbackOgImage: product?.coverImage,
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const [result, allProducts] = await Promise.all([
    getProductQuery(locale, slug),
    getProducts(locale),
  ]);

  // getProductQuery resolves the slug via a draft-filtered query, so a
  // draft product already can't be reached here — same tradeoff as blog,
  // see the "Drafts" note in CLAUDE.md.
  if (!result) notFound();

  const relatedProducts = getRelatedEntries("products", allProducts, slug, 3);

  return (
    <ProductView
      query={result.query}
      variables={result.variables}
      data={result.data}
      locale={locale}
      relatedProducts={relatedProducts}
    />
  );
}
