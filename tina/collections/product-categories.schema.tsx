import type { Collection } from "tinacms";
import { defineTaxonomy } from "@/cms/taxonomy";

export const productCategoriesCollection: Collection = defineTaxonomy({
  name: "productCategories",
  label: "Product Categories",
});
