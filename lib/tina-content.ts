import { cache } from "react";
import { client } from "@/tina/__generated__/client";
import { locales, localePath, type Locale } from "@/lib/i18n";
import { getTaxonomiesForCollection } from "@/lib/taxonomies";
import { collectionPath, getBlogPosts, getProducts, type CollectionKey } from "@/lib/cms";

/** Directory-based localization: content/<collection>/<locale>/<file>. Exported for app/sitemap.ts. */
export function inLocale<T extends { _sys: { breadcrumbs: string[] } }>(
  edges: Array<{ node?: T | null } | null> | null | undefined,
  locale: Locale
): T[] {
  return (edges || [])
    .map((edge) => edge?.node)
    .filter((node): node is T => !!node && node._sys.breadcrumbs[0] === locale);
}

export async function getSiteSettings(locale: Locale) {
  try {
    const res = await client.queries.siteSettings({
      relativePath: `${locale}.json`,
    });
    return res.data.siteSettings;
  } catch {
    return null;
  }
}

export async function getNav(locale: Locale) {
  try {
    const res = await client.queries.nav({ relativePath: `${locale}.json` });
    return res.data.nav;
  } catch {
    return null;
  }
}

export async function getFooter(locale: Locale) {
  try {
    const res = await client.queries.footer({ relativePath: `${locale}.json` });
    return res.data.footer;
  } catch {
    return null;
  }
}

