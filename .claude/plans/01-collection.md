# Domain: Collection

See [`00-overview.md`](./00-overview.md) for cross-domain rules this file
assumes (Option A injection, optional `lang`, etc.).

The `WP_Query` equivalent — generic fetch/filter/sort/paginate/related/
slug-resolution logic that takes *which collection* as a parameter, instead
of each collection (`getBlogPosts`, `getProducts`, ...) hand-rolling its own
copy.

## `cms/collection/` (generic, reusable, no project data)

```
cms/collection/
  types.ts                # CollectionRegistryEntry<TCollectionName>,
                           # Edge<T>, SortSpec<T>, Paginated<T>
  CollectionService.ts     # the public class — see below
  draft.field.ts            # draftField() — see Addendum #2
  internal/
    in-locale.ts            # filters connection edges to one locale via
                             # _sys.breadcrumbs[0]
    sort-items.ts            # resolves a SortSpec ("dateDesc" | "titleAsc" |
                              # custom comparator) into an actual comparator
    resolve-by-slug.ts        # two-step: find relativePath via a slug-filtered
                               # lookup, then fetch the single doc
    resolve-cross-locale-alternates.ts
                                # find current doc's filename, find the sibling
                                # with that filename in every locale, map each
                                # to a URL
    get-related-entries.ts      # shared-taxonomy-term overlap, padded with
                                 # other entries if not enough overlap
    collection-path.ts           # locale-prefixed URL for a collection
    collection-for-segment.ts     # reverse lookup: URL segment -> collection name
    translate-collection-path.ts   # rewrites a path's leading collection
                                    # segment to another locale's spelling
    resolve-pages-document-url.ts   # special-cases "home" and a collection's
                                     # locked listing-page filename
```

## `CollectionService` public API

```ts
class CollectionService<TCollectionName extends string> {
  constructor(
    registry: Record<TCollectionName, {
      locales: Record<Locale, string>;
      listingPageFilename: string;
      fetchEdges: () => Promise<Edge<any>[]>;
      fetchBySlug: (relativePath: string) => Promise<any>;
    }>,
    options: { defaultLocale: Locale }
  )

  // Every `lang` below is optional — omit it and the service falls back to
  // `options.defaultLocale` from the constructor. That default is whatever
  // the project explicitly configured (lib/cms.ts, same value as
  // lib/i18n.ts's defaultLocale today), not a guess made up inside `cms/`.
  // A single-locale project can call every method below without ever
  // passing `lang` at all.

  // data fetching (pagination is a plain param — no separate paginate() call).
  // `filter` is a generic predicate, not taxonomy-specific — CollectionService
  // has zero knowledge of taxonomies. It's how TaxonomyService (below) builds
  // "items in this term" on top, without Collection depending on Taxonomy.
  getCollectionItems<T>(args: {
    collectionName: TCollectionName; lang?: Locale;
    filter?: (item: T) => boolean; sort?: SortSpec<T>; page?: number; pageSize?: number;
  }): Promise<Paginated<T>>

  getCollectionItem<T>(args: { collectionName: TCollectionName; lang?: Locale; slug: string })
    : Promise<T | null>

  // `getTermSlugs` is a plain function the caller supplies — Collection never
  // imports a taxonomy registry to know which fields hold terms.
  getRelatedEntries<T>(args: {
    collectionName: TCollectionName; lang?: Locale; slug: string;
    getTermSlugs: (item: T) => string[]; limit?: number;
  }): Promise<T[]>

  getCollectionAlternates(args: { collectionName: TCollectionName; lang?: Locale; slug: string })
    : Promise<Partial<Record<Locale, string>>>

  // routing/URL helpers (also used cross-domain by the multilingual alternates resolver)
  getCollectionPath(args: { collectionName: TCollectionName; lang?: Locale; rest?: string }): string
  getCollectionForSegment(segment: string): TCollectionName | null
  translateCollectionPath(pathWithoutLocale: string, lang: Locale): string
  resolvePagesDocumentUrl(lang: Locale, filename: string, slug: string): string
  // ^ these two keep `lang` required — it means "the OTHER locale to
  // translate this path into," which is always the whole point of calling
  // them (used by the multilingual alternates resolver to build every
  // locale's URL in a loop). There's no sensible default for "which locale
  // am I translating to."

  // private — not part of the public surface, implemented via internal/*
  #resolveBySlug(...)
  #resolveCrossLocaleAlternates(...)
  #inLocale(...)
  #sortItems(...)
}
```

**Addendum #1 (added while designing Multilingual):** one more public
method, needed by the Translation Dashboard to compute per-locale coverage
without fetching full document content:

```ts
  getItemLocaleIndex(collectionName: TCollectionName): Promise<{ filename: string; locale: Locale }[]>
  // lightweight — reuses the same fetchEdges() already in the registry,
  // just reads _sys.relativePath/_sys.breadcrumbs instead of full content
```

`parsePageParam`/`canonicalPageHref`/`redirectIfPageMismatch` (the `/page/N`
URL-shape helpers) stay **out** of this class — they're stateless string
helpers with no registry dependency, reused by taxonomy archive pages too,
not just collection listings. They live in the `pagination` domain
(`05-pagination.md`) as plain functions.

## `lib/cms.ts` (new — project registration, not `cms/`)

