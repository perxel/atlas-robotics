import { createTranslationDashboardScreen, TranslationDashboardService } from "@/cms/multilingual";
import { SeoDashboardService, createSeoDashboardScreen } from "@/cms/seo";
import { CMSCollection, CMSMultilingual, CMSPages, defaultLocale, locales, type CollectionKey } from "./cms";

// Tina admin plugin screens — kept out of lib/cms.ts since they're
// admin-only and project-specific (see .claude/docs/03-multilingual.md,
// 04-seo.md, 08-beyond-the-plan.md for the design behind this).

// `pages` isn't in CollectionService's registry (see
// .claude/docs/01-collection.md), so it's routed to CMSPages.getSeoIndex()
// instead of CMSCollection.getSeoIndex().
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

// Only registered when multilingual is on.
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
