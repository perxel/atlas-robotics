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

export async function getCatalogTabs(locale: Locale) {
  const res = await client.queries.catalogConnection({ filter: { draft: { eq: false } } });
  const tabs = inLocale(res.data.catalogConnection.edges, locale);
  return tabs.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function getStoryCards(locale: Locale) {
  const res = await client.queries.storyCardsConnection({ filter: { draft: { eq: false } } });
  const cards = inLocale(res.data.storyCardsConnection.edges, locale);
  return cards.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
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

/**
 * Single-document query by relativePath, resolved in two steps from the
 * `slug` field — not by assuming filename === slug, since Tina lets editors
 * set the filename and the slug field independently. Safe to trust `slug`
 * as unique per locale because `slugUniquenessGuard` (tina/slug-field.ts)
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

export async function getContactFormFields(locale: Locale) {
  const res = await client.queries.contactFormConfigConnection();
  const fields = inLocale(res.data.contactFormConfigConnection.edges, locale);
  return fields.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
