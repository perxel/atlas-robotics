import type { Collection } from "tinacms";
import { defineTaxonomy } from "./shared-fields/taxonomy.schema";

// A taxonomy (see tina/collections/shared-fields/taxonomy.schema.tsx) —
// attached to `products` via `taxonomyField()`. Kept separate from blog's
// `categories` taxonomy rather than shared, matching the registry's "one
// row per collection x taxonomy" design (lib/cms.ts's taxonomy registry).
export const productCategoriesCollection: Collection = defineTaxonomy({
  name: "productCategories",
  label: "Product Categories",
});
