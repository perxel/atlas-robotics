import { client } from "@/tina/__generated__/client";
import type { BlogConnectionQuery, ProductsConnectionQuery } from "@/tina/__generated__/types";
import { CollectionService, type ConnectionItem } from "@/cms/collection";
import { TaxonomyService } from "@/cms/taxonomy";
import { DictionaryService } from "@/cms/multilingual";
import { SeoService, siteUrl } from "@/cms/seo";
import { SingletonService } from "@/cms/singleton";
import { PagesService } from "@/cms/pages";
import { LocaleAlternatesService } from "@/cms/locale-alternates";
import { locales, type Locale, defaultLocale, localeLabels, CMSMultilingual } from "./locale";

export { locales, type Locale, defaultLocale, localeLabels, CMSMultilingual };

/**
 * Project registration for the cms/ framework — the one file a future
 * project edits to register its own collections/taxonomies/locales.
 * cms/ itself never hardcodes this project's collections, locales, or
 * translated strings; see .claude/plans/00-overview.md's guiding rules.
 *
 * Single source of truth: every collection/taxonomy/locale/SEO setting this
 * app has lives here. To reuse this boilerplate on a new project: edit the
 * registries below (and content/*'s seed data) — nothing else in the app
 * hardcodes a collection, taxonomy, or locale string.
 *
 * Locale registration itself lives in ./locale.ts, not here — middleware.ts
 * needs it on every request and must never pull in the rest of this file's
 * dependency graph (the generated Tina client, and transitively any
 * admin-only code built on top of it). Re-exported below so every other
 * consumer still just imports from "@/lib/cms".
 */

// --- Collection registration (.claude/plans/01-collection.md). ---

export type BlogPostItem = ConnectionItem<BlogConnectionQuery["blogConnection"]["edges"]>;
export type ProductItem = ConnectionItem<ProductsConnectionQuery["productsConnection"]["edges"]>;

const collectionRegistry = {
  blog: {
    locales: { en: "blog", vi: "tin-tuc" } as Record<Locale, string>,
    listingPageFilename: "blog",
    draftFieldName: "draft",
    // Not wrapped in React's cache(): this registry is also reachable from
    // tina/config.ts (via lib/dashboards.ts's translationDashboardScreen/
    // seoDashboardScreen, which import CMSCollection from this file), which
    // Tina's CLI bundles into a plain client-side admin bundle, not a
    // Next.js RSC context — cache() isn't available there
    // ("cache is not a function" at admin load, confirmed live). Losing the
    // per-request GraphQL dedup this bought (e.g. a detail page's
    // related-entries lookup alongside its own listing fetch) is a minor
    // efficiency cost, not a correctness one.
    fetchEdges: () => client.queries.blogConnection().then((r) => r.data.blogConnection.edges),
    fetchBySlug: (relativePath: string) => client.queries.blog({ relativePath }),
  },
  products: {
    locales: { en: "products", vi: "san-pham" } as Record<Locale, string>,
    listingPageFilename: "products",
    draftFieldName: "draft",
    fetchEdges: () => client.queries.productsConnection().then((r) => r.data.productsConnection.edges),
    fetchBySlug: (relativePath: string) => client.queries.products({ relativePath }),
  },
};

export type CollectionKey = keyof typeof collectionRegistry;

export const CMSCollection = new CollectionService(collectionRegistry, { defaultLocale, locales });

// Call sites use CMSCollection.getCollectionPath/getCollectionForSegment/
// translateCollectionPath/resolvePagesDocumentUrl/getListingPageFilename
// directly — no wrapper functions here.

type BlogDocQuery = Awaited<ReturnType<typeof client.queries.blog>>;
type ProductDocQuery = Awaited<ReturnType<typeof client.queries.products>>;

// Not wrapped in React's cache() — see the collectionRegistry comment
// above for why: this file is reachable from tina/config.ts's plain
// client-bundled admin build, where cache() isn't available. Originally
// cache()-wrapped so generateMetadata and the page component (and visual
// editing's useTina()) could share one fetch per request; now each caller
// fetches independently.
export const getBlogPostQuery = (locale: Locale, slug: string) =>
  CMSCollection.getCollectionItem<BlogDocQuery>({ collectionName: "blog", lang: locale, slug });

export const getProductQuery = (locale: Locale, slug: string) =>
  CMSCollection.getCollectionItem<ProductDocQuery>({ collectionName: "products", lang: locale, slug });

