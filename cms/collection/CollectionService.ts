import { DEFAULT_PAGE_SIZE, paginateItems } from "@/cms/pagination";
import type { CollectionRegistryEntry, Edge, Paginated, SortSpec } from "./types";
import { inLocale } from "./internal/in-locale";
import { sortItems } from "./internal/sort-items";
import { resolveBySlug } from "./internal/resolve-by-slug";
import { resolveCrossLocaleAlternates } from "./internal/resolve-cross-locale-alternates";
import { getRelatedEntriesInternal } from "./internal/get-related-entries";
import { buildCollectionPath } from "./internal/collection-path";
import { collectionForSegment } from "./internal/collection-for-segment";
import { translateCollectionPath as translateCollectionPathInternal } from "./internal/translate-collection-path";
import { resolvePagesDocumentUrl as resolvePagesDocumentUrlInternal } from "./internal/resolve-pages-document-url";

/**
 * The `WP_Query` equivalent — generic fetch/filter/sort/paginate/related/
 * slug-resolution logic that takes *which collection* as a parameter,
 * instead of each collection hand-rolling its own copy. See
 * .claude/plans/01-collection.md.
 */
export class CollectionService<TCollectionName extends string, TLocale extends string> {
  #registry: Record<TCollectionName, CollectionRegistryEntry<TLocale>>;
  #defaultLocale: TLocale;
  #locales: readonly TLocale[];

  constructor(
    registry: Record<TCollectionName, CollectionRegistryEntry<TLocale>>,
    options: { defaultLocale: TLocale; locales: readonly TLocale[] }
  ) {
    this.#registry = registry;
    this.#defaultLocale = options.defaultLocale;
    this.#locales = options.locales;
  }

