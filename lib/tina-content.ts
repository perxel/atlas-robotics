import { cache } from "react";
import { client } from "@/tina/__generated__/client";
import { locales, localePath, type Locale } from "@/lib/i18n";
import { getTaxonomiesForCollection } from "@/lib/taxonomies";

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

export async function getBlogPosts(locale: Locale) {
  const res = await client.queries.blogConnection({ filter: { draft: { eq: false } } });
  const posts = inLocale(res.data.blogConnection.edges, locale);
  return posts.sort((a, b) => {
    const dateA = a.publishDate ? new Date(a.publishDate).getTime() : 0;
    const dateB = b.publishDate ? new Date(b.publishDate).getTime() : 0;
    return dateB - dateA;
  });
}

export async function getCategories(locale: Locale) {
  const res = await client.queries.categoriesConnection();
  const categories = inLocale(res.data.categoriesConnection.edges, locale);
  return categories.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getProducts(locale: Locale) {
  const res = await client.queries.productsConnection({ filter: { draft: { eq: false } } });
  return inLocale(res.data.productsConnection.edges, locale);
}

export async function getProductCategories(locale: Locale) {
  const res = await client.queries.productCategoriesConnection();
  const categories = inLocale(res.data.productCategoriesConnection.edges, locale);
  return categories.sort((a, b) => a.title.localeCompare(b.title));
}

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
 * Single-document query by relativePath, resolved in two steps from the
 * `slug` field — not by assuming filename === slug, since Tina lets editors
 * set the filename and the slug field independently. Safe to trust `slug`
 * as unique per locale because `slugLifecycleGuard`
 * (tina/collections/shared-fields/slug.schema.tsx)
 * blocks saving a duplicate through the admin. Returns the raw
 * {data, query, variables} response shape `useTina()` needs to enable
 * visual editing on this page. Wrapped in React's `cache()` so
 * generateMetadata and the page component share one request.
 */
export const getBlogPostQuery = cache(async (locale: Locale, slug: string) => {
  try {
    const lookup = await client.queries.blogConnection({
      filter: { slug: { eq: slug }, draft: { eq: false } },
    });
    const match = inLocale(lookup.data.blogConnection.edges, locale)[0];
    if (!match) return null;
    return await client.queries.blog({ relativePath: match._sys.relativePath });
  } catch {
    return null;
  }
});

/** Same two-step slug resolution as getBlogPostQuery — see its comment. */
export const getProductQuery = cache(async (locale: Locale, slug: string) => {
  try {
    const lookup = await client.queries.productsConnection({
      filter: { slug: { eq: slug }, draft: { eq: false } },
    });
    const match = inLocale(lookup.data.productsConnection.edges, locale)[0];
    if (!match) return null;
    return await client.queries.products({ relativePath: match._sys.relativePath });
  } catch {
    return null;
  }
});

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
