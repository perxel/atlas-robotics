# Beyond the plan — domains built with no `.claude/plans/*.md` file

Three `cms/` domains exist in the tree with no corresponding `00`–`07`
plan file. All three were referenced only as loose ends inside other
plan files, never designed. Documented here since the per-plan docs
(`01-collection.md` … `07-slug.md`) each cross-check one specific plan
file and none of them owns these.

## `cms/pages/` (`PagesService`)

**What it does:** the generic `pages`-collection concern — resolve a
document by slug (`getBySlug`), two flavors of cross-locale alternates
(`getAlternates` for a page's own translated `slug`, `getListingAlternates`
for a collection's listing page whose real URL is owned by the collection
registry, not this document's `slug` field), and `getSeoIndex()` for the
SEO dashboard.

**Where the plan almost got here:** `01-collection.md`'s Addendum #4
flags, unresolved: *"`pages` isn't currently in `CollectionService`'s
example registry... since `pages` also carries `seoField()`, it needs
registering there too... Flagging, not resolved yet — comes up again once
we get to the `pages`/routing domain."* That routing domain's plan file
was never written. What got built instead of "register `pages` into
`CollectionService`" is a structurally different answer: `pages` doesn't
fit `CollectionRegistryEntry`'s shape at all (`locales: Record<Locale,
string>` assumes one fixed per-locale URL prefix per collection — true
for `blog`/`products`, false for `pages`, where each *document* has its
own `slug` and the collection resolves at locale-root). So rather than
forcing a square peg into `CollectionService`'s registry, `pages` got a
sibling service with an equivalent-but-separate `getSeoIndex()`, unioned
at the `lib/dashboards.ts` call site (`SeoCollectionKey = CollectionKey |
"pages"`). Reasonable resolution of the plan's open question, in spirit —
just never written down as its own decision anywhere.

**Dependency shape:** Option A injection, same pattern as
`TaxonomyService` → `CollectionService` — `PagesInjected<TLocale>` takes
bound `localePath` and `getCollectionPath`, never a whole service
instance.

## `cms/locale-alternates/` (`LocaleAlternatesService`)

**What it does:** the single "what's this page's equivalent URL in every
other locale" resolver — used by both hreflang/canonical generation and
the language switcher. Branches on four route shapes (taxonomy archive,
collection listing page, collection detail page, plain `pages` document),
each resolved with a different injected capability.

**Where the plan almost got here:** every plan file that touches
alternates resolution (`01-collection.md`'s `getCollectionAlternates`,
`02-taxonomy.md`'s `getTermAlternates`, `04-seo.md`'s explicit note that
`SeoService.buildAlternates` takes a pre-resolved `alternates` map rather
than resolving it itself, "since that dispatch logic already has one
home") all point at a resolver that has "one home" — but no plan file
ever designs that home as its own class. `04-seo.md` even names it in
passing ("today's `resolveLocaleAlternates`") as if describing existing
pre-refactor code, not scoping new work. What got built formalizes
exactly the four-case dispatch CLAUDE.md's own "Collection-backed listing
pages" section already documented pre-refactor, now as a proper Option-A
class (`LocaleAlternatesDeps` bundles ten bound functions from
`CollectionService`, `TaxonomyService`, `MultilingualService`, and
`PagesService`) instead of a hand-written function in `lib/`.

**Consumers:** `lib/cms.ts`'s `resolveLocaleAlternates()` wraps
`CMSLocaleAlternates.resolve()` — used by `buildAlternates` (`lib/seo.ts`'s
successor, folded into `CMSSeo`) for hreflang/canonical, and by
`Header.tsx` for the language switcher's per-locale URL map. Same two
consumers the plan described for the pre-refactor version, just now
backed by a real class.

## `cms/singleton/` (`SingletonService`)

**What it does:** generic "named singleton document" fetcher — one file
per locale, no list, no slug — for `siteSettings`/`nav`/`footer`. A
project registers another singleton by adding a registry row, not by
writing a new `get*()` function.

**Where the plan explicitly said the opposite:** `01-collection.md`'s
closing paragraph is unambiguous: *"`getSiteSettings`/`getNav`/`getFooter`
and `getPageBlockData` aren't collection-shaped (singleton docs /
block-typename dispatch) and stay as plain functions in
`lib/tina-content.ts`, untouched."* This is the one place actual
implementation contradicts a plan file's stated decision rather than
just extending an unresolved question. What got built generalizes those
three plain functions into `SingletonService.get<T>({ name, lang? })`,
registered via a `singletonRegistry` in `lib/cms.ts` exactly the same
shape as `collectionRegistry`/`taxonomyRegistry` — consistent with the
refactor's overall direction (every "one file a future project edits to
register new stuff" domain became a class + registry), just not what that
specific paragraph said would happen. `getPageBlockData` did stay a plain
function in `lib/cms.ts`, as planned — only the singleton-doc half of
that sentence didn't hold.

**Public API:** one method, `get<T>({ name, lang? })`, returning `null`
on any failure rather than throwing — same tolerant-fallback behavior the
plan described for the pre-refactor versions of `getSiteSettings` etc.
