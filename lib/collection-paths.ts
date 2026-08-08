import { CollectionService, type CollectionRegistryEntry } from "@/cms/collection";
import { TaxonomyService, type TaxonomyRegistryEntry } from "@/cms/taxonomy";
import { defaultLocale, type Locale, locales } from "./locale";

// Path-building config only — no fetchEdges/fetchBySlug/fetchTerms. Split
// out of lib/cms.ts for the same reason lib/locale.ts was: every "use
// client" component (PageView/ProductView/BlogPostView and every
// components/blocks/*.tsx they render — they're all inside that client
// module graph even without their own "use client") calls
// CMSCollection.getCollectionPath()/CMSTaxonomy.getArchivePath() to build
// links, but lib/cms.ts's top-level `import { client } from
// "@/tina/__generated__/client"` transitively needs node:crypto/fs/os/path
// (via tinacms/dist/client.js), which a browser webpack build can't
// resolve ("UnhandledSchemeError: Reading from 'node:crypto'..."). A named
// import only prevents *using* the rest of a module's exports, not a
// bundler including its other top-level side-effecting code — same
// constraint documented in lib/locale.ts and .claude/docs/00-overview.md,
// just hit here by the client bundle instead of the middleware Worker
// bundle. lib/cms.ts imports collectionPathConfig/taxonomyPathConfig from
// here and adds the data-fetching functions on top for its own
// (server-only) CMSCollection/CMSTaxonomy instances, so the locale-segment/
// URL-segment strings stay spelled out in exactly one place.

export const collectionPathConfig = {
  blog: {
    locales: { en: "blog", vi: "tin-tuc", zh: "blog" } as Record<Locale, string>,
    listingPageFilename: "blog",
  },
  products: {
    locales: { en: "products", vi: "san-pham", zh: "products" } as Record<Locale, string>,
    listingPageFilename: "products",
  },
};

type CollectionPathKey = keyof typeof collectionPathConfig;

export const taxonomyPathConfig = {
  categories: {
    attachments: {
      blog: {
        fieldName: "categories",
        urlSegment: { en: "category", vi: "danh-muc", zh: "category" } as Record<Locale, string>,
      },
    } as Partial<Record<CollectionPathKey, { fieldName: string; urlSegment: Record<Locale, string> }>>,
  },
  productCategories: {
    attachments: {
      products: {
        fieldName: "productCategories",
        urlSegment: { en: "category", vi: "danh-muc", zh: "category" } as Record<Locale, string>,
      },
    } as Partial<Record<CollectionPathKey, { fieldName: string; urlSegment: Record<Locale, string> }>>,
  },
};

type TaxonomyPathKey = keyof typeof taxonomyPathConfig;

const clientSideFetchNotAvailable = (): never => {
  throw new Error(
    "CMSCollection/CMSTaxonomy from lib/collection-paths only build URLs (no fetchEdges/fetchBySlug/fetchTerms) " +
      "so the generated Tina client never reaches the browser bundle. Import from lib/cms in a server component " +
      "for data-fetching methods."
  );
};

const collectionRegistry: Record<CollectionPathKey, CollectionRegistryEntry<Locale>> = Object.fromEntries(
  Object.entries(collectionPathConfig).map(([key, cfg]) => [
    key,
    { ...cfg, fetchEdges: clientSideFetchNotAvailable, fetchBySlug: clientSideFetchNotAvailable },
  ])
) as unknown as Record<CollectionPathKey, CollectionRegistryEntry<Locale>>;

export const CMSCollection = new CollectionService<CollectionPathKey, Locale>(collectionRegistry, {
  defaultLocale,
  locales,
});

const taxonomyRegistry: Record<TaxonomyPathKey, TaxonomyRegistryEntry<CollectionPathKey, Locale>> = Object.fromEntries(
  Object.entries(taxonomyPathConfig).map(([key, cfg]) => [key, { ...cfg, fetchTerms: clientSideFetchNotAvailable }])
) as unknown as Record<TaxonomyPathKey, TaxonomyRegistryEntry<CollectionPathKey, Locale>>;

export const CMSTaxonomy = new TaxonomyService<TaxonomyPathKey, CollectionPathKey, Locale>(
  taxonomyRegistry,
  {
    getCollectionPath: CMSCollection.getCollectionPath.bind(CMSCollection),
    getCollectionItems: clientSideFetchNotAvailable,
    getRelatedEntries: clientSideFetchNotAvailable,
  },
  { defaultLocale, locales }
);

/** Fixed layout (title + intro only) for these page slugs, ignoring their
 * `blocks` field — dev-only override, not editor-facing. Lives here (not
 * lib/cms.ts) because PageView.tsx ("use client") reads it directly. */
export const blocksDisabledSlugs = new Set<string>([
  // "home",
]);
