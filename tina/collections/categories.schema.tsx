import type { Collection } from "tinacms";
import { defineTaxonomy } from "@/cms/taxonomy";

export const categoriesCollection: Collection = defineTaxonomy({
  name: "categories",
  label: "Categories",
});
