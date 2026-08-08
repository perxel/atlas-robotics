# Domain: Pagination

See [`00-overview.md`](./00-overview.md) for cross-domain rules this file
assumes. Consumed internally by [`01-collection.md`](./01-collection.md)
(Addendum #3).

The smallest domain — most of the real work already got folded into
`CollectionService`/`TaxonomyService` earlier. What's left is stateless
URL-shape and slicing math with no registry/config to inject, so this stays
**plain functions**, not a class — no `CMSPagination` instance needed
anywhere.

## `cms/pagination/` (generic, reusable, no project data)

```
cms/pagination/
  types.ts                    # PageWindowItem = number | "ellipsis" — a
                               # semantic marker, not the "…" glyph itself;
                               # rendering that as "…" vs "..." vs an icon
                               # stays a components/ presentation choice
  constants.ts                  # DEFAULT_PAGE_SIZE — single source of truth
                                 # for "how many items per page by default,"
                                 # imported by CollectionService/TaxonomyService
                                 # as their pageSize fallback
  paginate-items.ts               # paginateItems<T>(items, page, pageSize):
                                   # Paginated<T> — the actual slicing math;
                                   # imported internally by Collection (see its
                                   # Addendum #3), also exported publicly for
                                   # any other ad-hoc paginated list
  parse-page-param.ts               # parsePageParam(value): number | null —
                                     # validates a `/page/[pageNum]` route
                                     # param (positive integer, no leading zero)
  canonical-page-href.ts              # canonicalPageHref(basePath, page): string
                                       # — basePath for page 1, basePath/page/N otherwise
  redirect-if-page-mismatch.ts          # redirectIfPageMismatch(requestedPage,
                                         # currentPage, basePath): void — calls
                                         # Next.js's redirect() (fine to import
                                         # next/navigation here: this whole
                                         # boilerplate targets Next.js, the
                                         # "no project data" rule is about
                                         # locale/collection/taxonomy specifics,
                                         # not the framework itself)
  build-page-window.ts                    # buildPageWindow(currentPage, totalPages):
                                           # PageWindowItem[] — extracted from
                                           # components/Pagination.tsx's current
                                           # private pageWindow() helper
  index.ts                                  # barrel re-exporting all of the above —
                                             # plain-function domains lose the
                                             # "type CMSFoo. and see everything"
                                             # discoverability a class gives for
                                             # free, so the barrel is what
                                             # restores "import from one place
                                             # and see the whole domain" here
```

## Call sites (unchanged behavior, just a new import path)

```ts
import { canonicalPageHref, buildPageWindow, parsePageParam, redirectIfPageMismatch }
  from "@/cms/pagination";

// components/Pagination.tsx — stays in components/ (design-specific, per the
// Multilingual/Breadcrumb precedent), now calls buildPageWindow() instead of
// its own private pageWindow()
const hrefFor = (page: number) => canonicalPageHref(basePath, page);
buildPageWindow(currentPage, totalPages).map((item) =>
  item === "ellipsis" ? <span key="…">…</span> : <Link key={item} href={hrefFor(item)}>{item}</Link>
);
```

`getCollectionItems`/`getItemsByTerm` already return `{ items, currentPage,
totalPages }` directly — nothing from this domain needs calling to fetch a
page of data, only to build the page-number UI and validate/redirect the
`/page/N` route param around it.
