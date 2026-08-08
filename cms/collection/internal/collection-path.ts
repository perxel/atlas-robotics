/**
 * Locale-prefixed URL for `collectionName`, optionally with a sub-path
 * appended. The one place that combines a collection's own per-locale URL
 * segment with locale prefixing.
 */
export function buildCollectionPath<TCollectionName extends string, TLocale extends string>(
  registry: Record<TCollectionName, { locales: Record<TLocale, string> }>,
  localePath: (locale: TLocale, pathWithoutLocale: string) => string,
  locale: TLocale,
  collectionName: TCollectionName,
  rest = ""
): string {
  return localePath(locale, `/${registry[collectionName].locales[locale]}${rest}`);
}
