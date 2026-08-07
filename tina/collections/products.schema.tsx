import type { Collection } from "tinacms";
import { slugField, slugLifecycleGuard } from "./shared-fields/slug.schema";
import { draftField } from "./shared-fields/draft.schema";
import { seoField } from "./shared-fields/seo.schema";
import { taxonomyField } from "./shared-fields/taxonomy.schema";
import { collectionPath } from "@/lib/collection-slugs";
import type { Locale } from "@/lib/i18n";

export const productsCollection: Collection = {
  name: "products",
  label: "Products",
  path: "content/products",
  format: "md",
  ui: {
    // Same reasoning as blog's router (tina/collections/blog.schema.tsx):
    // derived from the filename (_sys.breadcrumbs), not the `slug` field —
    // `document` here only reliably carries `_sys` at runtime, matching
    // its TypeScript type. Uses collectionPath, not a literal "/products".
    router: ({ document }) => {
      const locale = document._sys.breadcrumbs[0] as Locale;
      const filename = document._sys.breadcrumbs[document._sys.breadcrumbs.length - 1];
      return collectionPath(locale, "products", `/${filename}`);
    },
    beforeSubmit: slugLifecycleGuard("products"),
  },
  fields: [
    { type: "string", name: "title", label: "Title", required: true },
    slugField(),
    draftField(),
    {
      type: "string",
      name: "excerpt",
      label: "Excerpt",
      description: "Short tagline shown on the product card and detail page.",
      ui: { component: "textarea" },
    },
    { type: "image", name: "coverImage", label: "Cover Image" },
    {
      type: "string",
      name: "coverImageAlt",
      label: "Cover Image Alt Text",
    },
    {
      type: "string",
      name: "price",
      label: "Price Label",
      description: 'Free text, e.g. "$29/mo".',
    },
    {
      type: "string",
      name: "highlights",
      label: "Highlights",
      list: true,
      description: "Short feature bullets shown on the product card and detail page.",
    },
    // See tina/collections/shared-fields/taxonomy.schema.tsx: `multiple`
    // defaults to true, so a product can carry several categories at once
    // — `product.productCategories` resolves as `{ term: ProductCategory }[]`.
    taxonomyField({ taxonomy: "productCategories", label: "Categories" }),
    {
      type: "rich-text",
      name: "body",
      label: "Body",
      isBody: true,
    },
    seoField(),
  ],
};
