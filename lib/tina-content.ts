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
  const res = await client.queries.catalogConnection();
  const tabs = inLocale(res.data.catalogConnection.edges, locale);
  return tabs.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function getStoryCards(locale: Locale) {
  const res = await client.queries.storyCardsConnection();
  const cards = inLocale(res.data.storyCardsConnection.edges, locale);
  return cards.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export async function getBlogPosts(locale: Locale) {
  const res = await client.queries.blogConnection();
  const posts = inLocale(res.data.blogConnection.edges, locale);
  return posts.sort((a, b) => {
    const dateA = a.publishDate ? new Date(a.publishDate).getTime() : 0;
    const dateB = b.publishDate ? new Date(b.publishDate).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Single-document query by relativePath (locale as sub-folder), per Tina's
 * directory-based i18n guide. Returns the raw {data, query, variables}
 * response shape `useTina()` needs to enable visual editing on this page.
 * Wrapped in React's `cache()` so generateMetadata and the page component
 * share one request instead of querying twice.
 */
export const getBlogPostQuery = cache(async (locale: Locale, slug: string) => {
  try {
    return await client.queries.blog({ relativePath: `${locale}/${slug}.md` });
  } catch {
    return null;
  }
});

export async function getContactFormFields(locale: Locale) {
  const res = await client.queries.contactFormConfigConnection();
  const fields = inLocale(res.data.contactFormConfigConnection.edges, locale);
  return fields.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
