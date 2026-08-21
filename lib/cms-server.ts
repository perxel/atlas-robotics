import { cache } from "react";
import { client } from "@/tina/__generated__/client";
import type { BlogConnectionQuery, ProductsConnectionQuery } from "@/tina/__generated__/types";
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

// Passed as the 2nd arg to every `client.queries.*` call below. Tina's
// generated client spreads `fetchOptions` straight onto the underlying
// `fetch()` call (confirmed against node_modules/tinacms/dist/client.js's
// `request()` — not just typed, actually plumbed through), which is Next's
// own patched fetch during SSR, so these options are what make the read
// participate in Next's Data Cache at all. `cache: "force-cache"` opts back
// into caching (Next 15+ defaults every fetch to uncached); `tags: ["cms"]`
// is what app/api/revalidate/route.ts's `revalidateTag("cms")` invalidates.
// No `next.revalidate` — this is on-demand-only, not time-based, so a
// cached read stays valid until something actually calls revalidateTag.
const CMS_FETCH_OPTIONS = { fetchOptions: { cache: "force-cache", next: { tags: ["cms"] } } } as const;

// `CMS_FETCH_OPTIONS` above makes a read participate in Next's *cross-request*
// Data Cache (R2-backed in production) — it says nothing about whether two
// calls to the same function *within one request* get deduped. GraphQL reads
// go over POST, which Next's automatic per-request fetch memoization doesn't
// cover (that's GET-only) — so every `cache()` wrap below (React's, imported
// above) is what stops the same document from being fetched multiple times
// in a single render. Concretely: `getSiteSettings`/`CMSDictionary.loadMap`
// are each called independently from generateMetadata, the page component,
// Header, and Footer on every route — without this, that's 4 separate
// fetches (network round trips even on a cache hit) for the same document,
// every single page load. Traced every call site by hand: an unoptimized
// home page render fires an estimated ~28 distinct CMS fetches; this
// collapses it to ~9. That fan-out is also the leading suspect for a live
// Error 1102
// ("Worker exceeded resource limits") — a cold-cache window (right after a
// `revalidateTag` invalidation) means all ~28 of those become simultaneous
// live Tina Cloud calls in one Worker invocation instead of cheap cache
// reads. See CLAUDE.md's Known issues for the incident.

// Project registration for the cms/ framework — see .claude/docs/ for the
// design behind each domain below. cms/ itself never hardcodes a
// collection/taxonomy/locale/string; this file (plus ./registry.ts, for
// the subset any browser/edge bundle also needs) is the one place a new
// project edits to register its own. Everything below the registries is
// generic wiring owned by cms/create-project.ts — it never varies per
// project, so it isn't hand-written here.

// --- Registration: the only per-project data below ---

const collectionRegistry = {
  blog: {
    ...collectionPathConfig.blog,
    draftFieldName: "draft",
    fetchEdges: () =>
      client.queries.blogConnection(undefined, CMS_FETCH_OPTIONS).then((r) => r.data.blogConnection.edges),
    fetchBySlug: (relativePath: string) => client.queries.blog({ relativePath }, CMS_FETCH_OPTIONS),
  },
  products: {
    ...collectionPathConfig.products,
    draftFieldName: "draft",
    fetchEdges: () =>
      client.queries.productsConnection(undefined, CMS_FETCH_OPTIONS).then((r) => r.data.productsConnection.edges),
    fetchBySlug: (relativePath: string) => client.queries.products({ relativePath }, CMS_FETCH_OPTIONS),
  },
};

const taxonomyRegistry = {
  categories: {
    ...taxonomyPathConfig.categories,
    fetchTerms: () =>
      client.queries.categoriesConnection(undefined, CMS_FETCH_OPTIONS).then((r) => r.data.categoriesConnection.edges),
  },
  productCategories: {
    ...taxonomyPathConfig.productCategories,
    fetchTerms: () =>
      client.queries
        .productCategoriesConnection(undefined, CMS_FETCH_OPTIONS)
        .then((r) => r.data.productCategoriesConnection.edges),
  },
};

const singletonRegistry = {
  siteSettings: {
    fetchDoc: (l: Locale) =>
      client.queries.siteSettings({ relativePath: `${l}.json` }, CMS_FETCH_OPTIONS).then((r) => r.data.siteSettings),
  },
  footer: {
    fetchDoc: (l: Locale) =>
      client.queries.footer({ relativePath: `${l}.json` }, CMS_FETCH_OPTIONS).then((r) => r.data.footer),
  },
};

