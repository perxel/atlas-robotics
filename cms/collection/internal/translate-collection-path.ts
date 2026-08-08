import { collectionForSegment } from "./collection-for-segment";

/**
 * Rewrites the leading collection segment of a locale-free path (e.g.
 * "/tin-tuc/my-post") to its equivalent for `locale` (e.g. "/blog/my-post").
 * No-op if the path's first segment isn't a known collection.
 */
export function translateCollectionPath<TCollectionName extends string, TLocale extends string>(
  registry: Record<TCollectionName, { locales: Record<TLocale, string> }>,
  locales: readonly TLocale[],
  pathWithoutLocale: string,
  locale: TLocale
): string {
  const match = pathWithoutLocale.match(/^\/([^/]+)(\/.*)?$/);
  if (!match) return pathWithoutLocale;
  const [, segment, rest] = match;
  const collectionName = collectionForSegment(registry, locales, segment);
  if (!collectionName) return pathWithoutLocale;
  return `/${registry[collectionName].locales[locale]}${rest ?? ""}`;
}
