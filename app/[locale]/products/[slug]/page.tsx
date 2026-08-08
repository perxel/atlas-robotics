import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getProductQuery, CMSTaxonomy, CMSDictionary, CMSSeo, CMSCollection, CMSPages, type ProductItem, getSiteSettings, resolveLocaleAlternates } from "@/lib/cms-server";
import { defaultLocale, CMSMultilingual } from "@/lib/registry";
import { translateText } from "@/cms/multilingual";
import ProductView from "@/components/products/ProductView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  const headersList = await headers();
  const pathname =
    headersList.get("x-pathname") ||
    CMSCollection.getCollectionPath({ collectionName: "products", lang: locale, rest: `/${slug}` });
  const [result, settings, alternates, uiDictionary] = await Promise.all([
    getProductQuery(locale, slug),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
    CMSDictionary.loadMap(locale),
  ]);
  const product = result?.data.products;
  const t = (text: string) => translateText(uiDictionary, text);

  return CMSSeo.buildMetadata({
    lang: locale,
    pathWithoutLocale: CMSMultilingual.stripLocalePrefix(pathname),
    alternates,
    seo: product?.seo,
    fallbackTitle: product?.title || `${t("Products")} — ${settings?.title || t("Lorem ipsum")}`,
    fallbackDescription: product?.excerpt,
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = CMSMultilingual.isLocale(rawLocale) ? rawLocale : defaultLocale;
  const [result, relatedProducts, uiDictionary, contactAlternates] = await Promise.all([
    getProductQuery(locale, slug),
    CMSTaxonomy.getRelatedEntries<ProductItem>({
      collectionName: "products",
      taxonomyName: "productCategories",
      lang: locale,
      slug,
      limit: 3,
    }),
    CMSDictionary.loadMap(locale),
    CMSPages.getAlternates("contact"),
  ]);

  // getProductQuery resolves the slug via a draft-filtered query, so a
  // draft product already can't be reached here — same tradeoff as blog,
  // see the "Drafts" note in CLAUDE.md.
  if (!result) notFound();

  return (
    <ProductView
      query={result.query}
      variables={result.variables}
      data={result.data}
      locale={locale}
      relatedProducts={relatedProducts}
      uiDictionary={uiDictionary}
      contactHref={contactAlternates[locale]}
    />
  );
}