```ts
export const CMSCollection = new CollectionService(
  {
    blog: {
      locales: { en: "blog", vi: "tin-tuc" },
      listingPageFilename: "blog",
      fetchEdges: () => client.queries.blogConnection({ filter: { draft: { eq: false } } })
        .then(r => r.data.blogConnection.edges),
      fetchBySlug: (path) => client.queries.blog({ relativePath: path }),
    },
    products: {
      locales: { en: "products", vi: "san-pham" },
      listingPageFilename: "products",
      fetchEdges: () => client.queries.productsConnection({ filter: { draft: { eq: false } } })
        .then(r => r.data.productsConnection.edges),
      fetchBySlug: (path) => client.queries.products({ relativePath: path }),
    },
  },
  { defaultLocale }   // from lib/i18n.ts — the one place this project defines it
);
// CMSCollection's TCollectionName is inferred as "blog" | "products" — no
// extra typing needed here or at any call site.
```

This one file replaces what `lib/collection-slugs.ts` (registry) and most of
`lib/tina-content.ts` (`getBlogPosts`, `getProducts`, `getCategories`,
`getProductCategories`, `getBlogPostQuery`, `getProductQuery`,
`getCollectionListingAlternates`, `getCollectionDocAlternates`) currently do
by hand, per collection. `getSiteSettings`/`getNav`/`getFooter` and
`getPageBlockData` aren't collection-shaped (singleton docs / block-typename
dispatch) and stay as plain functions in `lib/tina-content.ts`, untouched.

## Call-site example (before → after)

```ts
// before — lib/tina-content.ts
export async function getBlogPosts(locale: Locale) {
  const res = await client.queries.blogConnection({ filter: { draft: { eq: false } } });
  const posts = inLocale(res.data.blogConnection.edges, locale);
  return posts.sort((a, b) => /* ... */);
}

// after — anywhere in the app
const { items, currentPage, totalPages } = await CMSCollection.getCollectionItems({
  collectionName: "blog", lang: locale, sort: "dateDesc", page, pageSize,
});
```

## Addendum #2 — Drafts (folded in here, not its own domain)

`draft` is a status of a collection item, not a separate concern. Today's
draft filter is baked into each collection's registered `fetchEdges()` as a
fixed GraphQL `filter: { draft: { eq: false } } }` — which can never be
toggled at call time (relevant because CLAUDE.md already documents that as a
real gap: drafts are invisible even inside Tina's own admin preview pane,
and real support needs Next.js preview mode later, not built now but worth
not architecturally blocking). Fix: `fetchEdges()` fetches everything,
drafts included; `CollectionService` filters them itself, reusing the same
generic `filter` predicate mechanism Taxonomy already uses — no new
mechanism needed.

```ts
  constructor(registry: Record<TCollectionName, {
    locales: Record<Locale, string>;
    listingPageFilename: string;
    fetchEdges: () => Promise<Edge<any>[]>;   // now returns everything, drafts included
    fetchBySlug: (relativePath: string) => Promise<any>;
    draftFieldName?: string;                    // e.g. "draft" — omit if this
                                                 // collection has no draft field at all
  }>, options: { defaultLocale: Locale })

  getCollectionItems<T>(args: {
    collectionName: TCollectionName; lang?: Locale;
    filter?: (item: T) => boolean; sort?: SortSpec<T>; page?: number; pageSize?: number;
    includeDrafts?: boolean;   // default false — public-facing by default
  }): Promise<Paginated<T>>
  // internally: if draftFieldName is registered and includeDrafts is false,
  // composes a draft-exclusion predicate with the caller's own `filter`
```

`getItemLocaleIndex`/`getSeoIndex` (dashboard-only, admin tooling) always see
everything regardless of `includeDrafts` — an editor auditing SEO gaps needs
to see drafts too, not just what's already public.

`draftField()` (the Tina field factory itself — unchanged, still generic)
lives in `cms/collection/draft.field.ts`, alongside the other per-function
files in that folder, since it's now understood as a Collection-domain
concern rather than a standalone one:

```ts
function draftField(): TinaField   // unchanged from today
```

## Addendum #3 — Pagination hookup

The actual array-slicing math behind `getCollectionItems`'s `page`/`pageSize`
params is `paginateItems()`, a plain function living in `cms/pagination/`
(see `05-pagination.md`) — `internal/` imports it directly (a normal import,
not an injected dependency, since it's pure/stateless — no constructor
wiring needed the way Taxonomy needed Collection's methods injected).
`TaxonomyService.getItemsByTerm` never needs its own copy: it fully
delegates through the injected `getCollectionItems`, passing a `filter`
predicate, so pagination only ever happens in one place.

## Addendum #4 — SEO hookup

One more optional registry capability, parallel to `getItemLocaleIndex`,
added while designing the SEO Dashboard (see `04-seo.md`):

```ts
  // on CollectionService's registry entry, per collection:
  fetchSeoIndex?: () => Promise<Edge<{ slug: string; seo: SeoFields; _sys: {...} }>[]>
```

Optional because not every registered collection necessarily carries
`seoField()` (this repo's `blog`/`products`/`pages` do; a future collection
might not). Also note: `pages` isn't currently in `CollectionService`'s
example registry above (only `blog`/`products` were shown) — since `pages`
also carries `seoField()`, it needs registering there too for the SEO
Dashboard (and sitemap) to see it. Flagging, not resolved yet — comes up
again once we get to the `pages`/routing domain.
