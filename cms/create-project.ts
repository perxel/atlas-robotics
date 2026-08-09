import { CollectionService, type CollectionRegistryEntry } from "./collection";
import { TaxonomyService, type TaxonomyRegistryEntry } from "./taxonomy";
import { SingletonService, type SingletonRegistryEntry } from "./singleton";
import { PagesService, type PagesDeps } from "./pages";
import { LocaleAlternatesService } from "./locale-alternates";
import { DictionaryService, type DictionaryEntry } from "./multilingual";
import { SeoService } from "./seo";
import type { MultilingualService } from "./multilingual/MultilingualService";
import { createCmsDashboards } from "./create-dashboards";

/**
 * Composes every cms/ domain service into one working project — this is
 * cms/'s own equivalent of Tina's `defineConfig()`: a project hands it
 * data (registries, fetch functions), never re-derives the wiring between
 * services. TaxonomyService needing bound CollectionService methods,
 * LocaleAlternatesService needing bound methods from four services,
 * PagesService needing CMSMultilingual + CMSCollection — none of that
 * varies per project, so it lives here once instead of being hand-copied
 * into every project's lib/cms-server.ts.
 */

/**
 * The services composed below aren't uniform by accident, and deliberately
 * aren't forced into one shape — they fall into three genuinely different
 * kinds:
 *
 * - **Registry + real query logic**: `CollectionService`, `TaxonomyService`.
 *   Generic over `TName`, a `Record<TName, Entry>` registry, and real
 *   per-entry behavior (draft filter, sort, paginate, slug-resolve,
 *   cross-locale alternates, path building) — 200+ lines each.
 * - **Registry + trivial fetch**: `SingletonService`. Same `Record<TName,
 *   Entry>` constructor shape as above, but none of that query logic
 *   applies to a singleton, so it's ~30 lines total: look up by name, call
 *   `fetchDoc`, catch errors into `null`.
 * - **Singular, no name axis**: `PagesService` (exactly one `pages`
 *   collection) and `DictionaryService` (exactly one dictionary document).
 *   Neither is generic over a name because there's nothing to key on.
 *
 * `MultilingualService` isn't in this list at all — it does no document
 * fetching, it's pure locale config/routing (enabled locales, prefix
 * stripping, switcher data), a different concern entirely.
 *
 * A shared base class across the first three would save only their ~5-line
 * constructor shape, at the cost of forcing `SingletonService`'s 30 lines
 * into an inheritance relationship with `CollectionService`'s 200+ — the
 * same "shares a narrow contract, not the actual behavior" tradeoff
 * `ContentCollection`'s own comment below already rejects for
 * `PagesService`. Left as a repeated-by-hand convention, not shared code.
 */

/**
 * Every individually-publishable content document: `CollectionService`'s
 * registered collections (`blog`, `products`, ...) plus `pages`. This is
 * a content/data-scope grouping, not a routing one — every member has a
 * `slug`, is draft-filterable, and is paired across locales by filename
 * (see CLAUDE.md's "Drafts" and "Collection-backed listing pages"
 * sections). `pages` isn't a `CollectionService` registry entry (see
 * .claude/docs/01-collection.md addendum #4 — it has no fixed per-locale
 * URL prefix, so it can't fit that registry's shape) and `PagesService`
 * is deliberately not a subclass of `CollectionService` either: the two
 * share this narrow "publishable document" contract, but `CollectionService`
 * also carries pagination and taxonomy-relation logic that has no
 * equivalent meaning for `pages`, and is generic over many registered
 * names where `PagesService` is exactly one. This type is defined here,
 * not in cms/collection, precisely because it needs both services in
 * scope — cms/collection stays pages-agnostic on purpose.
 *
 * Deliberately excludes taxonomies (`categories`, `productCategories`)
 * and singletons (`site-settings`, `nav`, `footer`): a taxonomy term
 * isn't an individually-publishable document, and a singleton isn't
 * either, even if either later grows SEO fields of its own — "has SEO"
 * and "is a ContentCollection" are different, overlapping traits, not
 * the same set. See `SeoSource` in create-dashboards.ts, which is
 * allowed to grow beyond `ContentCollection` for exactly that reason.
 */
export type ContentCollection<TCollectionName extends string> = TCollectionName | "pages";
export function createCmsProject<
  TCollectionName extends string,
  TTaxonomyName extends string,
  TSingletonName extends string,
  TLocale extends string,
