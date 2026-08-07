"use client";

import Link from "next/link";
import { useTina, tinaField } from "tinacms/dist/react";
import { TinaMarkdown } from "tinacms/dist/rich-text";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionary";
import type { ProductsQuery, ProductsQueryVariables } from "@/tina/__generated__/types";

export default function ProductView({
  query,
  variables,
  data,
  locale,
}: {
  query: string;
  variables: ProductsQueryVariables;
  data: ProductsQuery;
  locale: Locale;
}) {
  // No-op outside Tina's admin preview iframe — returns `data` unchanged,
  // so this renders identically for normal visitors and the production build.
  const { data: liveData } = useTina({ query, variables, data });
  const product = liveData.products;
  const dict = getDictionary(locale);

  type CategoryItem = NonNullable<NonNullable<typeof product.productCategories>[number]>;
  const categories = (product.productCategories ?? []).filter(
    (c): c is CategoryItem & { term: NonNullable<CategoryItem["term"]> } => !!c?.term
  );
  const highlights = (product.highlights ?? []).filter((h): h is string => !!h);

  return (
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
              href={localePath(locale, `/products/category/${c.term.slug}`)}
              data-tina-field={tinaField(c)}
              className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-foreground hover:opacity-80"
            >
              {c.term.title}
            </Link>
          ))}
        </div>
      )}

      <h1
        data-tina-field={tinaField(product, "title")}
        className="mt-3 text-3xl font-semibold"
      >
        {product.title}
      </h1>
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

      <div className="mt-10">
        <Link
          href={localePath(locale, "/contact")}
          className="inline-block rounded bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          {dict.products.getStarted}
        </Link>
      </div>
    </article>
  );
}
