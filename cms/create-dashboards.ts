import { createTranslationDashboardScreen, TranslationDashboardService } from "./multilingual";
import { SeoDashboardService, createSeoDashboardScreen } from "./seo";
import type { CollectionService } from "./collection";
import type { PagesService } from "./pages";
import type { TaxonomyService } from "./taxonomy";
import type { MultilingualService } from "./multilingual/MultilingualService";
import type { SeoService } from "./seo/SeoService";
import type { ContentCollection } from "./create-project";

/**
 * Wires the two admin dashboard screens (SEO coverage, translation
 * coverage) from an already-built CMSCollection/CMSPages/CMSMultilingual —
 * same generic DI wiring as create-project.ts, which calls this directly
 * and folds its two screens into its own return value. Kept as a separate
 * file for readability (SEO/multilingual dashboard wiring is its own
 * concern), not for any bundling reason: lib/cms-server.ts is never imported by a
 * client component or edge middleware (see lib/registry.ts's header), so
 * there's no hazard in its module graph also containing this JSX — the
 * generated-Tina-client-in-a-browser-bundle problem that motivated
 * splitting lib/registry.ts out doesn't apply here.
 *
 * Imports the `ContentCollection` *type* back from create-project.ts even
 * though create-project.ts calls this file — a type-only import, erased
 * at compile time, so it isn't a real runtime circular dependency.
 */
export function createCmsDashboards<TCollectionName extends string, TTaxonomyName extends string, TLocale extends string>(
  config: {
    CMSCollection: CollectionService<TCollectionName, TLocale>;
    CMSPages: PagesService<TLocale>;
    CMSTaxonomy: TaxonomyService<TTaxonomyName, TCollectionName, TLocale>;
    CMSMultilingual: MultilingualService<TLocale>;
    CMSSeo: SeoService<TLocale>;
    locales: readonly TLocale[];
    defaultLocale: TLocale;
    /** Optional display order for the SEO dashboard's rows — omit to use
     * whatever order `getRegisteredCollectionNames` returns. Names omitted
     * here sort to the end. Not currently set by any registered project. */
    seoDashboardOrder?: readonly (ContentCollection<TCollectionName> | TTaxonomyName)[];
  }
) {
  /**
   * The SEO dashboard's source set — deliberately *not* the same type as
   * `ContentCollection`, even though it's a superset of it: taxonomies
   * (`categories`, `productCategories`) have their own SEO fields (a
   * term's archive page, e.g. `/blog/category/news`, is a real visited
   * URL) without being individually-publishable content themselves. "Has
   * SEO" and "is a ContentCollection" are different, overlapping traits.
   */
  type SeoSource = ContentCollection<TCollectionName> | TTaxonomyName;

  const taxonomyNames = new Set<TTaxonomyName>(config.CMSTaxonomy.getRegisteredTaxonomyNames());
  const isTaxonomyName = (name: SeoSource): name is TTaxonomyName => taxonomyNames.has(name as TTaxonomyName);

  const getLabel = (name: SeoSource): string =>
    name === "pages"
      ? "Pages"
      : isTaxonomyName(name)
        ? config.CMSTaxonomy.getLabel(name)
        : config.CMSCollection.getLabel(name as TCollectionName);

  const getType = (name: SeoSource): "content" | "taxonomy" => (isTaxonomyName(name) ? "taxonomy" : "content");

  const seoDashboardScreen = createSeoDashboardScreen(
    new SeoDashboardService<SeoSource, TLocale>(
      {
        getRegisteredCollectionNames: (): SeoSource[] => [
          ...config.CMSCollection.getRegisteredCollectionNames(),
          "pages",
          ...config.CMSTaxonomy.getRegisteredTaxonomyNames(),
        ],
        getSeoIndex: (collectionName) =>
          collectionName === "pages"
            ? config.CMSPages.getSeoIndex()
            : isTaxonomyName(collectionName)
              ? config.CMSTaxonomy.getSeoIndex(collectionName)
              : config.CMSCollection.getSeoIndex(collectionName as TCollectionName),
        getLabel,
        getType,
        seoService: config.CMSSeo,
      },
      { locales: config.locales, defaultLocale: config.defaultLocale, order: config.seoDashboardOrder }
    )
  );

  const translationDashboardScreen = config.CMSMultilingual.isEnabled()
    ? createTranslationDashboardScreen(
        new TranslationDashboardService<ContentCollection<TCollectionName>, TLocale>(
          {
            getRegisteredCollectionNames: (): ContentCollection<TCollectionName>[] => [
              ...config.CMSCollection.getRegisteredCollectionNames(),
              "pages",
            ],
            getItemLocaleIndex: (collectionName) =>
              collectionName === "pages"
                ? config.CMSPages.getSeoIndex()
                : config.CMSCollection.getItemLocaleIndex(collectionName as TCollectionName),
          },
          { locales: config.CMSMultilingual.getEnabledLocales(), defaultLocale: config.defaultLocale }
        )
      )
    : null;

  return { seoDashboardScreen, translationDashboardScreen };
}
