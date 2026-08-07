import type { Locale } from "@/lib/i18n";
import { collectionPath, type CollectionKey } from "@/lib/collection-slugs";

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
  collection: CollectionKey;
  /** Tina taxonomy collection name, e.g. "categories". */
  taxonomy: string;
  /** URL segment identifying this taxonomy per locale, e.g. "category" (en)
   * / "danh-muc" (vi) in /blog/category/<slug> vs /vi/tin-tuc/danh-muc/<slug>.
   * This is a dynamic route param (the `[slug]` folder one level above
   * `[term]` — see archive.tsx), not a physical route folder, so unlike
   * lib/collection-slugs.ts's `locales` map it needs no matching
   * next.config.ts redirect/rewrite pair to make the translated segment
   * resolve. */
  urlSegment: Record<Locale, string>;
  /** Field name on the content collection holding the taxonomy field. */
  fieldName: string;
};

export const taxonomyRegistry: TaxonomyRegistryEntry[] = [
  {
    collection: "blog",
    taxonomy: "categories",
    urlSegment: { en: "category", vi: "danh-muc" },
    fieldName: "categories",
  },
  {
    collection: "products",
    taxonomy: "productCategories",
    urlSegment: { en: "category", vi: "danh-muc" },
    fieldName: "productCategories",
  },
];

export function getTaxonomyRegistryEntry(collection: string, locale: Locale, urlSegment: string) {
  return taxonomyRegistry.find(
    (entry) => entry.collection === collection && entry.urlSegment[locale] === urlSegment
  );
}

export function getTaxonomiesForCollection(collection: string) {
  return taxonomyRegistry.filter((entry) => entry.collection === collection);
}

/**
 * Full, locale-prefixed URL for a taxonomy archive page, e.g.
 * taxonomyArchivePath("blog", "categories", "vi", "news") ->
 * "/vi/tin-tuc/danh-muc/news". The one place that combines a collection's
 * own segment (collectionPath) with a taxonomy's per-locale urlSegment, so
 * link-building call sites (category/tag badges on post and product cards)
 * never spell out a literal "/category/" themselves — the same reasoning
 * collectionPath itself exists for "/blog" vs "/tin-tuc".
 */
export function taxonomyArchivePath(
  collection: CollectionKey,
  taxonomy: string,
  locale: Locale,
  termSlug: string
): string | null {
  const entry = taxonomyRegistry.find((e) => e.collection === collection && e.taxonomy === taxonomy);
  if (!entry) return null;
  return collectionPath(locale, collection, `/${entry.urlSegment[locale]}/${termSlug}`);
}
