import { client } from "@/tina/__generated__/client";
import {
  BlogConnectionDocument,
  CategoriesConnectionDocument,
  MultilingualDocument,
  PagesConnectionDocument,
  ProductCategoriesConnectionDocument,
  ProductsConnectionDocument,
} from "@/tina/__generated__/types";
import type {
  BlogConnectionQuery,
  CategoriesConnectionQuery,
  MultilingualQuery,
  PagesConnectionQuery,
  ProductCategoriesConnectionQuery,
  ProductsConnectionQuery,
} from "@/tina/__generated__/types";
import type { ConnectionItem } from "@/cms/collection";
import { createCmsProject } from "@/cms/create-project";
import { siteUrl } from "@/cms/seo";
import {
  collectionPathConfig,
  taxonomyPathConfig,
  CMSMultilingual,
  defaultLocale,
  locales,
  type Locale,
} from "./registry";

export type { Locale };

// Project registration for the cms/ framework — see .claude/docs/ for the
// design behind each domain below. cms/ itself never hardcodes a
// collection/taxonomy/locale/string; this file (plus ./registry.ts, for
// the subset any browser/edge bundle also needs) is the one place a new
// project edits to register its own. Everything below the registries is
// generic wiring owned by cms/create-project.ts — it never varies per
// project, so it isn't hand-written here.

// --- Registration: the only per-project data below ---

// Connection/list fetchers below call `client.request()` with the raw generated
// `*Document` query string instead of the more convenient `client.queries.*()`
// SDK helper. This file is imported (via tina/config.ts's cmsCallback) into
// Tina's own admin app, which Tina builds as a separate Vite-bundled SPA — a
// different bundler from the Next.js app's webpack build that runs everywhere
// else. `TinaClient`'s constructor builds `client.queries` by invoking a
// factory function shipped in the generated `types.js`
// (`this.queries = queries(this)`); in that Vite bundle specifically, `client.
// queries` ends up `undefined` at runtime, so `client.queries.blogConnection()`
// throws "Cannot read properties of undefined (reading 'blogConnection')"
// before any request is even made — reproduced live on the deployed SEO/
// Translation dashboards, and matches a report of the identical symptom from
// another TinaCMS user hitting `client.queries.*` from custom admin-bundled
// code (https://github.com/tinacms/tinacms/discussions/4464). `client.
// request()` is a plain instance method (no factory step) and works
// identically under both bundlers. Single-document fetchers below
// (`fetchBySlug`/`fetchByPath`/`fetchDoc`) are untouched — they're never
// called from these dashboards, only from `resolve-by-slug.ts` (page
// rendering + Tina's visual-editing preview iframe, both webpack-bundled),
// and visual editing depends on their `{data, query, variables}` shape,
// which `client.request()` doesn't return (see "Visual editing" in
// CLAUDE.md) — swapping those too would fix nothing and break that shape.
const collectionRegistry = {
  blog: {
    ...collectionPathConfig.blog,
    draftFieldName: "draft",
    fetchEdges: () =>
      client
        .request<BlogConnectionQuery>({ query: BlogConnectionDocument }, {})
        .then((r) => r.data.blogConnection.edges),
    fetchBySlug: (relativePath: string) => client.queries.blog({ relativePath }),
  },
  products: {
    ...collectionPathConfig.products,
    draftFieldName: "draft",
    fetchEdges: () =>
      client
        .request<ProductsConnectionQuery>({ query: ProductsConnectionDocument }, {})
        .then((r) => r.data.productsConnection.edges),
    fetchBySlug: (relativePath: string) => client.queries.products({ relativePath }),
  },
};

const taxonomyRegistry = {
  categories: {
    ...taxonomyPathConfig.categories,
    fetchTerms: () =>
      client
        .request<CategoriesConnectionQuery>({ query: CategoriesConnectionDocument }, {})
        .then((r) => r.data.categoriesConnection.edges),
  },
  productCategories: {
    ...taxonomyPathConfig.productCategories,
    fetchTerms: () =>
      client
        .request<ProductCategoriesConnectionQuery>({ query: ProductCategoriesConnectionDocument }, {})
        .then((r) => r.data.productCategoriesConnection.edges),
  },
};

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

