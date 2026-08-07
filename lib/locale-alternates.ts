import { locales, localePath, stripLocalePrefix, type Locale } from "@/lib/i18n";
import { collectionForSegment, translateCollectionPath, collectionPath } from "@/lib/collection-slugs";
import { getTaxonomyRegistryEntry } from "@/lib/taxonomies";
import { getPageQuery, getPageAlternates, getTaxonomyTermAlternates } from "@/lib/tina-content";

/**
 * Given the current locale and pathname (locale-prefixed), resolves the
 * correct URL for every locale that has one. Single source of truth for
 * "what's the equivalent of this page in another locale" — used by both
 * hreflang/canonical (lib/seo.ts's buildAlternates) and the language
 * switcher (Header.tsx). Three cases:
 *
 * - **A taxonomy archive route** (blog/products + a registered taxonomy
 *   urlSegment + a term slug — see lib/taxonomies.ts): the term slug is its
 *   own document's `slug` field, which can diverge per locale the same way
 *   a `pages` document's can, so it gets a real cross-locale lookup
 *   (`getTaxonomyTermAlternates`) — see `resolveTaxonomyArchiveAlternates`
 *   below. Checked before the plain collection-route case since its path
 *   shape is a superset of it.
 * - **Any other collection route** (blog/products listing/detail — see
 *   lib/collection-slugs.ts): resolved by a pure string transform
 *   (`translateCollectionPath`), since an individual post's or product's
 *   own slug is assumed identical across locales by convention — only the
 *   collection's leading segment ("blog" -> "tin-tuc") differs.
 * - **Everything else**: treated as a `pages` document's own slug, which
 *   CAN genuinely diverge per locale (e.g. "about" / "ve-chung-toi") with
 *   nothing pairing them but a matching filename — resolved with a real
 *   cross-locale document lookup (`getPageAlternates`) instead of a guess.
 *
 * `getPageQuery`/`getPageAlternates`/`getTaxonomyTermAlternates` are all
 * wrapped in React's `cache()`, so calling this once from `generateMetadata`
 * and again from `Header` within the same request only costs one fetch each,
 * not two.
 */
export async function resolveLocaleAlternates(
  locale: Locale,
  pathname: string
): Promise<Partial<Record<Locale, string>>> {
  const path = stripLocalePrefix(pathname);

  if (path === "/") {
    // Home is a `pages` document with the well-known filename "home" — no
    // slug lookup needed to find it, same shortcut getPageQuery(locale,
    // "home") already takes.
    return getPageAlternates("home");
  }

  const firstSegment = path.split("/")[1];
  const collectionKey = collectionForSegment(firstSegment);
  if (collectionKey) {
    const taxonomyAlternates = await resolveTaxonomyArchiveAlternates(collectionKey, locale, path);
    if (taxonomyAlternates) return taxonomyAlternates;

    const result: Partial<Record<Locale, string>> = {};
    for (const l of locales) {
      result[l] = localePath(l, translateCollectionPath(path, l));
    }
    return result;
  }

  const slug = path.slice(1);
  const result = await getPageQuery(locale, slug);
  const relativePath = result?.data.pages?._sys.relativePath;
  if (!relativePath) return {};

  const filename = relativePath.split("/").pop()?.replace(/\.md$/, "");
  if (!filename) return {};

  return getPageAlternates(filename);
}

/**
 * `path` is locale-free, e.g. "/blog/category/news" or, paginated,
 * "/blog/category/news/page/2" (see lib/pagination.ts's canonicalPageHref
 * for that URL shape). Returns null (not `{}`) when `path` isn't a
 * taxonomy archive route at all, so the caller falls through to the plain
 * collection-route transform instead of treating "no term matched" as "no
 * alternates exist".
 */
async function resolveTaxonomyArchiveAlternates(
  collectionKey: NonNullable<ReturnType<typeof collectionForSegment>>,
  locale: Locale,
  path: string
): Promise<Partial<Record<Locale, string>> | null> {
  const [, , taxonomySegment, termSlug, ...rest] = path.split("/");
  if (!taxonomySegment || !termSlug) return null;

  const entry = getTaxonomyRegistryEntry(collectionKey, locale, taxonomySegment);
  if (!entry) return null;

  const termAlternates = await getTaxonomyTermAlternates(entry.taxonomy, locale, termSlug);
  if (Object.keys(termAlternates).length === 0) return null;

  // Both the term's own slug AND the taxonomy's urlSegment ("category" vs
  // "danh-muc") can differ per locale — see lib/taxonomies.ts's
  // urlSegment map — so both parts of the path are rebuilt per locale,
  // not just the term slug.
  const restPath = rest.length ? `/${rest.join("/")}` : "";
  const result: Partial<Record<Locale, string>> = {};
  for (const l of locales) {
    const termSlugForLocale = termAlternates[l];
    if (!termSlugForLocale) continue;
    result[l] = collectionPath(
      l,
      collectionKey,
      `/${entry.urlSegment[l]}/${termSlugForLocale}${restPath}`
    );
  }
  return result;
}
