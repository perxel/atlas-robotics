import {type CollectionRegistryEntry, CollectionService} from "@/cms/collection";
import {type TaxonomyRegistryEntry, TaxonomyService} from "@/cms/taxonomy";
import {MultilingualService} from "@/cms/multilingual/MultilingualService";
import {resolveTitleTemplate, type TitlePart} from "@/cms/seo";

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

// --- <title> shape config (Yoast-style: an ordered token list per
// collection/taxonomy, resolved by cms/seo's resolveTitleTemplate) ---
// A restricted union, not a free string, so an unknown token name is a
// compile error rather than a silent typo/no-op. `{ text: "..." }` in a
// shape array is custom literal copy (e.g. "Archive for") — it flows
// through the same t() every other UI string here already does, so a
// locale's translation just needs adding to the dictionary, same as any
// other copy, no separate mechanism.

/** Tokens available to a content collection's own detail/listing pages. */
export type ItemTitleToken = "pageTitle" | "label" | "siteTitle";

/** Tokens available to a taxonomy's archive pages — `termTitle` instead of
 * `pageTitle`, since an archive page is centered on a term, not a document. */
export type ArchiveTitleToken = "termTitle" | "label" | "siteTitle";

/** The one place the separator character is spelled out — change it here,
 * not per call site. */
export const titleSep = "—";

// --- Collection URL config (per-locale segment + listing-page filename) ---
// Add a collection by adding a row here, then a matching row to
// lib/cms-server.ts's collectionRegistry (draftFieldName/fetchEdges/fetchBySlug).

type CollectionPathEntry = Pick<CollectionRegistryEntry<Locale>, "label" | "locales" | "listingPageFilename" | "pageSize"> & {
  titleShape: TitlePart<ItemTitleToken>[];
};

export const collectionPathConfig = {
  blog: {
    label: "Blog",
    locales: { en: "blog", vi: "tin-tuc", zh: "blog" },
    listingPageFilename: "blog",
    titleShape: ["pageTitle", "label", "siteTitle"],
  },
  products: {
    label: "Products",
    locales: { en: "products", vi: "san-pham", zh: "products" },
    listingPageFilename: "products",
    titleShape: ["pageTitle", "label", "siteTitle"],
  },
} satisfies Record<string, CollectionPathEntry>;

export type CollectionKey = keyof typeof collectionPathConfig;

// --- Taxonomy URL config (which collections a taxonomy attaches to, its
// field name on that collection, and its per-locale URL segment) ---

type TaxonomyAttachments = TaxonomyRegistryEntry<CollectionKey, Locale>["attachments"];

export const taxonomyPathConfig = {
  categories: {
    label: "Categories",
    attachments: {
      blog: { fieldName: "categories", urlSegment: { en: "category", vi: "danh-muc", zh: "category" } },
    },
    archiveTitleShape: ["termTitle", "label", "siteTitle"],
  },
  productCategories: {
    label: "Product Categories",
    attachments: {
      products: { fieldName: "productCategories", urlSegment: { en: "category", vi: "danh-muc", zh: "category" } },
    },
    archiveTitleShape: ["termTitle", "label", "siteTitle"],
  },
} satisfies Record<
  string,
  { label: string; attachments: TaxonomyAttachments; archiveTitleShape: TitlePart<ArchiveTitleToken>[] }
>;

export type TaxonomyKey = keyof typeof taxonomyPathConfig;

// --- <title> builders — thin wiring from the shape config above into
// cms/seo's generic resolveTitleTemplate. Every route calls one of these
// two instead of hand-rolling its own template. ---

export function buildItemTitle(args: {
  collectionName: CollectionKey;
  pageTitle?: string | null;
  label: string;
  siteTitle: string;
  t: (text: string) => string;
}): string {
  const { collectionName, pageTitle, label, siteTitle, t } = args;
  return resolveTitleTemplate(
    collectionPathConfig[collectionName].titleShape,
    { pageTitle, label, siteTitle },
    t,
    titleSep
  );
}

export function buildArchiveTitle(args: {
  taxonomyName: TaxonomyKey;
  termTitle: string;
  label: string;
  siteTitle: string;
  t: (text: string) => string;
}): string {
  const { taxonomyName, termTitle, label, siteTitle, t } = args;
  return resolveTitleTemplate(
    taxonomyPathConfig[taxonomyName].archiveTitleShape,
    { termTitle, label, siteTitle },
    t,
    titleSep
  );
}

// --- SEO dashboard row order — mirrors tina/config.ts's `collections` array
// declaration order (pages, products, productCategories, blog, categories)
// so the admin dashboard reads top-to-bottom in the same order an editor
// sees in Tina's own nav. The two lists aren't derived from one another
// (tina/config.ts holds real Tina `Collection` objects, this is plain
// string keys) so this must be kept in sync by hand whenever that array
// changes — same hand-synced-parallel-list tradeoff already accepted for
// collectionPathConfig/taxonomyPathConfig vs. tina/config.ts's import
// order. Names missing from this list (e.g. a newly added collection) sort
// to the end rather than disappearing — see SeoDashboardService's `order`
// option.
export const seoDashboardOrder: readonly ("pages" | CollectionKey | TaxonomyKey)[] = [
  "pages",
  "products",
  "productCategories",
  "blog",
  "categories",
];

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
