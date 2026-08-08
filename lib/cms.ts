import { client } from "@/tina/__generated__/client";
import type { BlogConnectionQuery, ProductsConnectionQuery } from "@/tina/__generated__/types";
import { CollectionService } from "@/cms/collection";
import { TaxonomyService } from "@/cms/taxonomy";
import {
  MultilingualService,
  DictionaryService,
  createTranslationDashboardScreen,
  TranslationDashboardService,
} from "@/cms/multilingual";
import { SeoService, SeoDashboardService, createSeoDashboardScreen } from "@/cms/seo";

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
 */

// --- Locale registration (.claude/plans/03-multilingual.md). ---

export const locales = ["vi", "en"] as const;
export type Locale = (typeof locales)[number];

// The default locale is served unprefixed at "/" (e.g. "/products").
// Every other locale is served under its own prefix (e.g. "/vi/products").
export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

export const CMSMultilingual = new MultilingualService<Locale>({
  locales,
  defaultLocale,
  // Both locales are enabled today. Disable one by trimming this array —
  // its content stays fully intact and editable, it just stops showing up
  // in the sitemap, hreflang, the language switcher, and the Translation
  // Dashboard. See MultilingualService's own doc comment. Admin can only
  // ever reorder/relabel/add-flag among locales registered here (the
  // language switcher's `locale` field is a dropdown constrained to
  // `options: [...locales]`, see cms/multilingual/fields.ts) — it cannot
  // add a locale that isn't registered in this file.
  enabledLocales: locales,
});

// Call sites use CMSMultilingual.isLocale/pathnameHasLocalePrefix/
// stripLocalePrefix/localePath directly — no wrapper functions here. Note
// for middleware.ts specifically: it imports CMSMultilingual from this file
// (the single registration source of truth), which also pulls in the full
// Tina GraphQL client and the React/JSX admin dashboard screens below into
// its edge Worker bundle — a real bundle-weight cost on a per-request hot
// path (Cloudflare Workers has a hard bundle-size limit), accepted
// deliberately in favor of one config file over splitting the registration
// across multiple files for a bundling optimization.

// --- Collection registration (.claude/plans/01-collection.md). ---

type BlogEdge = NonNullable<BlogConnectionQuery["blogConnection"]["edges"]>[number];
export type BlogPostItem = NonNullable<NonNullable<BlogEdge>["node"]>;

type ProductEdge = NonNullable<ProductsConnectionQuery["productsConnection"]["edges"]>[number];
export type ProductItem = NonNullable<NonNullable<ProductEdge>["node"]>;

const collectionRegistry = {
  blog: {
    locales: { en: "blog", vi: "tin-tuc" } as Record<Locale, string>,
    listingPageFilename: "blog",
    draftFieldName: "draft",
    // Not wrapped in React's cache(): this registry is also reachable from
    // tina/config.ts (via translationDashboardScreen/seoDashboardScreen
    // below), which Tina's CLI bundles into a plain client-side admin
    // bundle, not a Next.js RSC context — cache() isn't available there
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

export const getBlogPosts = (locale: Locale): Promise<BlogPostItem[]> =>
  CMSCollection.getCollectionItems<BlogPostItem>({
    collectionName: "blog",
    lang: locale,
    sort: { field: "publishDate", direction: "desc", type: "date" },
  }).then((r) => r.items);

export const getProducts = (locale: Locale): Promise<ProductItem[]> =>
  CMSCollection.getCollectionItems<ProductItem>({ collectionName: "products", lang: locale }).then(
    (r) => r.items
  );

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

export const getCategories = (locale: Locale) => CMSTaxonomy.getTerms({ taxonomyName: "categories", lang: locale });

export const getProductCategories = (locale: Locale) =>
  CMSTaxonomy.getTerms({ taxonomyName: "productCategories", lang: locale });

// Call sites use CMSTaxonomy.getArchivePath directly — no wrapper here.

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

// Only registered when multilingual is actually on — a single-locale
// project has nothing to show a translation-coverage dashboard for.
export const translationDashboardScreen = CMSMultilingual.isEnabled()
  ? createTranslationDashboardScreen(
      new TranslationDashboardService(
        {
          getRegisteredCollectionNames: () => Object.keys(collectionRegistry) as CollectionKey[],
          getItemLocaleIndex: CMSCollection.getItemLocaleIndex.bind(CMSCollection),
        },
        { locales: CMSMultilingual.getEnabledLocales(), defaultLocale }
      )
    )
  : null;

// --- SEO registration (.claude/plans/04-seo.md). ---

// Every canonical URL, hreflang alternate, and sitemap entry in this app is
// built from this one value — silently falling back to localhost in
// production would poison all of them with no warning. Same "fail loud
// instead of silently wrong" reasoning as tina/config.ts's
// assertSlugFieldsHaveGuard, and the same category of footgun CLAUDE.md's
// "Production builds require Tina Cloud" note already documents for
// NEXT_PUBLIC_TINA_CLIENT_ID/TINA_TOKEN — set this wherever the app
// builds/runs, in both places on platforms that separate build-time and
// runtime env vars.
export const siteUrl = (() => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set. Canonical/hreflang/sitemap URLs would all " +
        "silently resolve to http://localhost:3000 in production otherwise — see " +
        "lib/cms.ts and CLAUDE.md's \"Production builds require Tina Cloud\" note."
    );
  }
  return "http://localhost:3000";
})();

// hreflang only ever advertises enabled locales — a disabled locale's pages
// still exist and render, they're just not offered as a language-switch
// target (see CMSMultilingual's own doc comment).
export const CMSSeo = new SeoService({ siteUrl, defaultLocale, locales: CMSMultilingual.getEnabledLocales() });

// `pages` isn't part of CollectionService's registry (its per-collection
// `locales`/`listingPageFilename` shape doesn't fit a slug-driven generic
// collection — see 01-collection.md's Addendum #4), so the SEO dashboard's
// index is assembled by hand for it here instead of forcing a registry
// entry that wouldn't mean anything for a route this collection doesn't own.
type SeoCollectionKey = CollectionKey | "pages";

async function getSeoIndexFor(collectionName: SeoCollectionKey) {
  if (collectionName === "pages") {
    const res = await client.queries.pagesConnection();
    return (res.data.pagesConnection.edges ?? [])
      .map((edge) => edge?.node)
      .filter((node): node is NonNullable<typeof node> => !!node)
      .map((node) => ({
        filename: node._sys.relativePath.split("/").pop()?.replace(/\.md$/, "") ?? node._sys.relativePath,
        locale: node._sys.breadcrumbs[0] as Locale,
        slug: node.slug,
        seo: node.seo,
      }));
  }
  return CMSCollection.getSeoIndex(collectionName);
}

export const seoDashboardScreen = createSeoDashboardScreen(
  new SeoDashboardService(
    {
      getRegisteredCollectionNames: (): SeoCollectionKey[] => [...Object.keys(collectionRegistry), "pages"] as SeoCollectionKey[],
      getSeoIndex: getSeoIndexFor,
    },
    { locales, defaultLocale }
  )
);
