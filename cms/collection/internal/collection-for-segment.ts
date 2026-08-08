/** Reverse lookup: a URL segment, in ANY registered locale's spelling, to the collection it belongs to. */
export function collectionForSegment<TCollectionName extends string, TLocale extends string>(
  registry: Record<TCollectionName, { locales: Record<TLocale, string> }>,
  locales: readonly TLocale[],
  segment: string
): TCollectionName | null {
  for (const key of Object.keys(registry) as TCollectionName[]) {
    if (locales.some((l) => registry[key].locales[l] === segment)) return key;
  }
  return null;
}