// --- Singleton document registration — site-wide config docs, one file
// per locale, no list/slug of their own. ---

const singletonRegistry = {
  siteSettings: {
    fetchDoc: (l: Locale) => client.queries.siteSettings({ relativePath: `${l}.json` }).then((r) => r.data.siteSettings),
  },
  nav: {
    fetchDoc: (l: Locale) => client.queries.nav({ relativePath: `${l}.json` }).then((r) => r.data.nav),
  },
  footer: {
    fetchDoc: (l: Locale) => client.queries.footer({ relativePath: `${l}.json` }).then((r) => r.data.footer),
  },
};

export const CMSSingleton = new SingletonService<keyof typeof singletonRegistry, Locale>(singletonRegistry, {
  defaultLocale,
});

type SiteSettingsDoc = Awaited<ReturnType<typeof client.queries.siteSettings>>["data"]["siteSettings"];
type NavDoc = Awaited<ReturnType<typeof client.queries.nav>>["data"]["nav"];
type FooterDoc = Awaited<ReturnType<typeof client.queries.footer>>["data"]["footer"];

export const getSiteSettings = (locale: Locale) => CMSSingleton.get<SiteSettingsDoc>({ name: "siteSettings", lang: locale });

export const getNav = (locale: Locale) => CMSSingleton.get<NavDoc>({ name: "nav", lang: locale });

export const getFooter = (locale: Locale) => CMSSingleton.get<FooterDoc>({ name: "footer", lang: locale });

// --- Pages (generic slug-routed collection) registration — depends on
// CMSCollection/CMSMultilingual via "Option A" injection, same as
// CMSTaxonomy above. ---

export const CMSPages = new PagesService(
  {
    fetchConnection: (args) =>
      client.queries
        .pagesConnection({
          filter: { draft: { eq: false }, ...(args?.slug ? { slug: { eq: args.slug } } : {}) },
        })
        .then((r) => r.data.pagesConnection.edges),
    fetchByPath: (relativePath: string) => client.queries.pages({ relativePath }),
  },
  {
    localePath: CMSMultilingual.localePath.bind(CMSMultilingual),
    getCollectionPath: (args) =>
      CMSCollection.getCollectionPath({ collectionName: args.collectionName as CollectionKey, lang: args.lang }),
  },
  { locales, defaultLocale }
);

type PagesDocQuery = Awaited<ReturnType<typeof client.queries.pages>>;

/** Same two-step slug resolution as getBlogPostQuery — see its comment. */
export const getPageQuery = (locale: Locale, slug: string) => CMSPages.getBySlug<PagesDocQuery>({ lang: locale, slug });

// Call sites use CMSPages.getAlternates/getListingAlternates directly — no
// wrapper functions here (see each method's own doc comment in
// cms/pages/PagesService.ts for what they resolve and why).

/**
 * Pages listed here render as a fixed layout (title + intro only), ignoring
 * whatever sections editors have added in the admin. The `pages` collection
 * schema always supports block editing (tina/collections/pages.schema.tsx)
 * — this is a developer-only, per-page override in code, not something
 * editors can toggle themselves.
 */
export const blocksDisabledSlugs = new Set<string>([
  // "home",
]);

/**
 * The `pages` collection resolves at the root of each locale (e.g. `/about`,
 * see app/[locale]/[slug]/page.tsx), so a page can't reuse a slug that a
 * dedicated route already owns — Next.js would resolve to the dedicated
 * route silently (literal segments win over the dynamic sibling), leaving
 * the page unreachable rather than erroring. Enforced in the Tina schema
 * itself via the `slug` field's `ui.validate` (tina/collections/pages.schema.tsx).
 *
 * Note `blog`/`products` (and their vi spellings) are deliberately NOT
 * reserved here, even though they're dedicated routes — those two are
 * exactly the slugs the locked listing-page documents legitimately use
 * (see `lockedSlugFilenames` below), the same reasoning `home` already
 * gets: a reservation would block the very document that's supposed to
 * hold that slug from ever being saved through the admin.
 */
export const reservedSlugs = new Set<string>(["admin", "api"]);

