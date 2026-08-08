import { client } from "@/tina/__generated__/client";
import type { BlogConnectionQuery, ProductsConnectionQuery } from "@/tina/__generated__/types";
import { CollectionService } from "@/cms/collection";
import { TaxonomyService } from "@/cms/taxonomy";
import { DictionaryService, createTranslationDashboardScreen, TranslationDashboardService } from "@/cms/multilingual";
import { SeoService, SeoDashboardService, createSeoDashboardScreen } from "@/cms/seo";
import { defaultLocale, locales, CMSMultilingual, type Locale } from "@/lib/i18n";

/**
 * Project registration for the cms/ framework — the one file a future
 * project edits to register its own collections/taxonomies/locales.
 * cms/ itself never hardcodes this project's collections, locales, or
 * translated strings; see .claude/plans/00-overview.md's guiding rules.
 */

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

/** Derived from the same registry `lib/pages-config.ts`'s locked-slug list
 * builds from — one source of truth, no hand-duplicated filenames. */
export const listingPageFilenames = Object.values(collectionRegistry).map((c) => c.listingPageFilename);

export const listingPageFilenameFor = (collectionName: CollectionKey): string =>
  collectionRegistry[collectionName].listingPageFilename;

// --- Thin project-level facades over CMSCollection, preserving the exact
// call shape the pre-refactor lib/collection-slugs.ts / lib/tina-content.ts
// used to export, so existing call sites only needed their import path
// updated. ---

export const collectionPath = (locale: Locale, collectionName: CollectionKey, rest = ""): string =>
  CMSCollection.getCollectionPath({ collectionName, lang: locale, rest });

export const collectionForSegment = (segment: string): CollectionKey | null =>
  CMSCollection.getCollectionForSegment(segment);

export const translateCollectionPath = (pathWithoutLocale: string, locale: Locale): string =>
  CMSCollection.translateCollectionPath(pathWithoutLocale, locale);

export const resolvePagesDocumentUrl = (locale: Locale, filename: string, slug: string): string =>
  CMSCollection.resolvePagesDocumentUrl(locale, filename, slug);

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

export const getCollectionDocAlternates = (
  collection: CollectionKey,
  locale: Locale,
  slug: string
): Promise<Partial<Record<Locale, string>>> =>
  CMSCollection.getCollectionAlternates({ collectionName: collection, lang: locale, slug });

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

export const taxonomyArchivePath = (
  collectionName: CollectionKey,
  taxonomyName: TaxonomyKey,
  locale: Locale,
  termSlug: string
): string | null => CMSTaxonomy.getArchivePath({ collectionName, taxonomyName, lang: locale, termSlug });

// --- Multilingual registration (.claude/plans/03-multilingual.md). Locale
// routing/enable-disable itself (CMSMultilingual) is instantiated in
// lib/i18n.ts, not here — see that file's comment for why (middleware.ts,
// which needs it, runs on Cloudflare's edge Worker runtime and can't
// afford this file's GraphQL client + admin dashboard bundle weight on a
// per-request hot path). ---

export const CMSDictionary = new DictionaryService(
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
