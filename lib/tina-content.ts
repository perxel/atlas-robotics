import { cache } from "react";
import { client } from "@/tina/__generated__/client";
import type { Locale } from "@/lib/i18n";

/** Directory-based localization: content/<collection>/<locale>/<file>. */
function inLocale<T extends { _sys: { breadcrumbs: string[] } }>(
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

export async function getForms(locale: Locale) {
  try {
    const res = await client.queries.forms({ relativePath: `${locale}.json` });
    return res.data.forms;
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
 * Single-document query by relativePath, resolved in two steps from the
 * `slug` field — not by assuming filename === slug, since Tina lets editors
 * set the filename and the slug field independently. Safe to trust `slug`
 * as unique per locale because `slugUniquenessGuard`
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
 * Extra data some page blocks need but don't carry themselves —
 * `FeaturedBlogPosts` needs blog posts, `Newsletter` needs the global
 * forms doc's copy (lib/tina-content.ts's `getForms`). Fetched only when a
 * page actually uses the block, and shared between the home route
 * (app/[locale]/page.tsx) and the generic pages route
 * (app/[locale]/[slug]/page.tsx) so the conditional-fetch logic lives in
 * one place instead of being duplicated across both.
 */
export async function getPageBlockData(
  locale: Locale,
  blocks: Array<{ __typename?: string | null } | null> | null | undefined
) {
  const typenames = new Set((blocks ?? []).map((b) => b?.__typename));
  const [latestPosts, forms] = await Promise.all([
    typenames.has("PagesBlocksFeaturedBlogPosts") ? getBlogPosts(locale) : Promise.resolve([]),
    typenames.has("PagesBlocksNewsletter") ? getForms(locale) : Promise.resolve(null),
  ]);
  return { latestPosts, newsletterFormCopy: forms?.newsletterForm };
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
