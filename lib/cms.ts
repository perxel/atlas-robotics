import {client} from "@/tina/__generated__/client";
import type {BlogConnectionQuery, ProductsConnectionQuery} from "@/tina/__generated__/types";
import {CollectionService, type ConnectionItem} from "@/cms/collection";
import {TaxonomyService} from "@/cms/taxonomy";
import {DictionaryService} from "@/cms/multilingual";
import {SeoService, siteUrl} from "@/cms/seo";
import {SingletonService} from "@/cms/singleton";
import {PagesService} from "@/cms/pages";
import {LocaleAlternatesService} from "@/cms/locale-alternates";
import {CMSMultilingual, defaultLocale, type Locale, localeLabels, locales} from "./locale";
import {collectionPathConfig, taxonomyPathConfig} from "./collection-paths";

export { locales, type Locale, defaultLocale, localeLabels, CMSMultilingual };
export { blocksDisabledSlugs } from "./collection-paths";

// Project registration for the cms/ framework — see .claude/docs/ for the
// design behind each domain below. cms/ itself never hardcodes a
// collection/taxonomy/locale/string; this file is the one place a new
// project edits to register its own. Locale registration lives in
// ./locale.ts instead of here so middleware.ts can import it without
// pulling in the generated Tina client (see that file's own comment).

// --- Collections (cms/collection) ---

export type BlogPostItem = ConnectionItem<BlogConnectionQuery["blogConnection"]["edges"]>;
export type ProductItem = ConnectionItem<ProductsConnectionQuery["productsConnection"]["edges"]>;

const collectionRegistry = {
    blog: {
        ...collectionPathConfig.blog,
        draftFieldName: "draft",
        fetchEdges: () => client.queries.blogConnection().then((r) => r.data.blogConnection.edges),
        fetchBySlug: (relativePath: string) => client.queries.blog({relativePath}),
    },
    products: {
        ...collectionPathConfig.products,
        draftFieldName: "draft",
        fetchEdges: () => client.queries.productsConnection().then((r) => r.data.productsConnection.edges),
        fetchBySlug: (relativePath: string) => client.queries.products({relativePath}),
    },
};

export type CollectionKey = keyof typeof collectionRegistry;

export const CMSCollection = new CollectionService(collectionRegistry, { defaultLocale, locales });

type BlogDocQuery = Awaited<ReturnType<typeof client.queries.blog>>;
type ProductDocQuery = Awaited<ReturnType<typeof client.queries.products>>;

export const getBlogPostQuery = (locale: Locale, slug: string) =>
    CMSCollection.getCollectionItem<BlogDocQuery>({collectionName: "blog", lang: locale, slug});

export const getProductQuery = (locale: Locale, slug: string) =>
    CMSCollection.getCollectionItem<ProductDocQuery>({collectionName: "products", lang: locale, slug});

// --- Singletons (cms/singleton) — site-wide docs, one file per locale ---