export type CollectionKey = keyof typeof collectionRegistry;
export type TaxonomyKey = keyof typeof taxonomyRegistry;
export type BlogPostItem = ConnectionItem<BlogConnectionQuery["blogConnection"]["edges"]>;
export type ProductItem = ConnectionItem<ProductsConnectionQuery["productsConnection"]["edges"]>;

// --- Wiring: one call, framework-owned (cms/create-project.ts) ---

// `getMultilingualSettings` (below) and the dictionary both need this same
// `multilingual/index.json` document. Before this was two independent
// functions each calling `client.queries.multilingual(...)` on their own —
// `cache()` only dedupes repeated calls to the *same* function reference, so
// wrapping each of those separately wouldn't have stopped the duplicate.
// One shared cached fetcher, used by both, is what actually collapses it to
// one fetch.
const getMultilingualDoc = cache(() =>
  client.queries.multilingual({ relativePath: "index.json" }, CMS_FETCH_OPTIONS).then((r) => r.data.multilingual)
);

export const {
  CMSCollection,
  CMSTaxonomy,
  CMSSingleton,
  CMSPages,
  CMSLocaleAlternates,
  CMSDictionary,
  CMSSeo,
  resolveLocaleAlternates: resolveLocaleAlternatesUncached,
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
    // Shared by every nav link that references a page (`getAlternates`/
    // `getTitleAlternates`, both called per link — see `resolveNavLink`
    // below) and by `resolveLocaleAlternates`'s pages branch. None of those
    // filter by slug, so they're all the same cache key — before `cache()`,
    // a 4-link nav meant 8 identical full-connection fetches per render.
    fetchConnection: cache((args?: { slug?: string }) =>
      client.queries
        .pagesConnection(
          { filter: { draft: { eq: false }, ...(args?.slug ? { slug: { eq: args.slug } } : {}) } },
          CMS_FETCH_OPTIONS
        )
        .then((r) => r.data.pagesConnection.edges)
    ),
    fetchByPath: cache((relativePath: string) => client.queries.pages({ relativePath }, CMS_FETCH_OPTIONS)),
  },
  dictionaryConfig: {
    fetchEntries: () =>
      getMultilingualDoc().then(
        (doc) =>
          (doc.entries ?? []).filter(
            (entry): entry is NonNullable<typeof entry> => !!entry
          ) as { key: string; values: Record<string, string | null | undefined> }[]
      ),
  },
});

// `CMSLocaleAlternates.resolve` (what this wraps) is called once per route
// from that route's `generateMetadata` and again from `Header` — same
// argument each time, so `cache()` collapses it to one call; its own pages
// branch also routes through the now-cached `fetchConnection` above.
export const resolveLocaleAlternates = cache(resolveLocaleAlternatesUncached);

// --- Typed query helpers (project-specific generics on top of generic CMS methods) ---

type BlogDocQuery = Awaited<ReturnType<typeof client.queries.blog>>;
type ProductDocQuery = Awaited<ReturnType<typeof client.queries.products>>;
type PagesDocQuery = Awaited<ReturnType<typeof client.queries.pages>>;
type SiteSettingsDoc = Awaited<ReturnType<typeof client.queries.siteSettings>>["data"]["siteSettings"];
type NavDoc = Awaited<ReturnType<typeof client.queries.nav>>["data"]["nav"];
// Hand-written, not derived from the generated `NavLinks`/`NavLinksChildren`
// types: those are nominally distinct (different `__typename` literals,
// and only `NavLinks` — the top level — actually has a `children` field)
// even though they're structurally identical otherwise. Recursing over
// both with one function needs a shape that doesn't care which one it was
// given, which a derived type can't express since children only nest one
// level deep in Tina's schema (see site-nav.schema.tsx).
type NavLinkDoc = {
  // `label` (Custom Link) and `labelOverride` (Page Link) are deliberately
  // two different field names, not one shared `label` — see
  // site-nav.schema.tsx's comment on `pageLinkLabelField`: reusing the same
  // field name across the two templates with different required-ness broke
  // GraphQL's field-merging validation ("conflicting types String vs
  // String!"), confirmed live. A generic resolver over both templates just
  // checks whichever one the item actually has.
  label?: { en?: string | null; vi?: string | null; zh?: string | null } | null;
  labelOverride?: { en?: string | null; vi?: string | null; zh?: string | null } | null;
  page?: { _sys: { filename: string } } | null;
  // One URL per language for a Custom Link (a plain string only for a
  // truly locale-independent link like an external site would be a lie for
  // an internal path that genuinely translates, e.g. a taxonomy archive —
  // see site-nav.schema.tsx's `customLinkUrlField`). A Page Link has no
  // `url` at all; its URL always comes from `page` instead.
  url?: { en?: string | null; vi?: string | null; zh?: string | null } | null;
  openInNewTab?: boolean | null;
  children?: (NavLinkDoc | null)[] | null;
} | null;
type FooterDoc = Awaited<ReturnType<typeof client.queries.footer>>["data"]["footer"];

