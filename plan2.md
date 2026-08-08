# Refactor: extract a `/cms` framework layer

This plan is being built domain by domain. Current domain list (evolved from
the original collection/taxonomy/multilingual/seo/pagination/slug/drafts/
breadcrumb split as we went — drafts folded into Collection, breadcrumb
folded into SEO, and a new Tina Lifecycle Hooks domain got added): Collection,
Taxonomy, Multilingual, SEO (incl. breadcrumb), Pagination, Tina Lifecycle
Hooks, Slug. Each domain gets its own section below once we've talked it
through — don't read this as a finished plan yet.

## Context

This repo is meant to be released as a reusable TinaCMS + Next.js marketing-site
boilerplate for future client projects. Right now the reusable, feature-shaped
logic (SEO metadata, multilingual routing, taxonomy, pagination, breadcrumbs,
the custom Tina hooks for slugs/drafts/taxonomies, and the collection
query/fetch patterns) is scattered across `lib/` and
`tina/collections/shared-fields/`, interleaved with this project's own data
(its two locales, its `blog`/`products` collections, its Vietnamese/English
copy).

## Guiding rules

- `cms/` never imports from `tina/__generated__/*`, never hardcodes this
  project's `locales`/`defaultLocale`, never hardcodes a specific collection
  or taxonomy name (`blog`, `productCategories`, ...), never hardcodes
  translated strings, and never exports a `.tsx`/JSX component **for the
  public site**. One deliberate exception: Tina admin Screen plugins (see
  Multilingual → Translation Dashboard below) — those render inside Tina's
  own admin chrome, not the client's branded site, so they don't need
  per-project restyling the way `LanguageSwitcher`/`Breadcrumb`/`Pagination`
  do. Same reasoning Tina's own built-in `MediaUsageDashboardScreenPlugin`
  ships as a ready-made component, not a bring-your-own-UI hook.
- Each domain (`collection`, `taxonomy`, `seo`, ...) is a **class**, defined
  generically in `cms/<domain>/`. Its public methods are the whole point —
  `import { CMSCollection } from "@/lib/cms"` and typing `CMSCollection.`
  should show every method you can call. Internal helper logic lives in
  private methods / an `internal/` folder inside that domain's `cms/`
  subfolder, and is never imported directly from outside it.
- Registering actual project data (which collections/taxonomies/locales
  exist, which Tina query function backs each one) happens by
  **instantiating** these classes with real config — `new CollectionService({ blog: {...}, products: {...} })` — and that instantiation lives entirely
  in `lib/`, never in `cms/`. All of it lives in one file, `lib/cms.ts`,
  which exports one configured singleton per domain (`CMSCollection`,
  `CMSTaxonomy`, `CMSSeo`, ...). This is the one file a future project edits
  to register a new collection/taxonomy/locale — `cms/` itself never changes.
- Where a collection name is passed as an argument (`collectionName: "blog"`),
  it's typed as a union derived from the registry (`"blog" | "products"`),
  not a plain `string` — free autocomplete/typo-catching, no extra typing at
  any call site, small one-time cost in the class definition.

## Domain: Collection

The `WP_Query` equivalent — generic fetch/filter/sort/paginate/related/
slug-resolution logic that takes *which collection* as a parameter, instead
of each collection (`getBlogPosts`, `getProducts`, ...) hand-rolling its own
copy.

### `cms/collection/` (generic, reusable, no project data)

