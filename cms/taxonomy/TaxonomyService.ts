import type { Paginated } from "@/cms/collection";
import type { TaxonomyRegistryEntry, TermDoc } from "./types";
import { filterByTerm } from "./internal/filter-by-term";
import { resolveTermCrossLocaleAlternates } from "./internal/resolve-cross-locale-alternates";

type SortSpec<T> =
  | { field: keyof T & string; direction?: "asc" | "desc"; type?: "date" | "string" | "number" }
  | ((a: T, b: T) => number);

type TaxonomyDeps<TCollectionName extends string, TLocale extends string> = {
  getCollectionPath: (args: { collectionName: TCollectionName; lang?: TLocale; rest?: string }) => string;
  getCollectionItems: <T>(args: {
    collectionName: TCollectionName;
    lang?: TLocale;
    filter?: (item: T) => boolean;
    sort?: SortSpec<T>;
    page?: number;
    pageSize?: number;
  }) => Promise<Paginated<T>>;
  getRelatedEntries: <T extends { slug: string }>(args: {
    collectionName: TCollectionName;
    lang?: TLocale;
    slug: string;
    getTermSlugs: (item: T) => string[];
    limit?: number;
  }) => Promise<T[]>;
};

/**
 * WordPress-style: a taxonomy is not owned by one collection — the registry
 * is N:M, one taxonomy can attach to several collections, each with its own
 * field name and URL segment. Depends on CollectionService via "Option A"
 * injection (a few bound functions handed in at construction time, not the
 * whole class instance) — see .claude/plans/02-taxonomy.md.
 */
export class TaxonomyService<
  TTaxonomyName extends string,
  TCollectionName extends string,
  TLocale extends string,
> {
  #registry: Record<TTaxonomyName, TaxonomyRegistryEntry<TCollectionName, TLocale>>;
  #deps: TaxonomyDeps<TCollectionName, TLocale>;
  #defaultLocale: TLocale;
  #locales: readonly TLocale[];

  constructor(
    registry: Record<TTaxonomyName, TaxonomyRegistryEntry<TCollectionName, TLocale>>,
    deps: TaxonomyDeps<TCollectionName, TLocale>,
    options: { defaultLocale: TLocale; locales: readonly TLocale[] }
  ) {
    this.#registry = registry;
    this.#deps = deps;
    this.#defaultLocale = options.defaultLocale;
    this.#locales = options.locales;
  }

  async getTerms(args: { taxonomyName: TTaxonomyName; lang?: TLocale }): Promise<TermDoc[]> {
    const locale = args.lang ?? this.#defaultLocale;
    const edges = await this.#registry[args.taxonomyName].fetchTerms();
    return (edges || [])
      .map((edge) => edge?.node)
      .filter((node): node is TermDoc => !!node && node._sys.breadcrumbs[0] === locale)
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  async getTerm(args: { taxonomyName: TTaxonomyName; lang?: TLocale; slug: string }): Promise<TermDoc | null> {
    const terms = await this.getTerms({ taxonomyName: args.taxonomyName, lang: args.lang });
    return terms.find((t) => t.slug === args.slug) ?? null;
  }

  async getTermAlternates(args: {
    taxonomyName: TTaxonomyName;
    lang?: TLocale;
    termSlug: string;
  }): Promise<Partial<Record<TLocale, string>>> {
    const locale = args.lang ?? this.#defaultLocale;
    const edges = await this.#registry[args.taxonomyName].fetchTerms();
    return resolveTermCrossLocaleAlternates({
      edges,
      locales: this.#locales,
      locale,
      termSlug: args.termSlug,
    });
  }

  getTaxonomiesForCollection(collectionName: TCollectionName): TTaxonomyName[] {
    return (Object.keys(this.#registry) as TTaxonomyName[]).filter(
      (name) => this.#registry[name].attachments[collectionName]
    );
  }

  getFieldName(args: { taxonomyName: TTaxonomyName; collectionName: TCollectionName }): string | null {
    return this.#registry[args.taxonomyName].attachments[args.collectionName]?.fieldName ?? null;
  }

  resolveUrlSegment(args: {
    collectionName: TCollectionName;
    lang?: TLocale;
    urlSegment: string;
  }): TTaxonomyName | null {
    const locale = args.lang ?? this.#defaultLocale;
    for (const name of Object.keys(this.#registry) as TTaxonomyName[]) {
      const attachment = this.#registry[name].attachments[args.collectionName];
      if (attachment?.urlSegment[locale] === args.urlSegment) return name;
    }
    return null;
  }

  async getItemsByTerm<T extends Record<string, unknown>>(args: {
    collectionName: TCollectionName;
    taxonomyName: TTaxonomyName;
    termSlug: string;
    lang?: TLocale;
    sort?: SortSpec<T>;
    page?: number;
    pageSize?: number;
  }): Promise<Paginated<T>> {
    const fieldName = this.getFieldName({ taxonomyName: args.taxonomyName, collectionName: args.collectionName });
    return this.#deps.getCollectionItems<T>({
      collectionName: args.collectionName,
      lang: args.lang,
      sort: args.sort,
      page: args.page,
      pageSize: args.pageSize,
      filter: fieldName ? (item) => filterByTerm([item], fieldName, args.termSlug).length > 0 : () => false,
    });
  }

  async getRelatedEntries<T extends { slug: string }>(args: {
    collectionName: TCollectionName;
    taxonomyName: TTaxonomyName;
    lang?: TLocale;
    slug: string;
    limit?: number;
  }): Promise<T[]> {
    const fieldName = this.getFieldName({ taxonomyName: args.taxonomyName, collectionName: args.collectionName });
    return this.#deps.getRelatedEntries<T>({
      collectionName: args.collectionName,
      lang: args.lang,
      slug: args.slug,
      limit: args.limit,
      getTermSlugs: (item) => {
        if (!fieldName) return [];
        const terms = (item as Record<string, unknown>)[fieldName] as
          | Array<{ term?: { slug?: string | null } | null } | null>
          | null
          | undefined;
        return (terms ?? []).map((t) => t?.term?.slug).filter((slug): slug is string => !!slug);
      },
    });
  }

  /** The URL segment identifying this taxonomy on `collectionName`'s routes
   * for a given locale (e.g. "category" / "danh-muc") — used to rebuild a
   * taxonomy archive URL for every locale, not just the current one. */
  getUrlSegment(args: { collectionName: TCollectionName; taxonomyName: TTaxonomyName; lang?: TLocale }): string | null {
    const locale = args.lang ?? this.#defaultLocale;
    return this.#registry[args.taxonomyName].attachments[args.collectionName]?.urlSegment[locale] ?? null;
  }

  getArchivePath(args: {
    collectionName: TCollectionName;
    taxonomyName: TTaxonomyName;
    lang?: TLocale;
    termSlug: string;
  }): string | null {
    const locale = args.lang ?? this.#defaultLocale;
    const attachment = this.#registry[args.taxonomyName].attachments[args.collectionName];
    if (!attachment) return null;
    return this.#deps.getCollectionPath({
      collectionName: args.collectionName,
      lang: locale,
      rest: `/${attachment.urlSegment[locale]}/${args.termSlug}`,
    });
  }

  filterBySlug<T extends Record<string, unknown>>(args: {
    items: T[];
    taxonomyName: TTaxonomyName;
    collectionName: TCollectionName;
    termSlug: string;
  }): T[] {
    const fieldName = this.getFieldName({ taxonomyName: args.taxonomyName, collectionName: args.collectionName });
    if (!fieldName) return [];
    return filterByTerm(args.items, fieldName, args.termSlug);
  }
}
