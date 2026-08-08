import Link from "next/link";
import { tinaField } from "tinacms/dist/react";
import type { PagesQuery } from "@/tina/__generated__/types";
import { collectionPath, type CollectionKey } from "@/lib/cms";
import { taxonomyArchivePath } from "@/lib/cms";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import type { getProducts } from "@/lib/cms";
import { paginateItems, DEFAULT_PAGE_SIZE } from "@/cms/pagination";
import Pagination from "@/components/Pagination";

const COLLECTION: CollectionKey = "products";

type Product = Awaited<ReturnType<typeof getProducts>>[number];

// Derived from PagesQuery itself, not the generated `PagesBlocksProductListing`
// type — Tina's codegen types a `reference` field's resolved value against
// the reusable single-document `Products` type (which requires `_values`,
// a `Document`-interface field only ever populated by a standalone
// `products(relativePath)` query), but a reference *nested inside another
// query* — like this block's `manualProducts` — never actually selects
// `_values`. The two are meant to be the same shape and aren't quite,
// which fails a strict assignment. Deriving straight from `PagesQuery`
// sidesteps the mismatch by using the type that matches what's actually on
// the wire, and happens to match `getProducts()`'s own (connection-query)
// item shape for the same reason.
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
      DEFAULT_PAGE_SIZE
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
}: {
  data: ProductListingData;
  products: Product[];
  locale: Locale;
  currentPage?: number;
}) {
  const dict = getDictionary(locale);
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
            <Link href={collectionPath(locale, COLLECTION, `/${product.slug}`)}>
              {product.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.coverImage}
                  alt={product.coverImageAlt || ""}
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
                          taxonomyArchivePath(COLLECTION, "productCategories", locale, c.term.slug) ?? "#"
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
                <Link href={collectionPath(locale, COLLECTION, `/${product.slug}`)}>
                  {product.title}
                </Link>
              </h3>
              {product.excerpt && (
                <p className="mt-2 text-sm text-muted-foreground">{product.excerpt}</p>
              )}
              <div className="mt-4 flex flex-1 items-end justify-between gap-3">
                {product.price && <span className="text-sm font-semibold">{product.price}</span>}
                <Link
                  href={collectionPath(locale, COLLECTION, `/${product.slug}`)}
                  className="text-sm font-medium text-accent hover:opacity-80"
                >
                  {dict.products.viewDetails}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">{dict.products.noProducts}</p>
      )}

      {data.mode !== "all" && (
        <div className="mt-8 text-center">
          <Link
            href={collectionPath(locale, COLLECTION)}
            className="text-sm font-medium text-accent hover:opacity-80"
          >
            {dict.products.viewAll}
          </Link>
        </div>
      )}

      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          basePath={collectionPath(locale, COLLECTION)}
          locale={locale}
        />
      )}
    </section>
  );
}
