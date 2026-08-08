import { type Locale, getBlogPosts, getProducts, CMSDictionary } from "@/lib/cms";

/**
 * Extra data some blocks need but don't carry themselves — fetched only
 * when a page actually uses that block, and shared between every route
 * that renders `pages` blocks (home, generic [slug], and the blog/products
 * listing pages) so the conditional-fetch logic lives in one place instead
 * of being duplicated across all of them.
 *
 * Project-specific glue, not generic `cms/` framework logic: it hardcodes
 * this project's own block typenames (PagesBlocksFeaturedBlogPosts, etc.,
 * from tina/collections/pages.schema.tsx's `pageBlocks`), which a
 * different project's block set would differ on.
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
