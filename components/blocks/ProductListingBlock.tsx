import Link from "next/link";
import { tinaField } from "tinacms/dist/react";
import type { PagesBlocksProductListing } from "@/tina/__generated__/types";
import { collectionPath, type CollectionKey } from "@/lib/collection-slugs";
import { getDictionary } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";
import type { getProducts } from "@/lib/tina-content";

const COLLECTION: CollectionKey = "products";

export default function ProductListingBlock({
  data,
  products,
  locale,
}: {
  data: PagesBlocksProductListing;
  products: Awaited<ReturnType<typeof getProducts>>;
  locale: Locale;
}) {
  const dict = getDictionary(locale);

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      {data.subheading && (
        <p
          data-tina-field={tinaField(data, "subheading")}
          className="mb-8 text-sm text-muted-foreground"
        >
          {data.subheading}
        </p>
      )}

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
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
                        href={collectionPath(locale, COLLECTION, `/category/${c.term.slug}`)}
                        className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-foreground hover:opacity-80"
                      >
                        {c.term.title}
                      </Link>
                    ) : null
                  )}
                </div>
              )}
              <h2 className="font-semibold">
                <Link href={collectionPath(locale, COLLECTION, `/${product.slug}`)}>
                  {product.title}
                </Link>
              </h2>
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

      {products.length === 0 && (
        <p className="mt-8 text-sm text-muted-foreground">{dict.products.noProducts}</p>
      )}
    </section>
  );
}
