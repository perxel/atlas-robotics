import type { Collection } from "tinacms";
import { defineTaxonomy } from "@/cms/taxonomy";

// A taxonomy (see cms/taxonomy/define-taxonomy.ts) — attached to
// `products` via `taxonomyField()`. Kept separate from blog's
// `categories` taxonomy rather than shared, matching the registry's "one
// row per collection x taxonomy" design (lib/cms-server.ts's taxonomy registry).
export const productCategoriesCollection: Collection = defineTaxonomy({
  name: "productCategories",
  label: "Product Categories",
});
