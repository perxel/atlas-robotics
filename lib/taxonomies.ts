/**
 * One row per (content collection × taxonomy) attachment — see
 * tina/collections/shared-fields/taxonomy.schema.tsx for how a taxonomy is
 * registered (`defineTaxonomy`) and attached to a collection
 * (`taxonomyField`) in the Tina schema. This registry is what lets a single
 * generic archive route (app/[locale]/blog/[slug]/[term]/page.tsx — folder
 * named `[slug]` for a Next.js routing reason, see that file's comment) and
 * a single generic query helper (getEntriesByTaxonomy in
 * lib/tina-content.ts) serve every taxonomy without a bespoke route or
 * query function per taxonomy. Adding a taxonomy to blog later (e.g.
 * "countries") is one row here plus the Tina schema change — no new route.
 */
export type TaxonomyRegistryEntry = {
  /** Tina collection name the taxonomy is attached to, e.g. "blog". */
  collection: string;
  /** Tina taxonomy collection name, e.g. "categories". */
  taxonomy: string;
  /** URL segment identifying this taxonomy, e.g. "category" in /blog/category/<slug>. */
  urlSegment: string;
  /** Field name on the content collection holding the taxonomy field. */
  fieldName: string;
};

export const taxonomyRegistry: TaxonomyRegistryEntry[] = [
  { collection: "blog", taxonomy: "categories", urlSegment: "category", fieldName: "categories" },
];

export function getTaxonomyRegistryEntry(collection: string, urlSegment: string) {
  return taxonomyRegistry.find(
    (entry) => entry.collection === collection && entry.urlSegment === urlSegment
  );
}

export function getTaxonomiesForCollection(collection: string) {
  return taxonomyRegistry.filter((entry) => entry.collection === collection);
}
