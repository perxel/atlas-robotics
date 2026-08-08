# Overview — plan vs. built

Cross-check of `.claude/plans/00-overview.md` (the original plan for this
refactor, since deleted — see below)
against the `cms/`/`lib/` tree as it exists now. One doc per plan file in
this folder (`01-collection.md` … `07-slug.md`); this file covers the
cross-domain rules and the domain index table. See
[`08-beyond-the-plan.md`](./08-beyond-the-plan.md) for three domains that
exist in code but were never planned in any `00`–`07` file.

## Guiding rules — followed

- **`cms/` never imports `tina/__generated__/*`, never hardcodes
  locales/collections/taxonomies/strings, no JSX except dashboard
  screens.** Held. Every `cms/*/index.ts` barrel is generated-client-free;
  `grep -r "__generated__" cms/` returns nothing. The two JSX files are
  exactly the planned exception: `cms/multilingual/dashboard/
  createTranslationDashboardScreen.tsx` and `cms/seo/dashboard/
  createSeoDashboardScreen.tsx`.
- **One class per domain, public methods only, `internal/` for helpers.**
  Held for Collection, Taxonomy, Multilingual, Seo. Pagination and
  Tina Lifecycle Hooks stayed plain functions as planned (no class).
- **Registration lives in `lib/`, instantiation only, never in `cms/`.**
  Held, but the plan assumed one file (`lib/cms.ts`) would hold
  *everything*, including admin dashboard screens. In practice
  `lib/dashboards.ts` was split out for that (see `04-seo.md` cross-check)
  and `lib/locale.ts` was split out for locale registration specifically —
  not silent drift, both driven by one constraint: `middleware.ts` runs as
  an edge Worker with a hard bundle-size limit (Cloudflare), and
  `lib/cms.ts` transitively pulls in the generated Tina GraphQL client
  plus admin-only JSX. A named import only prevents *using* the rest of a
  module's exports, not a bundler including its other top-level
  side-effecting code (a `new Xyz(...)` a bundler can't prove
  side-effect-free is kept). `lib/locale.ts` also imports
  `MultilingualService` from its own file rather than the
  `@/cms/multilingual` barrel — confirmed live with an esbuild
  tree-shaken bundle of `middleware.ts` that importing through the barrel
  pulls in React and the barrel's other re-export
  (`createTranslationDashboardScreen.tsx`) anyway, even with nothing here
  referencing it: a barrel is one module, and a bundler won't drop a
  sibling re-export just because the importing file's own list doesn't
  name it.
- **Collection name arguments are typed unions derived from the registry,
  not `string`.** Held — `CollectionKey`/`TaxonomyKey` in `lib/cms.ts` are
  `keyof typeof collectionRegistry` / `keyof typeof taxonomyRegistry`.
- **Every `lang` optional, falling back to `defaultLocale`; exceptions for
  "translate to the other locale" methods.** Held throughout
  `CollectionService`/`TaxonomyService`/`SingletonService`/`PagesService`.
- **Option A dependency injection, one direction only.** Held — verified
  in every constructor: `TaxonomyService` takes bound `CollectionService`
  methods, `LocaleAlternatesService` takes bound methods from four
  services, dashboards take bound methods from `CollectionService`/
  `PagesService`. No domain imports another domain's class directly.

## One constructor-shape drift, applied consistently

The plan's `CollectionService`/`TaxonomyService` constructors only take
`{ defaultLocale }` in `options`. The actual constructors take
`{ defaultLocale, locales }` — both classes need the full locale list to
loop over when building a cross-locale alternates map
(`getCollectionAlternates`/`getTermAlternates`), which the plan didn't
surface as a dependency until it started describing what those methods
actually do. Not a violation of the "Option A" rule (locales is plain
config, not another domain's behavior) — just a constructor signature the
plan under-specified. Same shape was then carried consistently into
`SeoService`, `LocaleAlternatesService`, and `PagesService`.

## Domain index — reality

| Plan file | Planned shape | Built as | Status |
|---|---|---|---|
| `01-collection.md` | Class `CollectionService` | `cms/collection/CollectionService.ts` | Matches, +2 extra public methods (see that doc) |
| `02-taxonomy.md` | Class `TaxonomyService` | `cms/taxonomy/TaxonomyService.ts` | Matches near-exactly |
| `03-multilingual.md` | Class + Dictionary + Dashboard | `cms/multilingual/*` | Matches, +1 extra public method (`loadMap`) |
| `04-seo.md` | Class + Dashboard + Breadcrumb | `cms/seo/*` | Matches, +2 extra files (`site-url.ts`, `require-in-production.ts`) not in the plan's file list |
| `05-pagination.md` | Plain functions | `cms/pagination/*` | Matches exactly, file-for-file |
| `06-tina-lifecycle-hooks.md` | Plain functions | `cms/tina-hooks/*` | Matches exactly |
| `07-slug.md` | Field factory + hook | `cms/slug/*` | Matches exactly |
| *(none)* | — | `cms/pages/PagesService.ts` | **Not planned** — see `08-beyond-the-plan.md` |
| *(none)* | — | `cms/locale-alternates/LocaleAlternatesService.ts` | **Not planned** — see `08-beyond-the-plan.md` |
| *(none)* | — | `cms/singleton/SingletonService.ts` | **Not planned**, and contradicts `01-collection.md`'s explicit call that singleton docs "stay as plain functions" — see `08-beyond-the-plan.md` |

## Consolidation beyond what any plan file describes

Every plan file assumes `lib/tina-content.ts` keeps existing for whatever
doesn't move into a `cms/` class (`getSiteSettings`/`getNav`/`getFooter`/
`getPageBlockData`, per `01-collection.md`'s closing paragraph). It's
gone. So are `lib/i18n.ts`, `lib/seo.ts`, `lib/dictionary.ts`,
`lib/pages-config.ts`, `lib/collection-slugs.ts`. `lib/` today is exactly
three files: `cms.ts`, `dashboards.ts`, `locale.ts`. The registration
model the plan designed was followed more thoroughly than the plan itself
committed to.

## One stale reference elsewhere in the repo

`app/[locale]/blog/page.tsx` has a comment pointing at
`lib/pages-config.ts` for `lockedSlugFilenames` — that file no longer
exists; the export lives in `lib/cms.ts` now (see `01-collection.md`
cross-check). Not a `cms/` framework issue, just a comment that wasn't
updated when `lib/pages-config.ts` was folded in. Also worth noting:
CLAUDE.md's boilerplate guide still documents `defaultLocale: Locale =
"vi"` as the example default and describes `seoField()`/`draftField()`/
`slugField()`/taxonomy helpers as living under
`tina/collections/shared-fields/`; in the actual repo `defaultLocale` is
`"en"` (`lib/locale.ts`) and only `taxonomy.schema.tsx` remains in
`shared-fields/` — the other three field factories moved into
`cms/collection/`, `cms/seo/`, `cms/slug/` respectively as part of this
refactor. Neither blocks anything; both are documentation drift worth a
follow-up pass on CLAUDE.md itself, outside this refactor's scope.
