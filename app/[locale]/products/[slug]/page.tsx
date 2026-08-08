import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { buildMetadata, stripLocale } from "@/lib/seo";
import { getSiteSettings } from "@/lib/tina-content";
import { getProductQuery, CMSTaxonomy, CMSDictionary, collectionPath, type ProductItem } from "@/lib/cms";
import { translateText } from "@/cms/multilingual";
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
  const [result, settings, alternates, uiDictionary] = await Promise.all([
    getProductQuery(locale, slug),
    getSiteSettings(locale),
    resolveLocaleAlternates(locale, pathname),
    CMSDictionary.loadMap(locale),
  ]);
  const product = result?.data.products;
  const t = (text: string) => translateText(uiDictionary, text);

  return buildMetadata({
    locale,
    pathWithoutLocale: stripLocale(pathname),
    alternates,
    seo: product?.seo,
    fallbackTitle: product?.title || `${t("Products")} — ${settings?.title || t("Lorem ipsum")}`,
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
  const [result, relatedProducts, uiDictionary] = await Promise.all([
    getProductQuery(locale, slug),
    CMSTaxonomy.getRelatedEntries<ProductItem>({
      collectionName: "products",
      taxonomyName: "productCategories",
      lang: locale,
      slug,
      limit: 3,
    }),
    CMSDictionary.loadMap(locale),
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
    />
  );
}
