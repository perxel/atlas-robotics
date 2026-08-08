# Taxonomy — plan vs. built

Cross-check of `.claude/plans/02-taxonomy.md` (deleted after this doc was
written — see `00-overview.md`) against `cms/taxonomy/`.

## File layout — matches

`types.ts`, `TaxonomyService.ts`, `index.ts`,
`internal/filter-by-term.ts`, `internal/resolve-cross-locale-alternates.ts`
— all present, same names as planned.

## Public API — matches exactly, plus one extra accessor

Every method in the plan's `TaxonomyService` interface is present with
the same signature: `getTerms`, `getTerm`, `getTermAlternates`,
`getTaxonomiesForCollection`, `getFieldName`, `resolveUrlSegment`,
`getItemsByTerm`, `getRelatedEntries`, `getArchivePath`, `filterBySlug`.

One method beyond the plan's list: `getUrlSegment({ collectionName,
taxonomyName, lang? })`, returning the raw per-locale URL segment string
(e.g. `"category"`/`"danh-muc"`) for one locale. Not in the plan's public
API — needed by `LocaleAlternatesService` to rebuild a taxonomy archive
path for *every* locale in a loop (`getArchivePath` only ever returns one
locale's path at a time, using its own internal default-locale
resolution; the alternates resolver needs the per-locale segment
directly). Small, same-shape addition, not a new concept.

## Constructor — same drift as Collection

Plan: `options: { defaultLocale: Locale }`.
Built: `options: { defaultLocale: TLocale; locales: readonly TLocale[] }`
— needed for the same reason as `CollectionService` (`getTermAlternates`
loops over every locale). See `00-overview.md`.

## Dependency injection — matches

Constructor's `deps` parameter takes exactly the three bound
`CollectionService` methods the plan specifies:
`getCollectionPath`, `getCollectionItems`, `getRelatedEntries`. No wider
`CollectionService` surface leaks in. `lib/cms.ts`'s instantiation order
(`CMSCollection` built first, then `CMSTaxonomy` fed its bound methods)
matches the plan's `lib/cms.ts` example exactly.

## Registry shape — matches

`TaxonomyRegistryEntry<TCollectionName, TLocale>` — `fetchTerms` +
`attachments: Partial<Record<TCollectionName, { fieldName, urlSegment }>>`
— matches the plan's N:M shape verbatim. The actual registered content
(`categories` → `blog`, `productCategories` → `products`, one attachment
each) matches the plan's stated scope: "This repo's actual content only
attaches `categories` to `blog` and `productCategories` to `products`
today" — no third taxonomy or shared cross-collection taxonomy exists yet,
as expected.
