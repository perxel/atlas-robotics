import {type CollectionRegistryEntry, CollectionService} from "@/cms/collection";
import {type TaxonomyRegistryEntry, TaxonomyService} from "@/cms/taxonomy";
import {MultilingualService} from "@/cms/multilingual/MultilingualService";

// Universal config: zero Tina/Node imports, safe in edge middleware AND
// browser bundles ("use client" components and everything they render).
// This is the one file a new project edits to register its own locales
// and each collection/taxonomy's URL shape. Data-fetching (what actually
// varies per Tina schema) lives in lib/cms-server.ts, server-only — that file
// imports the config below and adds fetchEdges/fetchBySlug/fetchTerms on
// top, so the locale-segment/URL-segment strings are spelled out in
// exactly one place either way.
//
// Why this can't just live in lib/cms-server.ts: that file's
// `import { client } from "@/tina/__generated__/client"` transitively
// needs node:crypto/fs/os/path (via tinacms/dist/client.js). A named
// import only prevents *using* the rest of a module's exports, not a
// bundler including its other top-level side-effecting code — so any
// "use client" component that imported so much as CMSMultilingual from
// lib/cms-server.ts would drag that whole Node-only graph into the browser
// bundle (confirmed live: "UnhandledSchemeError: Reading from
// 'node:crypto'..." broke the Cloudflare production build). Same
// constraint independently applies to middleware.ts, an edge Worker with
// a hard bundle-size limit. One file satisfies both.

export const locales = ["vi", "en", "zh"] as const;
export type Locale = (typeof locales)[number];

// Default locale is served unprefixed at "/"; others under "/<locale>".
export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
  zh: "简体中文",
};

// Disable a locale by trimming enabledLocales — its content stays intact,
// it just stops appearing in the sitemap/hreflang/switcher/dashboard.
export const CMSMultilingual = new MultilingualService<Locale>({
  locales,
  defaultLocale,
  enabledLocales: locales,
});

// --- Collection URL config (per-locale segment + listing-page filename) ---
// Add a collection by adding a row here, then a matching row to
// lib/cms-server.ts's collectionRegistry (draftFieldName/fetchEdges/fetchBySlug).

type CollectionPathEntry = Pick<CollectionRegistryEntry<Locale>, "locales" | "listingPageFilename" | "pageSize">;

export const collectionPathConfig = {
  blog: {
    locales: { en: "blog", vi: "tin-tuc", zh: "blog" },
    listingPageFilename: "blog",
  },
  products: {
    locales: { en: "products", vi: "san-pham", zh: "products" },
    listingPageFilename: "products",
  },
} satisfies Record<string, CollectionPathEntry>;

export type CollectionKey = keyof typeof collectionPathConfig;

// --- Taxonomy URL config (which collections a taxonomy attaches to, its
// field name on that collection, and its per-locale URL segment) ---

type TaxonomyAttachments = TaxonomyRegistryEntry<CollectionKey, Locale>["attachments"];

export const taxonomyPathConfig = {
  categories: {
    attachments: {
      blog: { fieldName: "categories", urlSegment: { en: "category", vi: "danh-muc", zh: "category" } },
    },
  },
  productCategories: {
    attachments: {
      products: { fieldName: "productCategories", urlSegment: { en: "category", vi: "danh-muc", zh: "category" } },
    },
  },
} satisfies Record<string, { attachments: TaxonomyAttachments }>;

export type TaxonomyKey = keyof typeof taxonomyPathConfig;

// --- Path-only CMSCollection/CMSTaxonomy — browser/edge-safe. No
// fetchEdges/fetchBySlug/fetchTerms, so importing this file never pulls in
// the generated Tina client. lib/cms-server.ts builds the full, data-fetching
// instances separately (same registry data, plus the fetch functions) for
// server use. ---

const clientSideFetchNotAvailable = (): never => {
  throw new Error(
    "CMSCollection/CMSTaxonomy from lib/registry only build URLs (no fetchEdges/fetchBySlug/fetchTerms) so the " +
      "generated Tina client never reaches the browser bundle. Import from lib/cms-server in a server component for data."
  );
};

const collectionRegistry: Record<CollectionKey, CollectionRegistryEntry<Locale>> = {
  blog: { ...collectionPathConfig.blog, fetchEdges: clientSideFetchNotAvailable, fetchBySlug: clientSideFetchNotAvailable },
  products: { ...collectionPathConfig.products, fetchEdges: clientSideFetchNotAvailable, fetchBySlug: clientSideFetchNotAvailable },
};

export const CMSCollection = new CollectionService<CollectionKey, Locale>(collectionRegistry, {
  defaultLocale,
  locales,
});

const taxonomyRegistry: Record<TaxonomyKey, TaxonomyRegistryEntry<CollectionKey, Locale>> = {
  categories: { ...taxonomyPathConfig.categories, fetchTerms: clientSideFetchNotAvailable },
  productCategories: { ...taxonomyPathConfig.productCategories, fetchTerms: clientSideFetchNotAvailable },
};

export const CMSTaxonomy = new TaxonomyService<TaxonomyKey, CollectionKey, Locale>(
  taxonomyRegistry,
  {
    getCollectionPath: CMSCollection.getCollectionPath.bind(CMSCollection),
    getCollectionItems: clientSideFetchNotAvailable,
    getRelatedEntries: clientSideFetchNotAvailable,
  },
  { defaultLocale, locales }
);

// --- Slug config — pure, so it belongs here rather than lib/cms-server.ts even
// though today only server code (tina/collections/pages.schema.tsx) and
// one client component (PageView.tsx, for blocksDisabledSlugs) read it. ---

/** Fixed layout (title + intro only) for these page slugs, ignoring their
 * `blocks` field — dev-only override, not editor-facing. */
export const blocksDisabledSlugs = new Set<string>([
  // "home",
]);

/** Slugs `pages` documents can't use — Next.js resolves these dedicated
 * routes over the `[slug]` catch-all. Enforced via `slugField({ reserved })`. */
export const reservedSlugs = new Set<string>(["admin", "api"]);

/** `pages` documents whose `slug` can't be changed through the admin — see
 * `slugLifecycleGuard`. `home` plus every collection's locked listing page. */
export const lockedSlugFilenames = new Set<string>([
  "home",
  ...CMSCollection.getRegisteredCollectionNames().map((name) => CMSCollection.getListingPageFilename(name)),
]);
