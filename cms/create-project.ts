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
    CMSMultilingual: config.CMSMultilingual,
    locales: config.locales,
    defaultLocale: config.defaultLocale,
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
