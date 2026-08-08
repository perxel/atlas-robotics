/**
 * Other entries that share at least one term (per `getTermSlugs`) with the
 * entry whose slug is `currentSlug`, padded with other entries when there's
 * no overlap — or no terms at all — so the caller still gets `limit` items
 * instead of a sparse or empty result.
 */
export function getRelatedEntriesInternal<T extends { slug: string }>(
  entries: T[],
  currentSlug: string,
  getTermSlugs: (item: T) => string[],
  limit: number
): T[] {
  const others = entries.filter((entry) => entry.slug !== currentSlug);
  const current = entries.find((entry) => entry.slug === currentSlug);
  if (!current) return others.slice(0, limit);

  const currentTermSlugs = new Set(getTermSlugs(current));
  const related =
    currentTermSlugs.size > 0
      ? others.filter((entry) => getTermSlugs(entry).some((slug) => currentTermSlugs.has(slug)))
      : [];

  if (related.length >= limit) return related.slice(0, limit);

  const seen = new Set(related.map((entry) => entry.slug));
  const padding = others.filter((entry) => !seen.has(entry.slug));
  return [...related, ...padding].slice(0, limit);
}
