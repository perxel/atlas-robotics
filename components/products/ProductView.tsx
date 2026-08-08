"use client";

import Link from "next/link";
import { useTina, tinaField } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import { type Locale, CMSCollection, CMSTaxonomy, siteUrl, type getProducts, CMSMultilingual } from "@/lib/cms";
import { translateText } from "@/cms/multilingual";
import { buildBreadcrumbJsonLd, type BreadcrumbItem } from "@/cms/seo";
import type { ProductsQuery, ProductsQueryVariables } from "@/tina/__generated__/types";
import Breadcrumb from "@/components/Breadcrumb";

export default function ProductView({
  query,
  variables,
  data,
  locale,
  relatedProducts,
  uiDictionary,
  contactHref,
}: {
  query: string;
  variables: ProductsQueryVariables;
  data: ProductsQuery;
  locale: Locale;
  relatedProducts: Awaited<ReturnType<typeof getProducts>>;
  uiDictionary: Record<string, string>;
  /** Real URL of the contact page in this locale, resolved from its actual
   * content (see getPageAlternates) — omitted (not a hardcoded fallback)
   * when that page doesn't exist in this locale, so the CTA just doesn't render. */
  contactHref?: string;
}) {
  // No-op outside Tina's admin preview iframe — returns `data` unchanged,
  // so this renders identically for normal visitors and the production build.
  const { data: liveData } = useTina({ query, variables, data });
  const product = liveData.products;
  const t = (text: string) => translateText(uiDictionary, text);
  const productsPath = (rest = "") =>
    CMSCollection.getCollectionPath({ collectionName: "products", lang: locale, rest });

  type CategoryItem = NonNullable<NonNullable<typeof product.productCategories>[number]>;
  const categories = (product.productCategories ?? []).filter(
    (c): c is CategoryItem & { term: NonNullable<CategoryItem["term"]> } => !!c?.term
  );
  const highlights = (product.highlights ?? []).filter((h): h is string => !!h);

  const trail: BreadcrumbItem[] = [
    { label: t("Home"), href: CMSMultilingual.localePath(locale, "/") },
    { label: t("Products"), href: productsPath() },
    { label: product.title },
  ];

  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-12">
        {product.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.coverImage}
            alt={product.coverImageAlt || ""}
            data-tina-field={tinaField(product, "coverImage")}
            className="aspect-video w-full rounded-lg object-cover"
          />
        )}

        {categories.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <Link
                key={c.term.slug}
                href={
                  CMSTaxonomy.getArchivePath({
                    collectionName: "products",
                    taxonomyName: "productCategories",
                    lang: locale,
                    termSlug: c.term.slug,
                  }) ?? "#"
                }
                data-tina-field={tinaField(c)}
                className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-foreground hover:opacity-80"
              >
                {c.term.title}
              </Link>
            ))}
          </div>
        )}

        <h1 data-tina-field={tinaField(product, "title")} className="mt-3 text-3xl font-semibold">
          {product.title}
        </h1>
        <div className="mt-2">
          <Breadcrumb items={trail} />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(trail, siteUrl)) }}
          />
        </div>
        {product.excerpt && (
          <p data-tina-field={tinaField(product, "excerpt")} className="mt-2 text-muted-foreground">
            {product.excerpt}
          </p>
        )}
        {product.price && (
          <p data-tina-field={tinaField(product, "price")} className="mt-4 text-xl font-semibold">
            {product.price}
          </p>
        )}

        {highlights.length > 0 && (
          <ul
            data-tina-field={tinaField(product, "highlights")}
            className="mt-6 space-y-2 text-sm text-foreground"
          >
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 text-accent">✓</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        )}

        <div data-tina-field={tinaField(product, "body")} className="prose prose-sm mt-8 max-w-none">
          <TinaMarkdown content={product.body} />
        </div>

        {contactHref && (
          <div className="mt-10">
            <Link
              href={contactHref}
              className="inline-block rounded bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              {t("Get started")}
            </Link>
          </div>
        )}
      </article>

      {relatedProducts.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-xl font-semibold">{t("Related products")}</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((related) => (
              <Link
                key={related.id}
                href={productsPath(`/${related.slug}`)}
                className="block overflow-hidden rounded-lg border border-border bg-surface hover:border-accent"
              >
                {related.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={related.coverImage}
                    alt={related.coverImageAlt || ""}
                    className="aspect-video w-full object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold">{related.title}</h3>
                  {related.excerpt && (
                    <p className="mt-2 text-sm text-muted-foreground">{related.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href={productsPath()}
              className="inline-block rounded bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              {t("View all products")}
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