export type CollectionKey = keyof typeof collectionRegistry;
export type TaxonomyKey = keyof typeof taxonomyRegistry;
export type BlogPostItem = ConnectionItem<BlogConnectionQuery["blogConnection"]["edges"]>;
export type ProductItem = ConnectionItem<ProductsConnectionQuery["productsConnection"]["edges"]>;

// --- Wiring: one call, framework-owned (cms/create-project.ts) ---

export const {
  CMSCollection,
  CMSTaxonomy,
  CMSSingleton,
  CMSPages,
  CMSLocaleAlternates,
  CMSDictionary,
  CMSSeo,
  resolveLocaleAlternates,
  seoDashboardScreen,
  translationDashboardScreen,
} = createCmsProject({
  locales,
  defaultLocale,
  siteUrl,
  CMSMultilingual,
  collectionRegistry,
  taxonomyRegistry,
  singletonRegistry,
  pagesConfig: {
    // See the fetchEdges/fetchTerms comment above collectionRegistry — same
    // client.queries.* bug inside Tina's Vite-bundled admin.
    fetchConnection: (args) =>
      client
        .request<PagesConnectionQuery>(
          {
            query: PagesConnectionDocument,
            variables: { filter: { draft: { eq: false }, ...(args?.slug ? { slug: { eq: args.slug } } : {}) } },
          },
          {}
        )
        .then((r) => r.data.pagesConnection.edges),
    fetchByPath: (relativePath: string) => client.queries.pages({ relativePath }),
  },
  dictionaryConfig: {
    fetchEntries: () =>
      client
        .request<MultilingualQuery>({ query: MultilingualDocument, variables: { relativePath: "index.json" } }, {})
        .then(
          (r) =>
            (r.data.multilingual.entries ?? []).filter(
              (entry): entry is NonNullable<typeof entry> => !!entry
            ) as { key: string; values: Record<string, string | null | undefined> }[]
        ),
  },
});

// --- Typed query helpers (project-specific generics on top of generic CMS methods) ---

type BlogDocQuery = Awaited<ReturnType<typeof client.queries.blog>>;
type ProductDocQuery = Awaited<ReturnType<typeof client.queries.products>>;
type PagesDocQuery = Awaited<ReturnType<typeof client.queries.pages>>;
type SiteSettingsDoc = Awaited<ReturnType<typeof client.queries.siteSettings>>["data"]["siteSettings"];
type NavDoc = Awaited<ReturnType<typeof client.queries.nav>>["data"]["nav"];
type FooterDoc = Awaited<ReturnType<typeof client.queries.footer>>["data"]["footer"];

export const getBlogPostQuery = (locale: Locale, slug: string) =>
  CMSCollection.getCollectionItem<BlogDocQuery>({ collectionName: "blog", lang: locale, slug });

export const getProductQuery = (locale: Locale, slug: string) =>
  CMSCollection.getCollectionItem<ProductDocQuery>({ collectionName: "products", lang: locale, slug });

export const getPageQuery = (locale: Locale, slug: string) => CMSPages.getBySlug<PagesDocQuery>({ lang: locale, slug });

export const getSiteSettings = (locale: Locale) => CMSSingleton.get<SiteSettingsDoc>({ name: "siteSettings", lang: locale });

export const getNav = (locale: Locale) => CMSSingleton.get<NavDoc>({ name: "nav", lang: locale });

export const getFooter = (locale: Locale) => CMSSingleton.get<FooterDoc>({ name: "footer", lang: locale });

export const getMultilingualSettings = () =>
  client.queries.multilingual({ relativePath: "index.json" }).then((r) => r.data.multilingual);

/** Extra data some `pages` blocks need, fetched once per page render and shared by every route rendering `pages` blocks. Project-specific glue (hardcodes this project's block typenames), not cms/ framework logic. */
export async function getPageBlockData(
  locale: Locale,
  blocks: Array<{ __typename?: string | null } | null> | null | undefined
) {
  const typenames = new Set((blocks ?? []).map((b) => b?.__typename));
  const needsPosts = typenames.has("PagesBlocksFeaturedBlogPosts") || typenames.has("PagesBlocksBlogListing");
  const needsProducts = typenames.has("PagesBlocksProductListing");

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
