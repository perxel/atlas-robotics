import { createTranslationDashboardScreen, TranslationDashboardService } from "@/cms/multilingual";
import { SeoDashboardService, createSeoDashboardScreen } from "@/cms/seo";
import { CMSCollection, CMSMultilingual, CMSPages, defaultLocale, locales, type CollectionKey } from "./cms";

/**
 * Tina admin plugin screens — kept out of lib/cms.ts as a separate file
 * since these are admin-only (registered by tina/config.ts's cmsCallback,
 * never touched by the public app), unlike everything else lib/cms.ts
 * registers. Not project-generic either — SeoCollectionKey/getSeoIndexFor
 * below hardcode this project's "pages" collection and its configured
 * CMSCollection/CMSPages instances, so this can't live in cms/ (which never
 * hardcodes a project's collection names) — the actual generic machinery
 * (SeoDashboardService, createSeoDashboardScreen, TranslationDashboardService,
 * createTranslationDashboardScreen) already lives there, untouched.
 */

// `pages` isn't part of CollectionService's registry (its per-collection
// `locales`/`listingPageFilename` shape doesn't fit a slug-driven generic
// collection — see 01-collection.md's Addendum #4), so it's routed to
// CMSPages.getSeoIndex() instead of CMSCollection.getSeoIndex() — same
// shape, different service backing it.
type SeoCollectionKey = CollectionKey | "pages";

const getSeoIndexFor = (collectionName: SeoCollectionKey) =>
  collectionName === "pages" ? CMSPages.getSeoIndex() : CMSCollection.getSeoIndex(collectionName);

export const seoDashboardScreen = createSeoDashboardScreen(
  new SeoDashboardService(
    {
      getRegisteredCollectionNames: (): SeoCollectionKey[] => [
        ...CMSCollection.getRegisteredCollectionNames(),
        "pages",
      ],
      getSeoIndex: getSeoIndexFor,
    },
    { locales, defaultLocale }
  )
);

// Only registered when multilingual is actually on — a single-locale
// project has nothing to show a translation-coverage dashboard for.
export const translationDashboardScreen = CMSMultilingual.isEnabled()
  ? createTranslationDashboardScreen(
      new TranslationDashboardService(
        {
          getRegisteredCollectionNames: CMSCollection.getRegisteredCollectionNames.bind(CMSCollection),
          getItemLocaleIndex: CMSCollection.getItemLocaleIndex.bind(CMSCollection),
        },
        { locales: CMSMultilingual.getEnabledLocales(), defaultLocale }
      )
    )
  : null;