/**
 * `pages` documents whose `slug` field is locked — checked by
 * `slugLifecycleGuard` (cms/slug/slug-lifecycle-guard.ts), matched by
 * filename (`form.path`'s basename), not by current slug value.
 *
 * `home` and every registered collection's `listingPageFilename` end up
 * here. These documents' slugs aren't really a public URL choice: `home`
 * is resolved by the hardcoded key "home" (app/[locale]/page.tsx), and a
 * collection's listing page's real URL segment is owned by
 * `collectionRegistry` above, not by this document's slug field — letting
 * an editor "change" a slug that doesn't actually move anything would be
 * actively misleading, so it's blocked outright instead.
 *
 * Also don't delete these documents — nothing currently enforces that
 * (see CLAUDE.md); Tina has no per-document delete-protection hook the way
 * it has `beforeSubmit` for saves, and building around that would mean
 * fighting Tina rather than extending it, so this is a documented
 * convention, not a hard guarantee.
 */
export const lockedSlugFilenames = new Set<string>([
  "home",
  ...CMSCollection.getRegisteredCollectionNames().map((name) => CMSCollection.getListingPageFilename(name)),
]);

// --- Taxonomy registration (.claude/plans/02-taxonomy.md) — depends on
// CMSCollection via "Option A" injection: TaxonomyService is handed the
// specific CollectionService methods it needs, never the whole instance. ---

const taxonomyRegistry = {
  categories: {
    // Not wrapped in cache() — same reasoning as collectionRegistry above.
    fetchTerms: () => client.queries.categoriesConnection().then((r) => r.data.categoriesConnection.edges),
    attachments: {
      blog: { fieldName: "categories", urlSegment: { en: "category", vi: "danh-muc" } as Record<Locale, string> },
    },
  },
  productCategories: {
    fetchTerms: () =>
      client.queries.productCategoriesConnection().then((r) => r.data.productCategoriesConnection.edges),
    attachments: {
      products: {
        fieldName: "productCategories",
        urlSegment: { en: "category", vi: "danh-muc" } as Record<Locale, string>,
      },
    },
  },
};

export type TaxonomyKey = keyof typeof taxonomyRegistry;

export const CMSTaxonomy = new TaxonomyService(
  taxonomyRegistry,
  {
    getCollectionPath: CMSCollection.getCollectionPath.bind(CMSCollection),
    getCollectionItems: CMSCollection.getCollectionItems.bind(CMSCollection),
    getRelatedEntries: CMSCollection.getRelatedEntries.bind(CMSCollection),
  },
  { defaultLocale, locales }
);

// Call sites use CMSTaxonomy.getTerms/getArchivePath directly — no wrapper here.

// --- Locale-alternates registration — depends on CMSMultilingual/
// CMSCollection/CMSTaxonomy/CMSPages via "Option A" injection, same pattern
// as CMSTaxonomy above. ---

export const CMSLocaleAlternates = new LocaleAlternatesService<CollectionKey, TaxonomyKey, Locale>(
  {
    stripLocalePrefix: CMSMultilingual.stripLocalePrefix.bind(CMSMultilingual),
    localePath: CMSMultilingual.localePath.bind(CMSMultilingual),
    getCollectionForSegment: CMSCollection.getCollectionForSegment.bind(CMSCollection),
    getCollectionPath: CMSCollection.getCollectionPath.bind(CMSCollection),
    translateCollectionPath: CMSCollection.translateCollectionPath.bind(CMSCollection),
    getCollectionAlternates: CMSCollection.getCollectionAlternates.bind(CMSCollection),
    getListingPageFilename: CMSCollection.getListingPageFilename.bind(CMSCollection),
    resolveTaxonomyUrlSegment: CMSTaxonomy.resolveUrlSegment.bind(CMSTaxonomy),
    getTermAlternates: CMSTaxonomy.getTermAlternates.bind(CMSTaxonomy),
    getTaxonomyUrlSegment: CMSTaxonomy.getUrlSegment.bind(CMSTaxonomy),
    getPageFilenameBySlug: async (args) => {
      const result = await getPageQuery(args.lang ?? defaultLocale, args.slug);
      const relativePath = result?.data.pages?._sys.relativePath;
      return relativePath ? (relativePath.split("/").pop()?.replace(/\.md$/, "") ?? null) : null;
    },
    getPageAlternates: CMSPages.getAlternates.bind(CMSPages),
    getListingAlternates: (args) =>
      CMSPages.getListingAlternates({ collectionName: args.collectionName, filename: args.filename }),
  },
  { locales }
);

