import { locales, localePath, stripLocalePrefix, type Locale } from "@/lib/cms";
import {
  collectionForSegment,
  translateCollectionPath,
  collectionPath,
  listingPageFilenameFor,
  getCollectionDocAlternates,
  CMSTaxonomy,
} from "@/lib/cms";
import { getPageQuery, getPageAlternates, getCollectionListingAlternates } from "@/lib/tina-content";

/**
 * Given the current locale and pathname (locale-prefixed), resolves the
 * correct URL for every locale that has one. Single source of truth for
 * "what's the equivalent of this page in another locale" — used by both
 * hreflang/canonical (lib/cms.ts's CMSSeo.buildAlternates) and the language
 * switcher (Header.tsx). Three cases:
 *
 * - **A taxonomy archive route** (blog/products + a registered taxonomy
 *   urlSegment + a term slug — see lib/cms.ts's CMSTaxonomy registration):
 *   the term slug is its own document's `slug` field, which can diverge per
 *   locale the same way a `pages` document's can, so it gets a real
 *   cross-locale lookup (`CMSTaxonomy.getTermAlternates`) — see
 *   `resolveTaxonomyArchiveAlternates` below. Checked before the plain
 *   collection-route case since its path shape is a superset of it.
 * - **A collection's listing page** (e.g. "/blog" itself): a real
 *   existence check (`getCollectionListingAlternates`) against the locked
 *   `pages` document named in lib/cms.ts's
 *   `listingPageFilename` — but the resulting URL is built from
 *   `collectionPath`, not that document's own `slug` field, since the
 *   locked document's `slug` never drives its real public URL (see
 *   CLAUDE.md). A locale that hasn't had its listing page created yet is
 *   correctly reported as missing, not guessed.
 * - **A collection detail page** (an individual blog post / product, e.g.
 *   "/blog/my-post"): resolved with `getCollectionDocAlternates`, a real
 *   cross-locale document lookup — NOT the pure string transform below.
 *   An untranslated post has no sibling document in that locale, so it's
 *   correctly omitted rather than assumed to exist under the same slug.
 * - **A taxonomy archive page's own listing shell** or anything else under
 *   a collection route that isn't a detail page: falls back to the pure
 *   string transform (`translateCollectionPath`), since only the
 *   collection's leading segment ("blog" -> "tin-tuc") differs there.
 * - **Everything else**: treated as a `pages` document's own slug, which
 *   CAN genuinely diverge per locale (e.g. "about" / "ve-chung-toi") with
 *   nothing pairing them but a matching filename — resolved with a real
 *   cross-locale document lookup (`getPageAlternates`) instead of a guess.
 *
 * `getPageQuery`/`getPageAlternates` are wrapped in React's `cache()`, so
 * calling this once from `generateMetadata` and again from `Header` within
 * the same request only costs one fetch each, not two.
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

    const rest = path.slice(`/${firstSegment}`.length); // "" (or "/") for the listing page itself
    if (!rest || rest === "/") {
      return getCollectionListingAlternates(collectionKey, listingPageFilenameFor(collectionKey));
    }

    const detailSlug = rest.split("/")[1];
    if (detailSlug) {
      return getCollectionDocAlternates(collectionKey, locale, detailSlug);
    }

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
 * "/blog/category/news/page/2" (see cms/pagination's canonicalPageHref
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

  const taxonomyName = CMSTaxonomy.resolveUrlSegment({
    collectionName: collectionKey,
    lang: locale,
    urlSegment: taxonomySegment,
  });
  if (!taxonomyName) return null;

  const termAlternates = await CMSTaxonomy.getTermAlternates({ taxonomyName, lang: locale, termSlug });
  if (Object.keys(termAlternates).length === 0) return null;

  // Both the term's own slug AND the taxonomy's urlSegment ("category" vs
  // "danh-muc") can differ per locale, so both parts of the path are
  // rebuilt per locale, not just the term slug.
  const restPath = rest.length ? `/${rest.join("/")}` : "";
  const result: Partial<Record<Locale, string>> = {};
  for (const l of locales) {
    const termSlugForLocale = termAlternates[l];
    const urlSegmentForLocale = CMSTaxonomy.getUrlSegment({
      collectionName: collectionKey,
      taxonomyName,
      lang: l,
    });
    if (!termSlugForLocale || !urlSegmentForLocale) continue;
    result[l] = collectionPath(l, collectionKey, `/${urlSegmentForLocale}/${termSlugForLocale}${restPath}`);
  }
  return result;
}
