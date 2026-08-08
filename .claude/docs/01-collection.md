# Collection — plan vs. built

Cross-check of `.claude/plans/01-collection.md` (deleted after this doc
was written — see `00-overview.md`) against `cms/collection/`.

## File layout — matches

Every file the plan lists exists, same names, same job:
`types.ts`, `CollectionService.ts`, `draft.field.ts`, `index.ts`,
`internal/in-locale.ts`, `internal/sort-items.ts`,
`internal/resolve-by-slug.ts`, `internal/resolve-cross-locale-alternates.ts`,
`internal/get-related-entries.ts`, `internal/collection-path.ts`,
`internal/collection-for-segment.ts`,
`internal/translate-collection-path.ts`,
`internal/resolve-pages-document-url.ts`.

## Public API — matches, plus two methods the plan didn't list

| Plan method | Built | Notes |
|---|---|---|
| `getCollectionItems` | ✅ | Signature matches exactly, including Addendum #2's `includeDrafts` |
| `getCollectionItem` | ✅ | Matches; also swallows any fetch error into `null` (plan only said "not found") |
| `getRelatedEntries` | ✅ | Matches |
| `getCollectionAlternates` | ✅ | Matches |
| `getCollectionPath` | ✅ | Matches |
| `getCollectionForSegment` | ✅ | Matches |
| `translateCollectionPath` | ✅ | Matches |
| `resolvePagesDocumentUrl` | ✅ | Matches |
| `getItemLocaleIndex` (Addendum #1) | ✅ | Matches |
| `getSeoIndex` (Addendum #4) | ✅ | Matches, with a fallback the plan didn't spell out (see below) |
| — | ➕ `getRegisteredCollectionNames()` | Not in the plan's method list at all — needed once dashboards had to enumerate every registered collection generically (`lib/dashboards.ts`) |
| — | ➕ `getListingPageFilename()` | Not in the plan's method list — needed by `lib/cms.ts`'s `lockedSlugFilenames` derivation and by `LocaleAlternatesService` |

Both extra methods are small, already-private-data accessors (the
registry entries the class already holds) — they didn't require new
concepts, just weren't anticipated as *public* API surface when the plan
was written.

## Constructor — one drift

Plan: `constructor(registry, options: { defaultLocale: Locale })`.
Built: `constructor(registry, options: { defaultLocale: TLocale; locales: readonly TLocale[] })`.

`getCollectionAlternates` needs to loop over every locale to build a
cross-locale map, and the plan's own Addendum text for that method
implies the same, but the constructor signature at the top of the file
was never updated to reflect it. See `00-overview.md` — same drift
repeats in Taxonomy, Seo, LocaleAlternates, Pages.

## Addendum #2 (Drafts) — matches exactly

`draftFieldName?` on the registry entry, `includeDrafts` default-`false`
on `getCollectionItems`, dashboard methods always seeing drafts — all
implemented exactly as specified. `draftField()` lives at
`cms/collection/draft.field.ts` as planned.

## Addendum #3 (Pagination hookup) — matches

`CollectionService` imports `paginateItems`/`DEFAULT_PAGE_SIZE` directly
from `@/cms/pagination` (a plain import, not injected) — matches the
plan's reasoning exactly. `TaxonomyService.getItemsByTerm` has no
pagination logic of its own; it delegates through the injected
`getCollectionItems`, also as planned.

## Addendum #4 (SEO hookup) — matches, with the flagged question resolved differently than expected

The plan added `fetchSeoIndex?` to the registry as an optional capability
and flagged, unresolved: *"`pages` isn't currently in
`CollectionService`'s example registry... comes up again once we get to
the `pages`/routing domain."*

What actually happened: `pages` was never added to
`CollectionService`'s registry at all. Instead it got its own sibling
service, `PagesService` (`cms/pages/`), with its own `getSeoIndex()`
method — same return shape as `CollectionService.getSeoIndex()`, but
implemented separately because `pages` documents don't fit the
`locales: Record<Locale, string>` / `listingPageFilename` registry shape
(a `pages` document's URL is its own `slug` field, not a fixed
per-collection prefix). `lib/dashboards.ts` then unions both sources at
the call site (`SeoCollectionKey = CollectionKey | "pages"`, dispatching
to `CMSPages.getSeoIndex()` vs. `CMSCollection.getSeoIndex()`). This is a
reasonable resolution of the plan's open question, just not the one the
plan's own wording implied ("needs registering there too") — see
`08-beyond-the-plan.md` for the full `PagesService` writeup.

`getSeoIndex()`'s fallback behavior is also slightly more filled-in than
the plan specified: the plan's registry shape shows `fetchSeoIndex` as
the only path; the built version falls back to reading `.seo`/`.slug` off
the *existing* `fetchEdges()` results when `fetchSeoIndex` isn't
registered, so a collection doesn't need a second query function just to
appear in the SEO dashboard. In this repo, neither `blog` nor `products`
actually registers `fetchSeoIndex` — both rely on the fallback.