// Each of these four is called at least twice per render (a route's
// `generateMetadata` plus its page component; `getSiteSettings` also from
// Header and Footer) — `cache()` collapses every one of those pairs to a
// single fetch.
export const getBlogPostQuery = cache((locale: Locale, slug: string) =>
  CMSCollection.getCollectionItem<BlogDocQuery>({ collectionName: "blog", lang: locale, slug })
);

export const getProductQuery = cache((locale: Locale, slug: string) =>
  CMSCollection.getCollectionItem<ProductDocQuery>({ collectionName: "products", lang: locale, slug })
);

export const getPageQuery = cache((locale: Locale, slug: string) =>
  CMSPages.getBySlug<PagesDocQuery>({ lang: locale, slug })
);

export const getSiteSettings = cache((locale: Locale) =>
  CMSSingleton.get<SiteSettingsDoc>({ name: "siteSettings", lang: locale })
);

// Not a `singletonRegistry` entry (same reasoning `multilingual` never was
// one): a single non-per-locale document, `index.json`, not one file per
// locale — so it needs its own tolerant-fallback fetch rather than
// `SingletonService.get()`'s per-locale lookup shape.
export const getNav = cache(() =>
  client.queries
    .nav({ relativePath: "index.json" }, CMS_FETCH_OPTIONS)
    .then((r) => r.data.nav)
    .catch(() => null)
);

export type ResolvedNavLink = {
  label: string;
  url: string;
  openInNewTab?: boolean | null;
  children: ResolvedNavLink[];
};

async function resolveNavLink(link: NavLinkDoc, locale: Locale): Promise<ResolvedNavLink | null> {
  if (!link) return null;

  // A referenced `page` wins over the manual `url` fallback — its URL is
  // resolved per locale via the same cross-locale-by-filename lookup
  // (`CMSPages.getAlternates`) hreflang/the language switcher already use,
  // so it can't drift from the page's own real routing.
  let label =
    link.labelOverride?.[locale] ||
    link.label?.[locale] ||
    link.labelOverride?.[defaultLocale] ||
    link.label?.[defaultLocale] ||
    "";
  let url = link.url?.[locale] || link.url?.[defaultLocale] || "#";
  const filename = link.page?._sys?.filename;
  if (filename) {
    const [urlAlternates, titleAlternates] = await Promise.all([
      CMSPages.getAlternates(filename),
      // `labelOverride`'s own admin description calls it an override — it's
      // optional for exactly this reason: with nothing typed, the page's
      // own title (already translated per locale) stands in, so nothing
      // has to be retyped a second time.
      CMSPages.getTitleAlternates(filename),
    ]);
    url = urlAlternates[locale] || urlAlternates[defaultLocale] || url;
    label = label || titleAlternates[locale] || titleAlternates[defaultLocale] || label;
  }

  const children = (
    await Promise.all((link.children ?? []).map((child) => resolveNavLink(child, locale)))
  ).filter((c): c is ResolvedNavLink => !!c);

  return { label, url, openInNewTab: link.openInNewTab, children };
}

/** The "smart render" step: one locale-agnostic document in, flat
 * locale-resolved links out — everything downstream (`NavMenu.tsx`) never
 * needs to know locales exist at all. */
export async function resolveNavLinks(nav: NavDoc | null | undefined, locale: Locale): Promise<ResolvedNavLink[]> {
  const resolved = await Promise.all((nav?.links ?? []).map((link) => resolveNavLink(link, locale)));
  return resolved.filter((l): l is ResolvedNavLink => !!l);
}

export const getFooter = cache((locale: Locale) => CMSSingleton.get<FooterDoc>({ name: "footer", lang: locale }));

// Same document as the dictionary's own fetch (see `getMultilingualDoc`
// above) — sharing that one cached fetcher rather than querying again here
// is what actually dedupes it; both call sites doing their own independent
// `cache()` wrap would not have.
export const getMultilingualSettings = () => getMultilingualDoc();

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
