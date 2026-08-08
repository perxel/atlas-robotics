import { cache } from "react";
import { client } from "@/tina/__generated__/client";
import { locales, localePath, type Locale } from "@/lib/i18n";
import { collectionPath, getBlogPosts, getProducts, CMSDictionary, type CollectionKey } from "@/lib/cms";

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

  // Fetched unconditionally (unlike posts/products above): almost any block
  // — and PageView itself, for its breadcrumb — needs at least one
  // translated UI-chrome string, and it's one cheap single-document fetch
  // (wrapped in cache() at the source, see lib/cms.ts's multilingual
  // registration) rather than worth conditioning on block typenames too.
  const [latestPosts, products, uiDictionary] = await Promise.all([
    needsPosts ? getBlogPosts(locale) : Promise.resolve([]),
    needsProducts ? getProducts(locale) : Promise.resolve([]),
    CMSDictionary.loadMap(locale),
  ]);

  return { latestPosts, products, uiDictionary };
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
 * lib/locale-alternates.ts for both hreflang (CMSSeo, lib/cms.ts) and the language
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