```
cms/collection/
  types.ts                # CollectionRegistryEntry<TCollectionName>,
                           # Edge<T>, SortSpec<T>, Paginated<T>
  CollectionService.ts     # the public class — see below
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

### `CollectionService` public API

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

**Addendum #1 (added while designing Multilingual below):** one more public
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
not just collection listings. They'll live in the `pagination` domain as
plain functions (confirmed when we discuss that domain).

### `lib/cms.ts` (new — project registration, not `cms/`)

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

### Call-site example (before → after)

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

**Addendum #2 (added while designing Drafts — folded in here, not its own
domain):** `draft` is a status of a collection item, not a separate concern.
Today's draft filter is baked into each collection's registered
`fetchEdges()` as a fixed GraphQL `filter: { draft: { eq: false } } }` —
which can never be toggled at call time (relevant because CLAUDE.md already
documents that as a real gap: drafts are invisible even inside Tina's own
admin preview pane, and real support needs Next.js preview mode later, not
built now but worth not architecturally blocking). Fix: `fetchEdges()`
fetches everything, drafts included; `CollectionService` filters them itself,
reusing the same generic `filter` predicate mechanism Taxonomy already uses —
no new mechanism needed.

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
moves to `cms/collection/draft.field.ts`, alongside the other per-function
files in that folder, since it's now understood as a Collection-domain
concern rather than a standalone one:

```ts
function draftField(): TinaField   // unchanged from today
```

**Addendum #3 (added while designing Pagination below):** the actual
array-slicing math behind `getCollectionItems`'s `page`/`pageSize` params is
`paginateItems()`, a plain function living in `cms/pagination/` — `internal/`
imports it directly (a normal import, not an injected dependency, since it's
pure/stateless — no constructor wiring needed the way Taxonomy needed
Collection's methods injected). `TaxonomyService.getItemsByTerm` never needs
its own copy: it fully delegates through the injected `getCollectionItems`,
passing a `filter` predicate, so pagination only ever happens in one place.

---

## Domain: Taxonomy

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

### `cms/taxonomy/` (generic, reusable, no project data)

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

### `TaxonomyService` public API

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

### `lib/cms.ts` — instantiation order matters

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

### Call-site example — answers "get blog posts in category news/music"

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

## Domain: Multilingual

Three pieces: (1) the locale/routing/switcher logic already scoped earlier,
now folded into a class the same way Collection/Taxonomy were, plus new
enable/disable-per-locale support; (2) a CMS-editable dictionary + a
WordPress-style `__()` lookup, replacing `lib/dictionary.ts`'s code-file
strings; (3) a Tina admin **Translation Dashboard** screen showing per-locale
content counts and translation coverage, modeled directly on Tina's own
built-in `MediaUsageDashboardScreenPlugin`.

### `cms/multilingual/` (generic, reusable, no project data)

```
cms/multilingual/
  types.ts                       # SwitcherEntry<TLocale>, DictionaryEntry,
                                  # CollectionCoverage<TCollectionName, TLocale>
  MultilingualService.ts          # locale routing + enable/disable + switcher data
  DictionaryService.ts             # __() lookup
  fields.ts                         # dictionaryEntriesField() and
                                     # switcherConfigField(locales) — two
                                     # composable Tina field factories (same
                                     # pattern as seoField()/draftField()), NOT
                                     # a whole-collection factory — a project
                                     # file assembles them into one collection,
                                     # same as any other shared-field helper
  internal/
    resolve-switcher-entries.ts        # merge CMS config overrides with locale
                                        # defaults, de-dupe, filter to available
  dashboard/
    TranslationDashboardService.ts       # per-collection, per-locale stats
    createTranslationDashboardScreen.tsx   # the one JSX exception — Tina
                                            # ScreenPlugin (admin-only UI)
```

### `MultilingualService` public API

```ts
class MultilingualService<TLocale extends string> {
  constructor(config: {
    locales: readonly TLocale[];          // every locale that HAS content
    defaultLocale: TLocale;
    enabledLocales?: readonly TLocale[];    // publicly visible subset; defaults
                                             // to `locales` (all enabled)
    enabled?: boolean;                        // whole feature on/off; defaults
                                               // to enabledLocales.length > 1
  })

  // routing (ported from today's lib/i18n.ts, unchanged behavior)
  isLocale(value: string): value is TLocale
  pathnameHasLocalePrefix(pathname: string): boolean
  stripLocalePrefix(pathname: string): string
  localePath(lang: TLocale, pathWithoutLocale: string): string

  // enable/disable — every public-facing surface (sitemap, hreflang,
  // switcher, dashboard visibility) reads these instead of `locales` directly
  isEnabled(): boolean
  getAllLocales(): readonly TLocale[]        // registered, enabled or not
  getEnabledLocales(): readonly TLocale[]     // publicly visible only
  isLocaleEnabled(lang: TLocale): boolean

