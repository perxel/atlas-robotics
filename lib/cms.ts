import { cache } from "react";
import { client } from "@/tina/__generated__/client";
import type { BlogConnectionQuery, ProductsConnectionQuery } from "@/tina/__generated__/types";
import { CollectionService } from "@/cms/collection";
import { defaultLocale, locales, type Locale } from "@/lib/i18n";

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

/** Wrapped in React's cache() so generateMetadata and the page component
 * (and visual editing's useTina()) share one fetch per request — same
 * reasoning the original lib/tina-content.ts query helpers documented. */
export const getBlogPostQuery = cache((locale: Locale, slug: string) =>
  CMSCollection.getCollectionItem<BlogDocQuery>({ collectionName: "blog", lang: locale, slug })
);

export const getProductQuery = cache((locale: Locale, slug: string) =>
  CMSCollection.getCollectionItem<ProductDocQuery>({ collectionName: "products", lang: locale, slug })
);

export const getCollectionDocAlternates = cache(
  (collection: CollectionKey, locale: Locale, slug: string): Promise<Partial<Record<Locale, string>>> =>
    CMSCollection.getCollectionAlternates({ collectionName: collection, lang: locale, slug })
);
