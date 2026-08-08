import { createTranslationDashboardScreen, TranslationDashboardService } from "./multilingual";
import { SeoDashboardService, createSeoDashboardScreen } from "./seo";
import type { CollectionService } from "./collection";
import type { PagesService } from "./pages";
import type { MultilingualService } from "./multilingual/MultilingualService";

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
 * `"pages"` is folded into `SeoCollectionKey` because `pages` documents
 * are individually publishable content with their own SEO fields, but
 * `PagesService` isn't a `CollectionService` registry entry (see
 * .claude/docs/01-collection.md) — this distinction is structural to
 * cms/pages, not a per-project choice, so it belongs here rather than
 * being re-derived per project.
 */
export function createCmsDashboards<TCollectionName extends string, TLocale extends string>(config: {
  CMSCollection: CollectionService<TCollectionName, TLocale>;
  CMSPages: PagesService<TLocale>;
  CMSMultilingual: MultilingualService<TLocale>;
  locales: readonly TLocale[];
  defaultLocale: TLocale;
}) {
  type SeoCollectionKey = TCollectionName | "pages";

  const seoDashboardScreen = createSeoDashboardScreen(
    new SeoDashboardService<SeoCollectionKey, TLocale>(
      {
        getRegisteredCollectionNames: (): SeoCollectionKey[] => [
          ...config.CMSCollection.getRegisteredCollectionNames(),
          "pages",
        ],
        getSeoIndex: (collectionName) =>
          collectionName === "pages"
            ? config.CMSPages.getSeoIndex()
            : config.CMSCollection.getSeoIndex(collectionName as TCollectionName),
      },
      { locales: config.locales, defaultLocale: config.defaultLocale }
    )
  );

  const translationDashboardScreen = config.CMSMultilingual.isEnabled()
    ? createTranslationDashboardScreen(
        new TranslationDashboardService<TCollectionName, TLocale>(
          {
            getRegisteredCollectionNames: config.CMSCollection.getRegisteredCollectionNames.bind(config.CMSCollection),
            getItemLocaleIndex: config.CMSCollection.getItemLocaleIndex.bind(config.CMSCollection),
          },
          { locales: config.CMSMultilingual.getEnabledLocales(), defaultLocale: config.defaultLocale }
        )
      )
    : null;

  return { seoDashboardScreen, translationDashboardScreen };
}
