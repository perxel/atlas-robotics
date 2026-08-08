# Pagination — plan vs. built

Cross-check of `.claude/plans/05-pagination.md` (deleted after this doc
was written — see `00-overview.md`) against `cms/pagination/`.

## File-for-file match

Every file the plan lists exists with the exact planned name and job:
`types.ts` (`PageWindowItem`), `constants.ts` (`DEFAULT_PAGE_SIZE`),
`paginate-items.ts`, `parse-page-param.ts`, `canonical-page-href.ts`,
`redirect-if-page-mismatch.ts`, `build-page-window.ts`, `index.ts`.

This is the closest 1:1 match of any domain in this refactor — the
plan's own framing ("the smallest domain — most of the real work already
got folded into `CollectionService`/`TaxonomyService` earlier") held up
exactly: nothing extra was needed, nothing planned was skipped.

## Public surface — matches

The barrel (`cms/pagination/index.ts`) re-exports exactly the plan's
list: `PageWindowItem`, `Paginated`, `DEFAULT_PAGE_SIZE`, `paginateItems`,
`parsePageParam`, `canonicalPageHref`, `redirectIfPageMismatch`,
`buildPageWindow`. No class — stayed plain functions as decided.

## Consumption — matches

`CollectionService` imports `paginateItems`/`DEFAULT_PAGE_SIZE` directly
(a plain import, not injected — see `01-collection.md`'s Addendum #3
cross-check), and `TaxonomyService.getItemsByTerm` never has its own
copy, delegating entirely through the injected `getCollectionItems` —
both exactly as the plan specified. `paginate-items.ts`'s `Paginated<T>`
type is re-exported through `cms/collection/types.ts` and
`cms/taxonomy/types.ts` rather than redefined, matching the plan's "reused
from collection/types.ts" note for Taxonomy.
