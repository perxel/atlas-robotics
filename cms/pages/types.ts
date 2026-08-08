import type { Edge } from "@/cms/collection";

export type PagesDoc = {
  slug: string;
  _sys: { relativePath: string; breadcrumbs: string[] };
};

export type PagesDeps = {
  /** Non-draft `pages` documents. Pass `slug` to filter at the query layer
   * for a single-document resolution (getBySlug); omit it to fetch every
   * page, for the cross-locale filename lookups (getAlternates/
   * getListingAlternates). */
  fetchConnection: (args?: { slug?: string }) => Promise<Array<Edge<PagesDoc>> | null | undefined>;
  /** Single-document fetch by relativePath — the raw `{data, query,
   * variables}` shape `useTina()` needs. */
  fetchByPath: (relativePath: string) => Promise<unknown>;
};

export type PagesInjected<TLocale extends string> = {
  /** Small bound copy of the project's locale-prefixing rule — same
   * "Option A" injection CollectionService/TaxonomyService already use, so
   * this class never needs its own defaultLocale-derived logic. */
  localePath: (locale: TLocale, pathWithoutLocale: string) => string;
  /** Bound `CollectionService.getCollectionPath`, needed only by
   * getListingAlternates — a collection's listing page's real URL is owned
   * by the collection registry, not by this document's own `slug` field. */
  getCollectionPath: (args: { collectionName: string; lang: TLocale }) => string;
};
