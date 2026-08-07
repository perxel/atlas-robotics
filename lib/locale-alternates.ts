import { locales, localePath, stripLocalePrefix, type Locale } from "@/lib/i18n";
import { collectionForSegment, translateCollectionPath } from "@/lib/collection-slugs";
import { getPageQuery, getPageAlternates } from "@/lib/tina-content";

/**
 * Given the current locale and pathname (locale-prefixed), resolves the
 * correct URL for every locale that has one. Single source of truth for
 * "what's the equivalent of this page in another locale" — used by both
 * hreflang/canonical (lib/seo.ts's buildAlternates) and the language
 * switcher (Header.tsx). Two cases:
 *
 * - **A collection route** (blog/products — listing, detail, or taxonomy
 *   archive; see lib/collection-slugs.ts): resolved by a pure string
 *   transform (`translateCollectionPath`), since an individual post's or
 *   product's own slug is assumed identical across locales by convention
 *   — only the collection's leading segment ("blog" -> "tin-tuc") differs.
 * - **Everything else**: treated as a `pages` document's own slug, which
 *   CAN genuinely diverge per locale (e.g. "about" / "ve-chung-toi") with
 *   nothing pairing them but a matching filename — resolved with a real
 *   cross-locale document lookup (`getPageAlternates`) instead of a guess.
 *
 * `getPageQuery`/`getPageAlternates` are both wrapped in React's `cache()`,
 * so calling this once from `generateMetadata` and again from `Header`
 * within the same request only costs one fetch each, not two.
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
  if (collectionForSegment(firstSegment)) {
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