  /** Same prefixing rule as the project's locale routing: unprefixed for the
   * default locale, "/<locale>" prefix otherwise. Kept as a small private
   * copy rather than a cross-domain dependency on Multilingual — pure,
   * stateless, and only needs `defaultLocale`, which this class already has. */
  #localePath = (locale: TLocale, pathWithoutLocale: string): string => {
    const clean = pathWithoutLocale === "/" ? "" : pathWithoutLocale;
    return locale === this.#defaultLocale ? clean || "/" : `/${locale}${clean}`;
  };

  async getCollectionItems<T>(args: {
    collectionName: TCollectionName;
    lang?: TLocale;
    filter?: (item: T) => boolean;
    sort?: SortSpec<T>;
    /** Omit to get every matching item, unpaginated (currentPage=1, totalPages=1) —
     * matches how listing/related/block data is fetched in full and only paginated
     * at the specific UI call site that needs it. Pass a page number to paginate
     * at the fetch layer instead. */
    page?: number;
    pageSize?: number;
    /** Public-facing by default — set true for admin/dashboard tooling that needs to see drafts too. */
    includeDrafts?: boolean;
  }): Promise<Paginated<T>> {
    const entry = this.#registry[args.collectionName];
    const locale = args.lang ?? this.#defaultLocale;
    const edges = await entry.fetchEdges();
    type WithSys = T & { _sys: { breadcrumbs: string[] } };
    let items = inLocale<WithSys>(edges as Array<Edge<WithSys>>, locale) as T[];

    if (entry.draftFieldName && !args.includeDrafts) {
      const draftField = entry.draftFieldName;
      items = items.filter((item) => !(item as Record<string, unknown>)[draftField]);
    }
    if (args.filter) items = items.filter(args.filter);

    items = sortItems(items, args.sort);

    if (args.page === undefined) {
      return { items, currentPage: 1, totalPages: 1 };
    }
    return paginateItems(items, args.page, args.pageSize ?? DEFAULT_PAGE_SIZE);
  }

  /** Resolves by slug, returns null on any failure (not found, or a fetch
   * error) rather than throwing — a detail page's job is to 404, not crash. */
  async getCollectionItem<T>(args: {
    collectionName: TCollectionName;
    lang?: TLocale;
    slug: string;
  }): Promise<T | null> {
    const entry = this.#registry[args.collectionName];
    const locale = args.lang ?? this.#defaultLocale;
    try {
      return (await resolveBySlug({
        fetchEdges: entry.fetchEdges,
        fetchBySlug: entry.fetchBySlug,
        locale,
        slug: args.slug,
        draftFieldName: entry.draftFieldName,
      })) as T | null;
    } catch {
      return null;
    }
  }

  async getRelatedEntries<T extends { slug: string }>(args: {
    collectionName: TCollectionName;
    lang?: TLocale;
    slug: string;
    getTermSlugs: (item: T) => string[];
    limit?: number;
  }): Promise<T[]> {
    const { items } = await this.getCollectionItems<T>({
      collectionName: args.collectionName,
      lang: args.lang,
    });
    return getRelatedEntriesInternal(items, args.slug, args.getTermSlugs, args.limit ?? 3);
  }

  async getCollectionAlternates(args: {
    collectionName: TCollectionName;
    lang?: TLocale;
    slug: string;
  }): Promise<Partial<Record<TLocale, string>>> {
    const entry = this.#registry[args.collectionName];
    const locale = args.lang ?? this.#defaultLocale;
    const edges = await entry.fetchEdges();
    type AlternateDoc = { slug: string; _sys: { relativePath: string; breadcrumbs: string[] } };
    return resolveCrossLocaleAlternates<TLocale, AlternateDoc>({
      edges: edges as Array<Edge<AlternateDoc>>,
      locales: this.#locales,
      locale,
      slug: args.slug,
      buildUrl: (l, doc) =>
        this.getCollectionPath({ collectionName: args.collectionName, lang: l, rest: `/${doc.slug}` }),
    });
  }

  getCollectionPath(args: { collectionName: TCollectionName; lang?: TLocale; rest?: string }): string {
    const locale = args.lang ?? this.#defaultLocale;
    return buildCollectionPath(this.#registry, this.#localePath, locale, args.collectionName, args.rest);
  }

  getCollectionForSegment(segment: string): TCollectionName | null {
    return collectionForSegment(this.#registry, this.#locales, segment);
  }

  translateCollectionPath(pathWithoutLocale: string, lang: TLocale): string {
    return translateCollectionPathInternal(this.#registry, this.#locales, pathWithoutLocale, lang);
  }

  resolvePagesDocumentUrl(lang: TLocale, filename: string, slug: string): string {
    return resolvePagesDocumentUrlInternal(this.#registry, this.#localePath, lang, filename, slug);
  }

  getRegisteredCollectionNames(): TCollectionName[] {
    return Object.keys(this.#registry) as TCollectionName[];
  }

  /** The `pages` document (matched by filename) backing this collection's
   * listing page — see this class's registry shape. */
  getListingPageFilename(collectionName: TCollectionName): string {
    return this.#registry[collectionName].listingPageFilename;
  }

  /** Lightweight per-collection locale index — reuses fetchEdges(), reading
   * only `_sys.relativePath`/`_sys.breadcrumbs` instead of full content.
   * Always sees every item, drafts included — dashboard tooling needs the
   * full picture, not just what's public. */
  async getItemLocaleIndex(collectionName: TCollectionName): Promise<{ filename: string; locale: TLocale }[]> {
    const entry = this.#registry[collectionName];
    const edges = await entry.fetchEdges();
    return (edges || [])
      .map((edge) => edge?.node as { _sys?: { relativePath: string; breadcrumbs: string[] } } | undefined)
      .filter((node): node is { _sys: { relativePath: string; breadcrumbs: string[] } } => !!node?._sys)
      .map((node) => ({
        filename: node._sys.relativePath.split("/").pop()?.replace(/\.md$/, "") ?? node._sys.relativePath,
        locale: node._sys.breadcrumbs[0] as TLocale,
      }));
  }

  /** Per-document SEO index for the SEO dashboard — prefers a registered
   * `fetchSeoIndex`, otherwise falls back to reading `.seo`/`.slug` off the
   * same fetchEdges() results already used for everything else (works out
   * of the box for any collection whose fields include seoField()). */
  async getSeoIndex(
    collectionName: TCollectionName
  ): Promise<{ filename: string; locale: TLocale; slug: string; seo: unknown }[]> {
    const entry = this.#registry[collectionName];
    const edges = await (entry.fetchSeoIndex ?? entry.fetchEdges)();
    return (edges || [])
      .map(
        (edge) =>
          edge?.node as
            | { slug?: string; seo?: unknown; _sys?: { relativePath: string; breadcrumbs: string[] } }
            | undefined
      )
      .filter((node): node is NonNullable<typeof node> & { _sys: { relativePath: string; breadcrumbs: string[] } } =>
        !!node?._sys
      )
      .map((node) => ({
        filename: node._sys.relativePath.split("/").pop()?.replace(/\.md$/, "") ?? node._sys.relativePath,
        locale: node._sys.breadcrumbs[0] as TLocale,
        slug: node.slug ?? "",
        seo: node.seo,
      }));
  }
}
