import { buildCollectionPath } from "./collection-path";

/**
 * Resolves the real public URL for a `pages` document, given its filename
 * and its own `slug` field. Two kinds of `pages` document don't resolve to
 * `/<slug>` directly: `home` (resolves to the site root) and any
 * collection's locked listing page (resolves to that collection's
 * translated URL via `buildCollectionPath`, not this document's `slug`
 * field at all).
 */
export function resolvePagesDocumentUrl<TCollectionName extends string, TLocale extends string>(
  registry: Record<TCollectionName, { locales: Record<TLocale, string>; listingPageFilename: string }>,
  localePath: (locale: TLocale, pathWithoutLocale: string) => string,
  locale: TLocale,
  filename: string,
  slug: string
): string {
  if (filename === "home") return localePath(locale, "/");

  const collectionName = (Object.keys(registry) as TCollectionName[]).find(
    (key) => registry[key].listingPageFilename === filename
  );
  if (collectionName) return buildCollectionPath(registry, localePath, locale, collectionName);

  return localePath(locale, `/${slug}`);
}
