/**
 * Pure array filter for a taxonomy field attached via `taxonomyField()`
 * (see cms/collection's registry / tina/collections/shared-fields/taxonomy.schema.tsx).
 * `fieldName`'s shape is always `{ term: { slug, ... } }[]` because
 * `taxonomyField` defaults to `multiple: true`, which wraps each term
 * reference in a repeatable object (a bare `reference` field can't be
 * `list: true` in Tina's admin).
 */
export function filterByTerm<T extends Record<string, unknown>>(
  entries: T[],
  fieldName: string,
  termSlug: string
): T[] {
  return entries.filter((entry) => {
    const terms = entry[fieldName] as
      | Array<{ term?: { slug?: string | null } | null } | null>
      | null
      | undefined;
    return terms?.some((t) => t?.term?.slug === termSlug) ?? false;
  });
}
