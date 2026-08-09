import { createTranslationDashboardScreen, TranslationDashboardService } from "./multilingual";
import { SeoDashboardService, createSeoDashboardScreen } from "./seo";
import type { CollectionService } from "./collection";
import type { PagesService } from "./pages";
import type { TaxonomyService } from "./taxonomy";
import type { MultilingualService } from "./multilingual/MultilingualService";
import type { SeoService } from "./seo/SeoService";
import type { ContentCollection } from "./create-project";

/**
 * Wires the two admin dashboard screens (SEO score, translation coverage)
 * from an already-built CMSCollection/CMSPages/CMSTaxonomy/CMSMultilingual —
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
    /** Optional display order shared by both dashboards' rows — omit to use
     * whatever order `getRegisteredCollectionNames` returns. Names omitted
     * here sort to the end. Not currently set by any registered project. */
    dashboardOrder?: readonly (ContentCollection<TCollectionName> | TTaxonomyName)[];
  }
) {
  /**
   * The shared source set for both dashboards — deliberately *not* the same
   * type as `ContentCollection`, even though it's a superset of it:
   * taxonomies (`categories`, `productCategories`) have their own SEO
   * fields (a term's archive page, e.g. `/blog/category/news`, is a real
   * visited URL) and their own translation coverage (a term store is
   * itself locale-directory content, same as any other collection) without
   * being individually-publishable content themselves. "Has SEO/coverage"
   * and "is a ContentCollection" are different, overlapping traits.
   */
  type DashboardSource = ContentCollection<TCollectionName> | TTaxonomyName;

  const taxonomyNames = new Set<TTaxonomyName>(config.CMSTaxonomy.getRegisteredTaxonomyNames());
  const isTaxonomyName = (name: DashboardSource): name is TTaxonomyName => taxonomyNames.has(name as TTaxonomyName);

  const getRegisteredDashboardSourceNames = (): DashboardSource[] => [
    ...config.CMSCollection.getRegisteredCollectionNames(),
    "pages",
    ...config.CMSTaxonomy.getRegisteredTaxonomyNames(),
  ];

  const getLabel = (name: DashboardSource): string =>
    name === "pages"
      ? "Pages"
      : isTaxonomyName(name)
        ? config.CMSTaxonomy.getLabel(name)
        : config.CMSCollection.getLabel(name as TCollectionName);

  const getType = (name: DashboardSource): "content" | "taxonomy" => (isTaxonomyName(name) ? "taxonomy" : "content");

  const getSeoIndex = (name: DashboardSource) =>
    name === "pages"
      ? config.CMSPages.getSeoIndex()
      : isTaxonomyName(name)
        ? config.CMSTaxonomy.getSeoIndex(name)
        : config.CMSCollection.getSeoIndex(name as TCollectionName);

  const seoDashboardScreen = createSeoDashboardScreen(
    new SeoDashboardService<DashboardSource, TLocale>(
      {
        getRegisteredCollectionNames: getRegisteredDashboardSourceNames,
        getSeoIndex,
        getLabel,
        getType,
        seoService: config.CMSSeo,
      },
      { locales: config.locales, defaultLocale: config.defaultLocale, order: config.dashboardOrder }
    )
  );

  const translationDashboardScreen = config.CMSMultilingual.isEnabled()
    ? createTranslationDashboardScreen(
        new TranslationDashboardService<DashboardSource, TLocale>(
          {
            getRegisteredCollectionNames: getRegisteredDashboardSourceNames,
            // `getSeoIndex`'s `{filename, locale, slug, seo, fallback}` is
            // structurally compatible with the `{filename, locale}[]`
            // getItemLocaleIndex needs — reused as-is for "pages" and
            // taxonomies (neither has a lighter-weight index of its own);
            // regular collections get CollectionService's cheaper index
            // instead, since it doesn't need to read seo/slug at all.
            getItemLocaleIndex: (name) =>
              name === "pages" || isTaxonomyName(name) ? getSeoIndex(name) : config.CMSCollection.getItemLocaleIndex(name),
            getLabel,
            getType,
          },
          {
            locales: config.CMSMultilingual.getEnabledLocales(),
            defaultLocale: config.defaultLocale,
            order: config.dashboardOrder,
          }
        )
      )
    : null;

  return { seoDashboardScreen, translationDashboardScreen };
}
