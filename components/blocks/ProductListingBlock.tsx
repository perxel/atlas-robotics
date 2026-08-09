import Link from "next/link";
import { tinaField } from "tinacms/dist/react";
import type { PagesQuery } from "@/tina/__generated__/types";
import { translateText } from "@/cms/multilingual";
import type { Locale, CollectionKey, ProductItem } from "@/lib/cms-server";
import { CMSCollection, CMSTaxonomy } from "@/lib/registry";
import { paginateItems } from "@/cms/pagination";
import Pagination from "@/components/Pagination";
import CoverMedia from "@/components/CoverMedia";

const COLLECTION: CollectionKey = "products";

type Product = ProductItem;

// Derived from PagesQuery itself, not the generated `PagesBlocksProductListing`
// type — Tina's codegen types a `reference` field's resolved value against
// the reusable single-document `Products` type (which requires `_values`,
// a `Document`-interface field only ever populated by a standalone
// `products(relativePath)` query), but a reference *nested inside another
// query* — like this block's `manualProducts` — never actually selects
// `_values`. The two are meant to be the same shape and aren't quite,
// which fails a strict assignment. Deriving straight from `PagesQuery`
// sidesteps the mismatch by using the type that matches what's actually on
// the wire, and happens to match `ProductItem`'s own (connection-query)
// shape for the same reason.
type Blocks = NonNullable<PagesQuery["pages"]["blocks"]>;
type ProductListingData = Extract<
  NonNullable<Blocks[number]>,
  { __typename?: "PagesBlocksProductListing" }
>;

/** See ProductListingBlock.template.tsx for what each mode means. */
function resolveShownProducts(
  data: ProductListingData,
  products: Product[],
  currentPage: number
): { shown: Product[]; pagination: { currentPage: number; totalPages: number } | null } {
  if (data.mode === "manual") {
    const shown = (data.manualProducts ?? [])
      .map((item) => item?.product)
      .filter((product): product is NonNullable<typeof product> => Boolean(product));
    return { shown, pagination: null };
  }

  if (data.mode === "all") {
    const { items, currentPage: resolvedPage, totalPages } = paginateItems(
      products,
      currentPage,
      CMSCollection.getPageSize(COLLECTION)
    );
    return { shown: items, pagination: { currentPage: resolvedPage, totalPages } };
  }

  return { shown: products.slice(0, data.productsToShow || 3), pagination: null };
}

export default function ProductListingBlock({
  data,
  products,
  locale,
  currentPage = 1,
  uiDictionary,
}: {
  data: ProductListingData;
  products: Product[];
  locale: Locale;
  currentPage?: number;
  uiDictionary: Record<string, string>;
}) {
  const t = (text: string) => translateText(uiDictionary, text);
  const productPath = (rest = "") => CMSCollection.getCollectionPath({ collectionName: COLLECTION, lang: locale, rest });
  const { shown, pagination } = resolveShownProducts(data, products, currentPage);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h2 data-tina-field={tinaField(data, "heading")} className="text-2xl font-semibold">
        {data.heading}
      </h2>
      {data.subheading && (
        <p data-tina-field={tinaField(data, "subheading")} className="mt-3 text-muted-foreground">
          {data.subheading}
        </p>
      )}

      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((product) => (
          <div
            key={product.id}
            className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface hover:border-accent"
          >
            <Link href={productPath(`/${product.slug}`)}>
              {product.seo?.ogImage && (
                <CoverMedia
                  src={product.seo.ogImage}
                  alt={product.seo.ogImageAlt || product.title}
                  className="aspect-video w-full object-cover"
                />
              )}
            </Link>
            <div className="flex flex-1 flex-col p-4">
              {product.productCategories && product.productCategories.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {product.productCategories.map((c) =>
                    c?.term ? (
                      <Link
                        key={c.term.slug}
                        href={
                          CMSTaxonomy.getArchivePath({
                            collectionName: COLLECTION,
                            taxonomyName: "productCategories",
                            lang: locale,
                            termSlug: c.term.slug,
                          }) ?? "#"
                        }
                        className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-foreground hover:opacity-80"
                      >
                        {c.term.title}
                      </Link>
                    ) : null
                  )}
                </div>
              )}
              <h3 className="font-semibold">
                <Link href={productPath(`/${product.slug}`)}>
                  {product.title}
                </Link>
              </h3>
              {product.excerpt && (
                <p className="mt-2 text-sm text-muted-foreground">{product.excerpt}</p>
              )}
              <div className="mt-4 flex flex-1 items-end justify-between gap-3">
                {product.price && <span className="text-sm font-semibold">{product.price}</span>}
                <Link
                  href={productPath(`/${product.slug}`)}
                  className="text-sm font-medium text-accent hover:opacity-80"
                >
                  {t("View details")}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">{t("No products published yet.")}</p>
      )}

      {data.mode !== "all" && (
        <div className="mt-8 text-center">
          <Link
            href={productPath()}
            className="text-sm font-medium text-accent hover:opacity-80"
          >
            {t("View all products")}
          </Link>
        </div>
      )}

      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          basePath={productPath()}
          uiDictionary={uiDictionary}
        />
      )}
    </section>
  );
}
