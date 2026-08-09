"use client";

import Link from "next/link";
import { useTina, tinaField } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import type { Locale, ProductItem } from "@/lib/cms-server";
import { CMSMultilingual, CMSCollection, CMSTaxonomy } from "@/lib/registry";
import { siteUrl } from "@/cms/seo";
import { translateText } from "@/cms/multilingual";
import { buildBreadcrumbJsonLd, type BreadcrumbItem } from "@/cms/seo";
import type { ProductsQuery, ProductsQueryVariables } from "@/tina/__generated__/types";
import Breadcrumb from "@/components/Breadcrumb";
import CoverMedia from "@/components/CoverMedia";
import MediaGrid from "@/components/MediaGrid";

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
  relatedProducts: ProductItem[];
  uiDictionary: Record<string, string>;
  /** Real URL of the contact page in this locale, resolved from its actual
   * content (see CMSPages.getAlternates) — omitted (not a hardcoded fallback)
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
    { label: t(CMSCollection.getLabel("products")), href: productsPath() },
    { label: product.title },
  ];

  return (
    <>
      <article className="my-container py-12">
        {product.seo?.ogImage && (
          <CoverMedia
            src={product.seo.ogImage}
            alt={product.seo.ogImageAlt || product.title}
            dataTinaField={tinaField(product.seo, "ogImage")}
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

        <MediaGrid items={product.gallery ?? []} heading={t("Gallery")} />

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
        <section className="mx-auto my-container px-4 pb-16">
          <h2 className="text-xl font-semibold">{t("Related products")}</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((related) => (
              <Link
                key={related.id}
                href={productsPath(`/${related.slug}`)}
                className="block overflow-hidden rounded-lg border border-border bg-surface hover:border-accent"
              >
                {related.seo?.ogImage && (
                  <CoverMedia
                    src={related.seo.ogImage}
                    alt={related.seo.ogImageAlt || related.title}
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