>(config: {
  locales: readonly TLocale[];
  defaultLocale: TLocale;
  siteUrl: string;
  CMSMultilingual: MultilingualService<TLocale>;
  collectionRegistry: Record<TCollectionName, CollectionRegistryEntry<TLocale>>;
  taxonomyRegistry: Record<TTaxonomyName, TaxonomyRegistryEntry<TCollectionName, TLocale>>;
  singletonRegistry: Record<TSingletonName, SingletonRegistryEntry<TLocale>>;
  pagesConfig: PagesDeps;
  dictionaryConfig: { fetchEntries: () => Promise<DictionaryEntry[]> };
  // NoInfer: without it, this union-of-both-generics array is itself a
  // candidate inference site for TCollectionName/TTaxonomyName, and TS
  // conflates the two (each element could satisfy either branch), widening
  // both to include the other's keys — confirmed live: it made
  // collectionRegistry appear to require taxonomy keys and vice versa.
  // NoInfer forces TCollectionName/TTaxonomyName to be inferred only from
  // collectionRegistry/taxonomyRegistry above, as intended.
  seoDashboardOrder?: readonly NoInfer<ContentCollection<TCollectionName> | TTaxonomyName>[];
}) {
  const CMSCollection = new CollectionService<TCollectionName, TLocale>(config.collectionRegistry, {
    defaultLocale: config.defaultLocale,
    locales: config.locales,
  });

  const CMSTaxonomy = new TaxonomyService<TTaxonomyName, TCollectionName, TLocale>(
    config.taxonomyRegistry,
    {
      getCollectionPath: CMSCollection.getCollectionPath.bind(CMSCollection),
      getCollectionItems: CMSCollection.getCollectionItems.bind(CMSCollection),
      getRelatedEntries: CMSCollection.getRelatedEntries.bind(CMSCollection),
    },
    { defaultLocale: config.defaultLocale, locales: config.locales }
  );

  const CMSSingleton = new SingletonService<TSingletonName, TLocale>(config.singletonRegistry, {
    defaultLocale: config.defaultLocale,
  });

  const CMSPages = new PagesService<TLocale>(
    config.pagesConfig,
    {
      localePath: config.CMSMultilingual.localePath.bind(config.CMSMultilingual),
      getCollectionPath: (args) =>
        CMSCollection.getCollectionPath({ collectionName: args.collectionName as TCollectionName, lang: args.lang }),
    },
    { locales: config.locales, defaultLocale: config.defaultLocale }
  );

  const CMSLocaleAlternates = new LocaleAlternatesService<TCollectionName, TTaxonomyName, TLocale>(
    {
      stripLocalePrefix: config.CMSMultilingual.stripLocalePrefix.bind(config.CMSMultilingual),
      localePath: config.CMSMultilingual.localePath.bind(config.CMSMultilingual),
      getCollectionForSegment: CMSCollection.getCollectionForSegment.bind(CMSCollection),
      getCollectionPath: CMSCollection.getCollectionPath.bind(CMSCollection),
      translateCollectionPath: CMSCollection.translateCollectionPath.bind(CMSCollection),
      getCollectionAlternates: CMSCollection.getCollectionAlternates.bind(CMSCollection),
      getListingPageFilename: CMSCollection.getListingPageFilename.bind(CMSCollection),
      resolveTaxonomyUrlSegment: CMSTaxonomy.resolveUrlSegment.bind(CMSTaxonomy),
      getTermAlternates: CMSTaxonomy.getTermAlternates.bind(CMSTaxonomy),
      getTaxonomyUrlSegment: CMSTaxonomy.getUrlSegment.bind(CMSTaxonomy),
      getPageFilenameBySlug: async (args) => {
        const result = await CMSPages.getBySlug<{ data: { pages?: { _sys: { relativePath: string } } | null } }>({
          lang: args.lang ?? config.defaultLocale,
          slug: args.slug,
        });
        const relativePath = result?.data.pages?._sys.relativePath;
        return relativePath ? (relativePath.split("/").pop()?.replace(/\.md$/, "") ?? null) : null;
      },
      getPageAlternates: CMSPages.getAlternates.bind(CMSPages),
      getListingAlternates: (args) =>
        CMSPages.getListingAlternates({ collectionName: args.collectionName, filename: args.filename }),
    },
    { locales: config.locales }
  );

  const CMSDictionary = new DictionaryService<TLocale>(config.dictionaryConfig, {
    defaultLocale: config.defaultLocale,
  });

  const CMSSeo = new SeoService<TLocale>({
    siteUrl: config.siteUrl,
    defaultLocale: config.defaultLocale,
    locales: config.CMSMultilingual.getEnabledLocales(),
  });

  /** Resolves the current page's URL in every other locale — see
   * LocaleAlternatesService for how each route shape is handled. */
  const resolveLocaleAlternates = (locale: TLocale, pathname: string) => CMSLocaleAlternates.resolve(locale, pathname);

  // Admin dashboard screens (JSX) — see create-dashboards.ts. Built from
  // the same instances above; no reason a project needs its own call site
  // for this, unlike the registries themselves (see that file's header).
  const { seoDashboardScreen, translationDashboardScreen } = createCmsDashboards({
    CMSCollection,
    CMSPages,
    CMSTaxonomy,
    CMSMultilingual: config.CMSMultilingual,
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    seoDashboardOrder: config.seoDashboardOrder,
  });

  return {
    CMSCollection,
    CMSTaxonomy,
    CMSSingleton,
    CMSPages,
    CMSLocaleAlternates,
    CMSDictionary,
    CMSSeo,
    resolveLocaleAlternates,
    seoDashboardScreen,
    translationDashboardScreen,
  };
}