export async function getCategories(locale: Locale) {
  const res = await client.queries.categoriesConnection();
  const categories = inLocale(res.data.categoriesConnection.edges, locale);
  return categories.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getProductCategories(locale: Locale) {
  const res = await client.queries.productCategoriesConnection();
  const categories = inLocale(res.data.productCategoriesConnection.edges, locale);
  return categories.sort((a, b) => a.title.localeCompare(b.title));
}

type TaxonomyTermDoc = { slug: string; _sys: { breadcrumbs: string[]; relativePath: string } };

/** Hardcoded per taxonomy name, same as archive.tsx's resolveTerm() and
 * getPageAlternates below — Tina's generated client is per-collection typed
 * (client.queries.categoriesConnection vs. .productCategoriesConnection),
 * so a new taxonomy needs a matching branch here too. The cast to
 * `TaxonomyTermDoc` is safe: every taxonomy defined via `defineTaxonomy`
 * (tina/collections/shared-fields/taxonomy.schema.tsx) shares this same
 * `title` + `slug` shape, only `__typename` differs between them. */
async function getTaxonomyDocs(
  taxonomy: string
): Promise<Array<{ node?: TaxonomyTermDoc | null } | null> | null> {
  if (taxonomy === "categories") {
    return (await client.queries.categoriesConnection()).data.categoriesConnection.edges as Array<{
      node?: TaxonomyTermDoc | null;
    } | null> | null;
  }
  if (taxonomy === "productCategories") {
    return (await client.queries.productCategoriesConnection()).data.productCategoriesConnection
      .edges as Array<{ node?: TaxonomyTermDoc | null } | null> | null;
  }
  return null;
}

/**
 * Cross-locale lookup for a taxonomy term, given the term's slug AS IT
 * APPEARS in `locale`'s URL. Mirrors getPageAlternates below: term docs
 * across locales are paired by filename (content/categories/en/news.md +
 * content/categories/vi/news.md), and each locale's own `slug` field can
 * genuinely diverge from the others (same as a `pages` document's slug
 * can) — so a taxonomy archive page's hreflang needs a real per-locale
 * lookup instead of assuming the term slug is the same word in every
 * locale, which is what lib/cms.ts's translateCollectionPath
 * does for the rest of a collection route (safe there only because a
 * post's/product's own slug IS assumed identical by convention — a
 * taxonomy term is a separate document with its own independently
 * editable `slug`, so that assumption doesn't hold for it).
 */
export const getTaxonomyTermAlternates = cache(
  async (
    taxonomy: string,
    locale: Locale,
    termSlug: string
  ): Promise<Partial<Record<Locale, string>>> => {
    const edges = await getTaxonomyDocs(taxonomy);
    if (!edges) return {};

    const current = inLocale(edges, locale).find((d) => d.slug === termSlug);
    const filename = current?._sys.relativePath.split("/").pop()?.replace(/\.md$/, "");
    if (!filename) return {};

    const result: Partial<Record<Locale, string>> = {};
    for (const l of locales) {
      const doc = inLocale(edges, l).find(
        (d) => d._sys.relativePath.split("/").pop()?.replace(/\.md$/, "") === filename
      );
      if (doc) result[l] = doc.slug;
    }
    return result;
  }
);

/**
 * Generic filter for any taxonomy attached via `taxonomyField` (see
 * tina/collections/shared-fields/taxonomy.schema.tsx and
 * lib/taxonomies.ts). `fieldName` is a taxonomy registry entry's
 * `fieldName` (e.g. "categories" on `blog`) — the field's shape is always
 * `{ term: { slug, ... } }[]` because `taxonomyField` defaults to
 * `multiple: true`, which wraps each term reference in a repeatable object
 * (see that file's comment for why a bare `reference` field can't be
 * `list: true` in Tina's admin). Filters in application code rather than a
 * GraphQL `filter` clause — same pattern as every other listing query in
 * this file — since nested list-object filter semantics aren't worth
 * relying on unverified.
 */
export function filterByTaxonomyTerm<T extends Record<string, unknown>>(
  entries: T[],
  fieldName: string,
  termSlug: string
): T[] {
  return entries.filter((entry) => {
    const terms = entry[fieldName] as
      | Array<{ term?: { slug?: string | null } | null } | null>
      | null
      | undefined;
    return terms?.some((t) => t?.term?.slug === termSlug) ?? false;
  });
}

/**
 * "Related" items for a detail page's related section: other entries in
 * `entries` (already fetched in full for the listing page — reused here
 * rather than a second query) that share at least one taxonomy term with
 * the entry whose slug is `currentSlug`, generalized across every taxonomy
 * attached to `collection` via the registry (lib/taxonomies.ts), same as
 * the taxonomy archive routes. Falls back to padding with other entries
 * (excluding the current one) when there's no taxonomy overlap — or no
 * taxonomy attached at all — so the section still shows `limit` items
 * instead of rendering sparse or empty.
 */
export function getRelatedEntries<T extends Record<string, unknown> & { slug: string }>(
  collection: string,
  entries: T[],
  currentSlug: string,
  limit = 3
): T[] {
  const others = entries.filter((entry) => entry.slug !== currentSlug);
  const current = entries.find((entry) => entry.slug === currentSlug);
  if (!current) return others.slice(0, limit);

  const fieldNames = getTaxonomiesForCollection(collection).map((t) => t.fieldName);
  const termSlugsOf = (entry: T): string[] =>
    fieldNames.flatMap((fieldName) => {
      const terms = entry[fieldName] as
        | Array<{ term?: { slug?: string | null } | null } | null>
        | null
        | undefined;
      return (terms ?? [])
        .map((t) => t?.term?.slug)
        .filter((slug): slug is string => !!slug);
    });

  const currentTermSlugs = new Set(termSlugsOf(current));
  const related =
    currentTermSlugs.size > 0
      ? others.filter((entry) => termSlugsOf(entry).some((slug) => currentTermSlugs.has(slug)))
      : [];

  if (related.length >= limit) return related.slice(0, limit);

  const seen = new Set(related.map((entry) => entry.slug));
  const padding = others.filter((entry) => !seen.has(entry.slug));
  return [...related, ...padding].slice(0, limit);
}

/**
 * Cross-locale existence check for a collection's listing page (e.g. the
 * `pages` document named by lib/cms.ts's `listingPageFilenames` for
 * "blog"), returning the collection's REAL translated URL (`collectionPath`)
 * per locale — NOT `getPageAlternates`, which would build the URL from that
 * document's own `slug` field. That field is locked and doesn't drive the
 * public URL for a listing page (see CLAUDE.md's "Collection-backed listing
 * pages" section: the real URL is owned by the collection registry in
 * lib/cms.ts, this document's `slug` is never read for routing) — reusing
 * getPageAlternates here would silently produce the wrong hreflang/switcher
 * URL (e.g. "/vi/blog" instead of "/vi/tin-tuc"). Still a real existence
 * check, though: a locale whose listing page document hasn't been created
 * yet is correctly omitted.
 *
 * This is a `pages`-collection concern (parallel to getPageAlternates
 * below), not a `blog`/`products` document lookup — CollectionService's own
 * cross-locale alternates (lib/cms.ts's getCollectionDocAlternates) covers
 * an individual post's/product's own detail page instead; see that file.
 */
export const getCollectionListingAlternates = cache(
  async (collection: CollectionKey, filename: string): Promise<Partial<Record<Locale, string>>> => {
    try {
      const res = await client.queries.pagesConnection({ filter: { draft: { eq: false } } });
      const result: Partial<Record<Locale, string>> = {};
      for (const l of locales) {
        const doc = inLocale(res.data.pagesConnection.edges, l).find(
          (d) => d._sys.relativePath.split("/").pop()?.replace(/\.md$/, "") === filename
        );
        if (doc) result[l] = collectionPath(l, collection);
      }
      return result;
    } catch {
      return {};
    }
  }
);

/**
 * Extra data some blocks need but don't carry themselves — fetched only
 * when a page actually uses that block, and shared between every route
 * that renders `pages` blocks (home, generic [slug], and now the
 * blog/products listing pages too) so the conditional-fetch logic lives in
 * one place instead of being duplicated across all of them.
 */
export async function getPageBlockData(
  locale: Locale,
  blocks: Array<{ __typename?: string | null } | null> | null | undefined
) {
  const typenames = new Set((blocks ?? []).map((b) => b?.__typename));
  const needsPosts =
    typenames.has("PagesBlocksFeaturedBlogPosts") || typenames.has("PagesBlocksBlogListing");
  const needsProducts = typenames.has("PagesBlocksProductListing");

  const [latestPosts, products] = await Promise.all([
    needsPosts ? getBlogPosts(locale) : Promise.resolve([]),
    needsProducts ? getProducts(locale) : Promise.resolve([]),
  ]);

  return { latestPosts, products };
}

/** Same two-step slug resolution as getBlogPostQuery — see its comment. */
export const getPageQuery = cache(async (locale: Locale, slug: string) => {
  try {
    const lookup = await client.queries.pagesConnection({
      filter: { slug: { eq: slug }, draft: { eq: false } },
    });
    const match = inLocale(lookup.data.pagesConnection.edges, locale)[0];
    if (!match) return null;
    return await client.queries.pages({ relativePath: match._sys.relativePath });
  } catch {
    return null;
  }
});

/**
 * Cross-locale sibling lookup for `pages` documents, keyed by filename —
 * e.g. getPageAlternates("about") finds en/about.md AND vi/about.md (even
 * though the vi one's `slug` field is "ve-chung-toi", a different word),
 * and returns each locale's real public URL built from that document's
 * own `slug`. Matching filename is what links translations together (see
 * "Migrating an existing fixed route to a pages document" and the
 * companion note on locked slugs in CLAUDE.md) — nothing else does, since
 * each locale's document is otherwise a fully independent file. Used by
 * lib/locale-alternates.ts for both hreflang (lib/seo.ts) and the language
 * switcher (Header.tsx) — wrapped in `cache()` so both call sites in the
 * same request share one fetch.
 */
export const getPageAlternates = cache(
  async (filename: string): Promise<Partial<Record<Locale, string>>> => {
    try {
      const res = await client.queries.pagesConnection({ filter: { draft: { eq: false } } });
      const result: Partial<Record<Locale, string>> = {};
      for (const l of locales) {
        const doc = inLocale(res.data.pagesConnection.edges, l).find(
          (d) => d._sys.relativePath.split("/").pop()?.replace(/\.md$/, "") === filename
        );
        if (doc) {
          result[l] = doc.slug === "home" ? localePath(l, "/") : localePath(l, `/${doc.slug}`);
        }
      }
      return result;
    } catch {
      return {};
    }
  }
);