/**
 * Given the current locale and pathname (locale-prefixed), resolves the
 * correct URL for every locale that has one. Single source of truth for
 * "what's the equivalent of this page in another locale" — used by both
 * hreflang/canonical (CMSSeo.buildAlternates below) and the language
 * switcher (Header.tsx). See LocaleAlternatesService's own doc comment for
 * how each route shape is resolved.
 *
 * Not wrapped in React's `cache()` — same reasoning as collectionRegistry
 * above — so calling this once from `generateMetadata` and again from
 * `Header` within the same request costs one fetch each, not a shared one.
 */
export const resolveLocaleAlternates = (locale: Locale, pathname: string) => CMSLocaleAlternates.resolve(locale, pathname);

// --- Multilingual dictionary + dashboard registration
// (.claude/plans/03-multilingual.md). ---

export const CMSDictionary = new DictionaryService<Locale>(
  {
    fetchEntries: () =>
      client.queries.multilingual({ relativePath: "index.json" }).then(
        (r) =>
          (r.data.multilingual.entries ?? []).filter(
            (entry): entry is NonNullable<typeof entry> => !!entry
          ) as { key: string; values: Record<string, string | null | undefined> }[]
      ),
  },
  { defaultLocale }
);

// Switcher config lives in the same document — a plain project-level fetch
// (same shape as getSiteSettings), not a CMS* service method, since it's a
// one-off read passed straight into CMSMultilingual.resolveSwitcherEntries's
// `config` argument at the call site (Header.tsx).
export const getMultilingualSettings = () =>
  client.queries.multilingual({ relativePath: "index.json" }).then((r) => r.data.multilingual);

/**
 * Extra data some `pages` blocks need but don't carry themselves — fetched
 * only when a page actually uses that block, and shared between every
 * route that renders `pages` blocks (home, generic [slug], and the
 * blog/products listing pages) so the conditional-fetch logic lives in one
 * place instead of being duplicated across all of them.
 *
 * Project-specific glue, not generic `cms/` framework logic: it hardcodes
 * this project's own block typenames (PagesBlocksFeaturedBlogPosts, etc.,
 * from tina/collections/pages.schema.tsx's `pageBlocks`), which a
 * different project's block set would differ on — kept here rather than in
 * `cms/` since `cms/` itself never hardcodes this project's content.
 */
export async function getPageBlockData(
  locale: Locale,
  blocks: Array<{ __typename?: string | null } | null> | null | undefined
) {
  const typenames = new Set((blocks ?? []).map((b) => b?.__typename));
  const needsPosts =
    typenames.has("PagesBlocksFeaturedBlogPosts") || typenames.has("PagesBlocksBlogListing");
  const needsProducts = typenames.has("PagesBlocksProductListing");

  // Fetched unconditionally (unlike posts/products above): almost any block
  // — and PageView itself, for its breadcrumb — needs at least one
  // translated UI-chrome string, and it's one cheap single-document fetch
  // rather than worth conditioning on block typenames too.
  const [latestPosts, products, uiDictionary] = await Promise.all([
    needsPosts
      ? CMSCollection.getCollectionItems<BlogPostItem>({
          collectionName: "blog",
          lang: locale,
          sort: { field: "publishDate", direction: "desc", type: "date" },
        }).then((r) => r.items)
      : Promise.resolve([]),
    needsProducts
      ? CMSCollection.getCollectionItems<ProductItem>({ collectionName: "products", lang: locale }).then(
          (r) => r.items
        )
      : Promise.resolve([]),
    CMSDictionary.loadMap(locale),
  ]);

  return { latestPosts, products, uiDictionary };
}

// --- SEO registration (.claude/plans/04-seo.md). ---

// siteUrl itself now lives in cms/seo (it's SeoService's own env-var
// contract, not project data — see that module's comment). Call sites
// import it from "@/cms/seo" directly; this file only needs it to
// instantiate CMSSeo below.

// hreflang only ever advertises enabled locales — a disabled locale's pages
// still exist and render, they're just not offered as a language-switch
// target (see CMSMultilingual's own doc comment).
export const CMSSeo = new SeoService({ siteUrl, defaultLocale, locales: CMSMultilingual.getEnabledLocales() });

// seoDashboardScreen/translationDashboardScreen (Tina admin plugin screens)
// live in lib/dashboards.ts, not here — admin-only React/JSX code that
// tina/config.ts's cmsCallback registers, never touched by the public app,
// kept separate from this file's public-app registration for that reason.
// (Not a middleware-bundle concern anymore: middleware.ts imports its
// locale data from lib/locale.ts, with no import edge to this file at all —
// see lib/locale.ts's own comment.)
