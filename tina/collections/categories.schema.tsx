import type { Collection } from "tinacms";
import { defineTaxonomy } from "./shared-fields/taxonomy.schema";

// A taxonomy (see tina/collections/shared-fields/taxonomy.schema.tsx) —
// currently attached to `blog` via `taxonomyField()`. To add another
// (e.g. "countries"): defineTaxonomy() here, add it to the `collections`
// array in tina/config.ts, attach it to a collection with taxonomyField(),
// and add a row to lib/cms-server.ts's taxonomy registry for the archive route + filtering.
export const categoriesCollection: Collection = defineTaxonomy({
  name: "categories",
  label: "Categories",
});