const singletonRegistry = {
    siteSettings: {
        fetchDoc: (l: Locale) => client.queries.siteSettings({relativePath: `${l}.json`}).then((r) => r.data.siteSettings),
    },
    nav: {
        fetchDoc: (l: Locale) => client.queries.nav({relativePath: `${l}.json`}).then((r) => r.data.nav),
    },
    footer: {
        fetchDoc: (l: Locale) => client.queries.footer({relativePath: `${l}.json`}).then((r) => r.data.footer),
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

// --- Pages (cms/pages) — generic slug-routed collection ---

export const CMSPages = new PagesService(
    {
        fetchConnection: (args) =>
            client.queries
                .pagesConnection({
                    filter: {draft: {eq: false}, ...(args?.slug ? {slug: {eq: args.slug}} : {})},
                })
                .then((r) => r.data.pagesConnection.edges),
        fetchByPath: (relativePath: string) => client.queries.pages({relativePath}),
    },
    {
        localePath: CMSMultilingual.localePath.bind(CMSMultilingual),
        getCollectionPath: (args) =>
            CMSCollection.getCollectionPath({collectionName: args.collectionName as CollectionKey, lang: args.lang}),
    },
    {locales, defaultLocale}
);

type PagesDocQuery = Awaited<ReturnType<typeof client.queries.pages>>;

export const getPageQuery = (locale: Locale, slug: string) => CMSPages.getBySlug<PagesDocQuery>({ lang: locale, slug });

/** Slugs `pages` documents can't use — Next.js resolves these dedicated routes over the `[slug]` catch-all. Enforced via `slugField({ reserved })`. */
export const reservedSlugs = new Set<string>(["admin", "api"]);

/** `pages` documents whose `slug` can't be changed through the admin — see `slugLifecycleGuard`. `home` plus every collection's locked listing page. */
export const lockedSlugFilenames = new Set<string>([
    "home",
    ...CMSCollection.getRegisteredCollectionNames().map((name) => CMSCollection.getListingPageFilename(name)),
]);

// --- Taxonomies (cms/taxonomy) — depends on CMSCollection ---

const taxonomyRegistry = {
    categories: {
        ...taxonomyPathConfig.categories,
        fetchTerms: () => client.queries.categoriesConnection().then((r) => r.data.categoriesConnection.edges),
    },
    productCategories: {
        ...taxonomyPathConfig.productCategories,
        fetchTerms: () =>
            client.queries.productCategoriesConnection().then((r) => r.data.productCategoriesConnection.edges),
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
    {defaultLocale, locales}
);

// --- Locale alternates (cms/locale-alternates) — depends on CMSMultilingual/CMSCollection/CMSTaxonomy/CMSPages ---

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
            CMSPages.getListingAlternates({collectionName: args.collectionName, filename: args.filename}),
    },
    {locales}
);

/** Resolves the current page's URL in every other locale — see LocaleAlternatesService for how each route shape is handled. */
export const resolveLocaleAlternates = (locale: Locale, pathname: string) => CMSLocaleAlternates.resolve(locale, pathname);

// --- Dictionary (cms/multilingual) ---

export const CMSDictionary = new DictionaryService<Locale>(
    {
        fetchEntries: () =>
            client.queries.multilingual({relativePath: "index.json"}).then(
                (r) =>
                    (r.data.multilingual.entries ?? []).filter(
                        (entry): entry is NonNullable<typeof entry> => !!entry
                    ) as { key: string; values: Record<string, string | null | undefined> }[]
            ),
    },
    {defaultLocale}
);

export const getMultilingualSettings = () =>
    client.queries.multilingual({relativePath: "index.json"}).then((r) => r.data.multilingual);

/** Extra data some `pages` blocks need, fetched once per page render and shared by every route rendering `pages` blocks. Project-specific glue (hardcodes this project's block typenames), not cms/ framework logic. */
export async function getPageBlockData(
    locale: Locale,
    blocks: Array<{ __typename?: string | null } | null> | null | undefined
) {
    const typenames = new Set((blocks ?? []).map((b) => b?.__typename));
    const needsPosts =
        typenames.has("PagesBlocksFeaturedBlogPosts") || typenames.has("PagesBlocksBlogListing");
    const needsProducts = typenames.has("PagesBlocksProductListing");

    const [latestPosts, products, uiDictionary] = await Promise.all([
        needsPosts
            ? CMSCollection.getCollectionItems<BlogPostItem>({
                collectionName: "blog",
                lang: locale,
                sort: {field: "publishDate", direction: "desc", type: "date"},
            }).then((r) => r.items)
            : Promise.resolve([]),
        needsProducts
            ? CMSCollection.getCollectionItems<ProductItem>({collectionName: "products", lang: locale}).then(
                (r) => r.items
            )
            : Promise.resolve([]),
        CMSDictionary.loadMap(locale),
    ]);

    return {latestPosts, products, uiDictionary};
}

// --- SEO (cms/seo) ---

export const CMSSeo = new SeoService({ siteUrl, defaultLocale, locales: CMSMultilingual.getEnabledLocales() });

// seoDashboardScreen/translationDashboardScreen live in lib/dashboards.ts,
// not here — admin-only JSX, kept out of this file's bundle graph.