  // switcher data — pure, no JSX (LanguageSwitcher.tsx stays in components/,
  // calls this for the merge/de-dupe/filter logic, renders the <Link>s itself)
  resolveSwitcherEntries(args: {
    currentLocale: TLocale;
    urls: Partial<Record<TLocale, string>>;
    labels?: Record<TLocale, string>;
    config?: Array<{ locale?: string | null; label?: string | null; flag?: string | null } | null> | null;
  }): SwitcherEntry<TLocale>[]
}
```

**What "disable a locale" actually means:** disabling `zh` never touches its
content — every `content/<collection>/zh/*` document stays exactly as-is and
is still directly editable in Tina. Disabling only removes it from
*discovery* surfaces: `app/sitemap.ts` calls `getEnabledLocales()` instead of
iterating `locales`; hreflang generation (`resolveLocaleAlternates` /
`buildAlternates` in the SEO domain) skips disabled locales when building the
alternates map; `LanguageSwitcher` never shows a disabled locale (its `urls`
map is built from `getEnabledLocales()`); the Translation Dashboard screen
itself doesn't register at all when `isEnabled()` is `false`. **Decided:** a
disabled locale's URL redirects to the (default-locale) home page rather than
404ing or staying reachable — same "no dangling/dead URL" principle
`middleware.ts` already applies to the unprefixed-vs-prefixed default-locale
routing today. Implemented in `middleware.ts`: after resolving the requested
locale, check `CMSMultilingual.isLocaleEnabled(locale)` and redirect to `/`
if it's `false`, before any further route matching happens.

### Dictionary + `__()`

Replaces `lib/dictionary.ts`'s hardcoded per-locale TS objects with one
CMS-editable collection, and a WordPress-style lookup: the call **is** the
source text (`__("Read more")`), not an abstract key (`t("common.readMore")`)
— untranslated strings just render as their English source, same as
WordPress. No i18n key-naming discipline needed, and every string works the
moment it's written in code, translation optional after the fact.

```ts
type DictionaryEntry = { key: string; values: Partial<Record<Locale, string>> };

class DictionaryService<TLocale extends string> {
  constructor(
    deps: { fetchEntries: () => Promise<DictionaryEntry[]> },
    options: { defaultLocale: TLocale }
  )

  // One fetch per request — wrap the call site in React's cache() (same
  // pattern getPageQuery etc. already use) so multiple components in one
  // render share it. Returns a SYNCHRONOUS lookup function: await once at
  // the top of a page, then call __() freely and inline through JSX below
  // it, same ergonomics as today's `const dict = getDictionary(locale)`.
  load(lang?: TLocale): Promise<(sourceText: string) => string>

  // one-shot convenience for a single lookup (still async, still a full fetch)
  translate(sourceText: string, lang?: TLocale): Promise<string>
}
```

```ts
// call site, e.g. inside a page or layout component
const __ = await CMSDictionary.load(locale);
// ...
<button>{__("Read more")}</button>
```

**Tina schema side, consolidated with the language switcher.** The
`languageSwitcher` field (display order / label overrides / flag per locale)
currently lives on `site-settings` — moving out of there and into this same
new collection, so there's one page in the admin for "everything about how
multiple languages behave," not switcher config on one page and translation
strings on another. `tina/collections/site-settings.schema.tsx` loses its
`languageSwitcher` field entirely.

`cms/multilingual/fields.ts` exports two composable field factories (not a
whole-collection factory — same pattern as `seoField()`/`draftField()`,
which are fields a project's schema file mixes in, not collections in their
own right):

```
dictionaryEntriesField(): TinaField
  entries: list of {
    key:    string, required   — the source text, e.g. "Read more"
    values: one optional string field PER LOCALE, generated dynamically from
            the `locales` array passed in — e.g. { vi: string?, zh: string? }.
            defaultLocale is intentionally omitted from `values`: the `key`
            itself already IS the default-locale text, nothing to duplicate.
  }

switcherConfigField(locales): TinaField
  switcher: list of { locale: string, label: string?, flag: image? }
  — same shape as today's site-settings `languageSwitcher` field, just
  relocated and now built by a generic factory instead of hand-written
  inline on that collection
```

A new project file, `tina/collections/multilingual.schema.tsx`, assembles
both into one global (`ui.global: true`), non-localized collection —
registered in `tina/config.ts`'s `collections` array like any other:

```ts
export const multilingualCollection: Collection = {
  name: "multilingual",
  label: "Multilingual",
  ui: { global: true },
  fields: [switcherConfigField(locales), dictionaryEntriesField()],
};
```

One admin page, two sections: switcher display settings on top, the
translation table below. `Header.tsx` (or wherever switcher config is read)
now queries this `multilingual` document instead of `getSiteSettings()`.

Honest caveat: Tina doesn't have a literal spreadsheet-grid field type —
`tinaTableTemplate` (checked in `node_modules/tinacms/dist/table.d.ts`) is
for embedding a markdown table *inside rich text*, not a data-grid UI. The
closest real UI is a `list` field of `{ key, values }` objects with
`itemProps` set so each row's collapsed label shows the key — same
repeatable-list pattern this schema already uses for `socialLinks`/footer
`columns`. It reads and edits like a table (one row per string, one column
per locale) even though it isn't a literal HTML grid.

### Translation Dashboard (Tina admin Screen)

Answers "this collection has 10 in en, 12 in vi, 4 in zh, % coverage" —
modeled directly on Tina's own built-in dashboard
(`node_modules/tinacms/dist/toolkit/plugin-screens/media-usage-dashboard-screen.d.ts`
+ `.../components/dashboard/media-usage-dashboard/`): a `ScreenPlugin`
(`createScreen({ name, Component, Icon, layout: "fullscreen", navCategory: "Dashboard" })`)
registered via `tina/config.ts`'s `cmsCallback`, the exact mechanism Tina
uses for `MediaUsageDashboardScreenPlugin`. Same shape as their
`useMediaUsageScanner` hook (async scan → `{ items, isLoading, refresh }`) →
`MediaUsageTable` component: here, `TranslationDashboardService.getStats()`
→ a table component with one row per collection, one column per enabled
locale, plus a coverage %.

```ts
type CollectionCoverage<TCollectionName extends string, TLocale extends string> = {
  collectionName: TCollectionName;
  countsByLocale: Record<TLocale, number>;
  coveragePercentByLocale: Record<TLocale, number>;
  // % of defaultLocale's filenames that also have a same-filename document
  // in this locale — matches how cross-locale pairing already works
  // everywhere else in this app (CLAUDE.md: "Cross-locale linking is by
  // filename"), so coverage means "actually translated," not just "this
  // locale happens to have N documents that may not correspond to anything"
};

class TranslationDashboardService<TCollectionName extends string, TLocale extends string> {
  constructor(
    deps: {
      getRegisteredCollectionNames: () => TCollectionName[];
      getItemLocaleIndex: (collectionName: TCollectionName) => Promise<{ filename: string; locale: TLocale }[]>;
      // ^ both injected from CMSCollection, same Option-A pattern as Taxonomy
    },
    options: { locales: readonly TLocale[]; defaultLocale: TLocale }
  )

  getStats(): Promise<CollectionCoverage<TCollectionName, TLocale>[]>
}

function createTranslationDashboardScreen(
  dashboard: TranslationDashboardService<any, any>
): ScreenPlugin
// wraps createScreen({...}) from "tinacms" — the one cms/ file allowed to
// import React/JSX, per the guiding-rules exception above
```

### `lib/cms.ts` additions

```ts
export const CMSMultilingual = new MultilingualService({
  locales,               // from lib/i18n.ts
  defaultLocale,
  enabledLocales: ["en", "vi"],   // "zh" could be registered but not yet enabled
});

export const CMSDictionary = new DictionaryService(
  { fetchEntries: () => client.queries.multilingual({ relativePath: "index.json" })
      .then(r => r.data.multilingual.entries ?? []) },
  { defaultLocale }
);

// switcher config lives in the same document — a plain project-level fetch
// (lib/tina-content.ts, same shape as getSiteSettings), not a CMS* service
// method, since it's a one-off read passed straight into
// CMSMultilingual.resolveSwitcherEntries()'s `config` argument at the call site
export const getMultilingualSettings = () =>
  client.queries.multilingual({ relativePath: "index.json" }).then(r => r.data.multilingual);

// only exists — and only gets registered in tina/config.ts's cmsCallback —
// when multilingual is actually on
export const translationDashboardScreen = CMSMultilingual.isEnabled()
  ? createTranslationDashboardScreen(new TranslationDashboardService(
      {
        getRegisteredCollectionNames: () => ["blog", "products"],
        getItemLocaleIndex: CMSCollection.getItemLocaleIndex.bind(CMSCollection),
      },
      { locales: CMSMultilingual.getEnabledLocales(), defaultLocale }
    ))
  : null;
```

## Domain: SEO

Two pieces: `SeoService` (the existing `buildMetadata`/`buildAlternates` logic
from `lib/seo.ts`, ported to a class) and a **SEO Dashboard** — same idea and
same construction as the Translation Dashboard, tracking completeness of
`metaTitle`/`metaDescription`/`ogImage`/`ogImageAlt` per document per locale
instead of translation existence.

### `cms/seo/` (generic, reusable, no project data)

```
cms/seo/
  types.ts                # SeoFields, SeoAuditRow<TCollectionName, TLocale>,
                           # SeoCoverage<TCollectionName, TLocale>
  SeoService.ts             # buildMetadata / buildAlternates
  field.ts                   # seoField() — straight move, already generic
  dashboard/
    SeoDashboardService.ts     # coverage + audit, same shape as Translation Dashboard
    createSeoDashboardScreen.tsx # Tina ScreenPlugin (admin-only UI, JSX exception)
```

### `SeoService` public API

```ts
class SeoService<TLocale extends string> {
  constructor(options: { siteUrl: string; defaultLocale: TLocale; locales: readonly TLocale[] })

  buildAlternates(args: {
    pathWithoutLocale: string; lang: TLocale; alternates: Partial<Record<TLocale, string>>;
  }): { canonical: string; languages: Record<string, string> }

  buildMetadata(args: {
    lang: TLocale; pathWithoutLocale: string;
    alternates?: Partial<Record<TLocale, string>>;   // resolved externally — see below
    seo?: SeoFields;
    fallbackTitle: string; fallbackDescription?: string | null; fallbackOgImage?: string | null;
  }): Metadata   // Next.js Metadata — same shape/behavior as today's buildMetadata
}
```

`alternates` stays a plain input, not something `SeoService` resolves itself
via an injected Collection/Taxonomy capability (unlike `TaxonomyService`'s
Option A). Reason: "what's this page's alternates map" already has four
different resolution strategies depending on route type (collection detail
page, collection listing page, a `pages` document, or a taxonomy archive —
see today's `resolveLocaleAlternates`), and that dispatch logic already has
one home. Re-deciding it a second time inside `cms/seo` would duplicate it,
not simplify it. `SeoService` stays a pure "given a locale, a resolved
alternates map, and this document's SEO fields, build the tags" function.

### SEO Dashboard (Tina admin Screen)

Same construction as the Translation Dashboard: a coverage summary
(`getCoverage()`) plus a detail audit table (`getAudit()`) showing every
document's actual current SEO text across every locale, filterable to
only-incomplete rows.

```ts
type SeoAuditRow<TCollectionName extends string, TLocale extends string> = {
  collectionName: TCollectionName;
  locale: TLocale;
  slug: string;
  filename: string;
  seo: SeoFields;                          // the actual current values — "see current seo text"
  missingFields: Array<keyof SeoFields>;     // required fields that are genuinely empty
  usingFallback: Array<keyof SeoFields>;      // empty but a site-wide fallback covers it —
                                               // tracked separately from `missingFields` so
                                               // coverage % reflects real gaps, not
                                               // "hasn't been hand-tuned yet" (see open
                                               // question — default behavior, confirm or override)
};

type SeoCoverage<TCollectionName extends string, TLocale extends string> = {
  collectionName: TCollectionName;
  countsByLocale: Record<TLocale, number>;
  completeByLocale: Record<TLocale, number>;        // every required field explicitly set
  completionPercentByLocale: Record<TLocale, number>;
};

class SeoDashboardService<TCollectionName extends string, TLocale extends string> {
  constructor(
    deps: {
      getRegisteredCollectionNames: () => TCollectionName[];
      getSeoIndex: (collectionName: TCollectionName)
        => Promise<{ filename: string; locale: TLocale; slug: string; seo: SeoFields }[]>;
    },
    options: {
      locales: readonly TLocale[];
      defaultLocale: TLocale;
      requiredFields?: Array<keyof SeoFields>;   // defaults to ["metaTitle", "metaDescription"];
                                                  // a project decides whether ogImage is mandatory
    }
  )

  getCoverage(): Promise<SeoCoverage<TCollectionName, TLocale>[]>
  getAudit(args?: { collectionName?: TCollectionName; onlyMissing?: boolean })
    : Promise<SeoAuditRow<TCollectionName, TLocale>[]>
}

function createSeoDashboardScreen(dashboard: SeoDashboardService<any, any>): ScreenPlugin
```

**Addendum to Collection:** one more optional registry capability, parallel
to `getItemLocaleIndex` —

```ts
  // on CollectionService's registry entry, per collection:
  fetchSeoIndex?: () => Promise<Edge<{ slug: string; seo: SeoFields; _sys: {...} }>[]>
```

Optional because not every registered collection necessarily carries
`seoField()` (this repo's `blog`/`products`/`pages` do; a future collection
might not). Also note: `pages` isn't currently in `CollectionService`'s
example registry (only `blog`/`products` were shown earlier) — since `pages`
also carries `seoField()`, it needs registering there too for the SEO
Dashboard (and sitemap) to see it. Flagging, not resolving now — comes up
again once we get to the `pages`/routing domain.

### `lib/cms.ts` additions

```ts
export const CMSSeo = new SeoService({ siteUrl, defaultLocale, locales });

export const seoDashboardScreen = createSeoDashboardScreen(new SeoDashboardService(
  {
    getRegisteredCollectionNames: () => ["blog", "products", "pages"],
    getSeoIndex: CMSCollection.getSeoIndex.bind(CMSCollection),
  },
  { locales, defaultLocale }
));
// unlike the Translation Dashboard, not gated behind CMSMultilingual.isEnabled() —
// SEO completeness matters even on a single-locale site
```

```ts
// tina/config.ts
cmsCallback: (cms) => {
  if (translationDashboardScreen) cms.plugins.add(translationDashboardScreen);
  cms.plugins.add(seoDashboardScreen);
  return cms;
},
```

### Breadcrumb (folded in here, not its own domain)

The trail data (`Home > Blog > Post Title`) has two consumers: the UI list
(`components/Breadcrumb.tsx`, unchanged — still pure props-in, no logic to
extract) and breadcrumb `JSON-LD` structured data for search engines, which
this app has no structured data of any kind for yet. Same array, two
outputs, and generating the JSON-LD is squarely an SEO job — so the shared
type and the JSON-LD builder live under `cms/seo/breadcrumb/`, not as their
own domain.

Deliberately **not** a class with injected Collection/Taxonomy capabilities
(unlike Taxonomy → Collection) — same reasoning `SeoService.buildMetadata`
already applies to its `alternates` argument: which URLs/labels belong in a
page's trail differs by route type (collection detail vs. listing vs. a
`pages` doc vs. a taxonomy archive), and that dispatch already needs to
happen once, at the call site, using whichever `CMSCollection`/`CMSTaxonomy`
path builders are relevant there. Re-deciding it inside `cms/seo` too would
duplicate that dispatch, not simplify it — so this stays plain functions
over an already-built `BreadcrumbItem[]`, matching the Pagination domain's
reasoning for staying function-based rather than class-based.

```
cms/seo/breadcrumb/
  types.ts                       # BreadcrumbItem = { label: string; href?: string }
  build-breadcrumb-json-ld.ts      # buildBreadcrumbJsonLd(trail, siteUrl):
                                    # schema.org BreadcrumbList object
```

```ts
function buildBreadcrumbJsonLd(trail: BreadcrumbItem[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${siteUrl}${item.href}` } : {}),
    })),
  };
}
```

```ts
// call site, e.g. a blog post detail page — the page itself builds the
// trail using whatever path builders it already needs
const trail: BreadcrumbItem[] = [
  { label: __("Home"), href: "/" },
  { label: __("Blog"), href: CMSCollection.getCollectionPath({ collectionName: "blog", lang: locale }) },
  { label: post.title },   // current page, no href
];

<Breadcrumb items={trail} />
<script type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(trail, siteUrl)) }} />
```

## Domain: Pagination

The smallest domain — most of the real work already got folded into
`CollectionService`/`TaxonomyService` earlier. What's left is stateless
URL-shape and slicing math with no registry/config to inject, so per the
earlier decision this stays **plain functions**, not a class — no
`CMSPagination` instance needed anywhere.

### `cms/pagination/` (generic, reusable, no project data)

```
cms/pagination/
  types.ts                    # PageWindowItem = number | "ellipsis" — a
                               # semantic marker, not the "…" glyph itself;
                               # rendering that as "…" vs "..." vs an icon
                               # stays a components/ presentation choice
  constants.ts                  # DEFAULT_PAGE_SIZE — single source of truth
                                 # for "how many items per page by default,"
                                 # imported by CollectionService/TaxonomyService
                                 # as their pageSize fallback
  paginate-items.ts               # paginateItems<T>(items, page, pageSize):
                                   # Paginated<T> — the actual slicing math;
                                   # imported internally by Collection (see its
                                   # Addendum #3), also exported publicly for
                                   # any other ad-hoc paginated list
  parse-page-param.ts               # parsePageParam(value): number | null —
                                     # validates a `/page/[pageNum]` route
                                     # param (positive integer, no leading zero)
  canonical-page-href.ts              # canonicalPageHref(basePath, page): string
                                       # — basePath for page 1, basePath/page/N otherwise
  redirect-if-page-mismatch.ts          # redirectIfPageMismatch(requestedPage,
                                         # currentPage, basePath): void — calls
                                         # Next.js's redirect() (fine to import
                                         # next/navigation here: this whole
                                         # boilerplate targets Next.js, the
                                         # "no project data" rule is about
                                         # locale/collection/taxonomy specifics,
                                         # not the framework itself)
  build-page-window.ts                    # buildPageWindow(currentPage, totalPages):
                                           # PageWindowItem[] — extracted from
                                           # components/Pagination.tsx's current
                                           # private pageWindow() helper
  index.ts                                  # barrel re-exporting all of the above —
                                             # plain-function domains lose the
                                             # "type CMSFoo. and see everything"
                                             # discoverability a class gives for
                                             # free, so the barrel is what
                                             # restores "import from one place
                                             # and see the whole domain" here
```

### Call sites (unchanged behavior, just a new import path)

```ts
import { canonicalPageHref, buildPageWindow, parsePageParam, redirectIfPageMismatch }
  from "@/cms/pagination";

// components/Pagination.tsx — stays in components/ (design-specific, per the
// Multilingual/Breadcrumb precedent), now calls buildPageWindow() instead of
// its own private pageWindow()
const hrefFor = (page: number) => canonicalPageHref(basePath, page);
buildPageWindow(currentPage, totalPages).map((item) =>
  item === "ellipsis" ? <span key="…">…</span> : <Link key={item} href={hrefFor(item)}>{item}</Link>
);
```

`getCollectionItems`/`getItemsByTerm` already return `{ items, currentPage,
totalPages }` directly — nothing from this domain needs calling to fetch a
page of data, only to build the page-number UI and validate/redirect the
`/page/N` route param around it.

## Domain: Tina Lifecycle Hooks (new — not in the original domain list)

Tina gives each collection exactly **one** `ui.beforeSubmit` slot. Today
`slugLifecycleGuard` assumes it owns that slot entirely. That doesn't scale —
the moment a second independent check is needed (a required-field guard, an
auto-set-timestamp hook, anything else that should block or adjust a save),
someone has to hand-write a wrapper that calls both. So: a small, generic
composition utility, extendable by just appending to an array, not rewriting
anything. This is infrastructure every other hook-based feature plugs into —
not slug-specific, so it doesn't live under `cms/slug/`.

### `cms/tina-hooks/` (generic, reusable, no project data)

```
cms/tina-hooks/
  types.ts                    # BeforeSubmitArgs, BeforeSubmitHook
  compose-before-submit.ts      # composeBeforeSubmit(hooks): BeforeSubmitHook
```

```ts
type BeforeSubmitArgs = {
  values: Record<string, unknown>;
  cms: { api: { tina: { request: (query: string, opts: { variables: Record<string, unknown> })
    => Promise<{ data?: Record<string, any> }> } } };
  form: { path: string };
};
type BeforeSubmitHook = (args: BeforeSubmitArgs) => Promise<void> | void;

// Sequential, fail-fast: each hook is awaited before the next runs; the
// first thrown Error stops the save right there — same single-message UX
// slugLifecycleGuard already has today, just no longer assuming it's the
// only thing in beforeSubmit.
function composeBeforeSubmit(hooks: BeforeSubmitHook[]): BeforeSubmitHook {
  return async (args) => {
    for (const hook of hooks) await hook(args);
  };
}
```

**Convention going forward:** every collection wraps `beforeSubmit` in
`composeBeforeSubmit([...])`, even collections with only one hook today —
so adding a second one later is a one-line append, not a first-time refactor:

```ts
// tina/collections/blog.schema.tsx
ui: { beforeSubmit: composeBeforeSubmit([slugLifecycleGuard("blog")]) }

// tina/collections/pages.schema.tsx
ui: { beforeSubmit: composeBeforeSubmit([
  slugLifecycleGuard("pages", { lockedFilenames: lockedSlugFilenames }),
  // future: another independent guard, just another array entry
]) }
```

`assertSlugFieldsHaveGuard` (build-time check that every `slug` field has
*some* `beforeSubmit`) needs no change — it only checks `!!ui?.beforeSubmit`,
and a composed function is still truthy.

## Domain: Slug (Tina field hook)

### `cms/slug/` (generic, reusable, no project data)

```
cms/slug/
  field.ts                        # slugField(options?: { reserved?: Set<string> })
                                   # — unchanged, already generic
  slug-lifecycle-guard.ts           # slugLifecycleGuard(collectionName, options?):
                                     # BeforeSubmitHook — returns ONE hook now,
                                     # not the whole beforeSubmit function
  assert-slug-fields-have-guard.ts    # unchanged — build-time invariant check
```

```ts
function slugLifecycleGuard(
  collectionName: string,
  options?: { lockedFilenames?: Set<string> }
): BeforeSubmitHook {
  return async ({ values, cms, form }) => {
    // 1. uniqueness — unchanged from today
    // 2. lock check — now keyed off `options.lockedFilenames`, not a
    //    hardcoded `collectionName === "pages"` branch (the fix flagged
    //    back in the Guiding Rules: this was the one place a "generic"
    //    shared-field helper leaked project awareness)
    if (options?.lockedFilenames?.size) {
      // ...same on-disk-slug comparison logic as today, gated on this
      // collection actually having locked filenames to check at all
    }
    // ...
  };
}
```

`options.lockedFilenames` is passed in by the caller (`pages.schema.tsx`,
importing `lockedSlugFilenames` from `lib/pages-config.ts` same as today) —
`cms/slug` never imports project config directly.

### Call site

```ts
// tina/collections/pages.schema.tsx
import { lockedSlugFilenames } from "@/lib/pages-config";

ui: {
  beforeSubmit: composeBeforeSubmit([
    slugLifecycleGuard("pages", { lockedFilenames: lockedSlugFilenames }),
  ]),
}

// tina/collections/blog.schema.tsx / products.schema.tsx — no locked filenames
ui: { beforeSubmit: composeBeforeSubmit([slugLifecycleGuard("blog")]) }
```

`assertSlugFieldsHaveGuard(collections)` stays called once from
`tina/config.ts`, unchanged.

## Domains folded into others (no longer standalone)

- **Drafts** → folded into Collection (Addendum #2 above) — draft is a status
  of a collection item, not its own concern.
- **Breadcrumb** → folded into SEO (below) — the trail data feeds both the
  UI list and breadcrumb JSON-LD structured data, which is an SEO concern.
