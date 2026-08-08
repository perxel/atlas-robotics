# Domain: Taxonomy

See [`00-overview.md`](./00-overview.md) for cross-domain rules this file
assumes. Depends on [`01-collection.md`](./01-collection.md) (Option A
injection — see below).

WordPress-style: a taxonomy is not owned by one collection. The registry is
N:M — one taxonomy (e.g. `categories`) can list multiple collection
attachments, each with its own field name and URL segment. This repo's
actual content only attaches `categories` to `blog` and `productCategories`
to `products` today, but the registry shape supports sharing one taxonomy
across collections from day one, same as `register_taxonomy($tax, $postTypes)`.

`TaxonomyService` depends on `CollectionService` — decided as **Option A**:
it's handed a few functions from `CollectionService` at construction time
(not the whole class/instance, just the specific capabilities it needs), and
does the combining itself. This keeps the dependency one-directional
(Taxonomy → Collection, never the reverse) and gives one-call convenience
methods everywhere else, instead of every page having to call both services
and stitch results together by hand.

## `cms/taxonomy/` (generic, reusable, no project data)

```
cms/taxonomy/
  types.ts                  # TaxonomyRegistryEntry<TTaxonomyName, TCollectionName>,
                             # TermDoc, Paginated<T> (reused from collection/types.ts)
  TaxonomyService.ts         # the public class — see below
  internal/
    filter-by-term.ts          # pure array filter: does item[fieldName] contain
                                # a term with this slug
    resolve-cross-locale-alternates.ts
                                 # same shape as collection's version, reused for
                                 # a taxonomy term document instead of a content doc
```

## `TaxonomyService` public API

```ts
class TaxonomyService<TTaxonomyName extends string, TCollectionName extends string> {
  constructor(
    registry: Record<TTaxonomyName, {
      fetchTerms: () => Promise<Edge<TermDoc>[]>;
      attachments: Partial<Record<TCollectionName, {
        fieldName: string;
        urlSegment: Record<Locale, string>;
      }>>;
    }>,
    deps: {
      getCollectionPath: CollectionService<TCollectionName>["getCollectionPath"];
      getCollectionItems: CollectionService<TCollectionName>["getCollectionItems"];
      getRelatedEntries: CollectionService<TCollectionName>["getRelatedEntries"];
    },
    options: { defaultLocale: Locale }
  )

  // Same rule as CollectionService: every `lang` below is optional, falling
  // back to `options.defaultLocale`.

  // term data
  getTerms(args: { taxonomyName: TTaxonomyName; lang?: Locale }): Promise<TermDoc[]>
  getTerm(args: { taxonomyName: TTaxonomyName; lang?: Locale; slug: string }): Promise<TermDoc | null>
  getTermAlternates(args: { taxonomyName: TTaxonomyName; lang?: Locale; termSlug: string })
    : Promise<Partial<Record<Locale, string>>>

  // attachment lookups
  getTaxonomiesForCollection(collectionName: TCollectionName): TTaxonomyName[]
  getFieldName(args: { taxonomyName: TTaxonomyName; collectionName: TCollectionName }): string | null
  resolveUrlSegment(args: { collectionName: TCollectionName; lang?: Locale; urlSegment: string })
    : TTaxonomyName | null   // reverse lookup, used to parse an incoming archive URL

  // the convenient "collection items filtered by term" method —
  // built on top of the injected getCollectionItems + its own fieldName lookup
  getItemsByTerm<T>(args: {
    collectionName: TCollectionName; taxonomyName: TTaxonomyName; termSlug: string;
    lang?: Locale; sort?: SortSpec<T>; page?: number; pageSize?: number;
  }): Promise<Paginated<T>>

  // convenience wrapper over the injected getRelatedEntries — builds the
  // getTermSlugs extractor itself from its own attachments data
  getRelatedEntries<T>(args: {
    collectionName: TCollectionName; taxonomyName: TTaxonomyName;
    lang?: Locale; slug: string; limit?: number;
  }): Promise<T[]>

  getArchivePath(args: {
    collectionName: TCollectionName; taxonomyName: TTaxonomyName;
    lang?: Locale; termSlug: string;
  }): string | null   // combines injected getCollectionPath + own urlSegment + termSlug

  filterBySlug<T>(args: { items: T[]; taxonomyName: TTaxonomyName; collectionName: TCollectionName; termSlug: string })
    : T[]   // pure filter, for when the caller already has an array in hand

  // private — implemented via internal/*
  #resolveCrossLocaleAlternates(...)
}
```

## `lib/cms.ts` — instantiation order matters

```ts
export const CMSCollection = new CollectionService({ blog: {...}, products: {...} }, { defaultLocale });

export const CMSTaxonomy = new TaxonomyService(
  {
    categories: {
      fetchTerms: () => client.queries.categoriesConnection().then(r => r.data.categoriesConnection.edges),
      attachments: {
        blog: { fieldName: "categories", urlSegment: { en: "category", vi: "danh-muc" } },
      },
    },
    productCategories: {
      fetchTerms: () => client.queries.productCategoriesConnection().then(r => r.data.productCategoriesConnection.edges),
      attachments: {
        products: { fieldName: "productCategories", urlSegment: { en: "category", vi: "danh-muc" } },
      },
    },
  },
  {
    getCollectionPath: CMSCollection.getCollectionPath.bind(CMSCollection),
    getCollectionItems: CMSCollection.getCollectionItems.bind(CMSCollection),
    getRelatedEntries: CMSCollection.getRelatedEntries.bind(CMSCollection),
  },
  { defaultLocale }
);
```

## Call-site example — answers "get blog posts in category news/music"

```ts
// before — app/[locale]/blog/[slug]/[term]/page.tsx, hand-rolled:
// filterByTaxonomyTerm(await getBlogPosts(locale), "categories", termSlug), then paginate() separately

// after — one call, fetch + filter + paginate together
const { items, currentPage, totalPages } = await CMSTaxonomy.getItemsByTerm({
  collectionName: "blog", taxonomyName: "categories", termSlug: "news",
  lang: locale, page, pageSize,
});
// same call with termSlug: "music" just works — no new code, no new route,
// no new registry row beyond what's already declared above
```
