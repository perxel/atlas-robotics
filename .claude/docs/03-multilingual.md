# Multilingual — plan vs. built

Cross-check of `.claude/plans/03-multilingual.md` (deleted after this doc
was written — see `00-overview.md`) against `cms/multilingual/`.

## File layout — matches, plus one extra file

Plan lists: `types.ts`, `MultilingualService.ts`, `DictionaryService.ts`,
`fields.ts`, `internal/resolve-switcher-entries.ts`,
`dashboard/TranslationDashboardService.ts`,
`dashboard/createTranslationDashboardScreen.tsx` — all present as
planned.

➕ `translate-text.ts` — not in the plan's file list. Pulls the
`dictionary[sourceText] ?? sourceText` lookup out of `DictionaryService`
into its own exported function, `translateText(dictionary, sourceText)`.
Its own doc comment explains why: a resolved `Record<string,string>` map
can cross a Server → Client Component prop boundary, a bound closure
can't (functions aren't serializable) — components rendering inside a
client-rendered subtree (visual editing's `useTina()` boundary) need to
call the plain function directly against a map passed as a prop, not
`DictionaryService.load()`'s closure. Real constraint the plan didn't
anticipate, not scope creep.

## `MultilingualService` — matches exactly

Every method the plan lists is present with matching signatures:
`isLocale`, `pathnameHasLocalePrefix`, `stripLocalePrefix`, `localePath`,
`isEnabled`, `getAllLocales`, `getEnabledLocales`, `isLocaleEnabled`,
`resolveSwitcherEntries`. Constructor shape matches
(`locales`/`defaultLocale`/`enabledLocales?`/`enabled?`), including the
`enabled` default of `enabledLocales.length > 1`.

**"Disable a locale" behavior** — matches the plan's spec point for
point: `middleware.ts` checks `CMSMultilingual.isLocaleEnabled(locale)`
and redirects to `/` before further route matching, exactly as described.

## `DictionaryService` — matches, plus one extra method

Plan lists `load(lang?)` and `translate(sourceText, lang?)`. Both are
present with matching signatures. ➕ `loadMap(lang?):
Promise<Record<string,string>>` is not in the plan's interface — it
returns the raw resolved map instead of a closure, for the exact
Server→Client boundary reason `translate-text.ts` exists (see above).
`lib/cms.ts`'s `getPageBlockData` calls `CMSDictionary.loadMap(locale)`
to build the `uiDictionary` prop threaded into block components. `load()`
itself is implemented as `loadMap()` + wrapping the result in
`translateText`, so the two extra pieces (`loadMap`, `translateText`) are
really one refactor: the plan's single closure-returning method got
decomposed into reusable parts once the client-boundary need showed up.

## Tina fields — matches

`dictionaryEntriesField(locales, defaultLocale)` and
`switcherConfigField(locales)` both exist in `fields.ts`, both composable
(not whole-collection factories), matching the plan. One shape note: the
plan's sketch showed `dictionaryEntriesField()` taking no arguments; the
built version takes `(locales, defaultLocale)` — necessary, since the
plan's own text says the field must "generate dynamically from the
`locales` array passed in," the top-level sketch just omitted the
parameters. Not a real deviation.

`tina/collections/multilingual.schema.tsx` assembles both fields into one
global, non-localized collection exactly as the plan's example shows,
including `allowedActions: { create: false, delete: false }` (a sensible
addition the plan's own sketch didn't show, consistent with "there's only
ever one" reasoning already in the plan's prose).
`site-settings.schema.tsx` no longer has a `languageSwitcher` field, as
planned.

## Translation Dashboard — matches

`TranslationDashboardService.getStats()` computes coverage exactly as
specified: % of defaultLocale's filenames that also have a same-filename
document in each locale. `createTranslationDashboardScreen` builds the
same hand-rolled `ScreenPlugin` object shape the plan anticipated — its
own comment explains why `createScreen` isn't imported from `tinacms`
directly (not part of the package's public export map, verified against
`package.json`), which the plan didn't get into but is a faithful
continuation of the plan's "wraps `createScreen({...})`" intent.

## `lib/cms.ts` / `lib/dashboards.ts` split — one drift

The plan's `lib/cms.ts` additions section shows
`translationDashboardScreen` instantiated inline in `lib/cms.ts`. Built:
it's instantiated in a separate file, `lib/dashboards.ts`, alongside
`seoDashboardScreen`. Reason (stated in that file's own comment,
consistent with `00-overview.md`'s cross-domain note): keeping dashboard
screens out of `lib/cms.ts` avoids pulling admin-only JSX into any bundle
that imports from `lib/cms.ts` for non-admin reasons. Functionally
identical to the plan's version — same instantiation, same
`CMSMultilingual.isEnabled()` gate — just in a different file.
