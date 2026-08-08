# Domain: Multilingual

See [`00-overview.md`](./00-overview.md) for cross-domain rules this file
assumes. The Translation Dashboard depends on
[`01-collection.md`](./01-collection.md) (Option A injection).

Three pieces: (1) the locale/routing/switcher logic, folded into a class the
same way Collection/Taxonomy were, plus enable/disable-per-locale support;
(2) a CMS-editable dictionary + a WordPress-style `__()` lookup, replacing
`lib/dictionary.ts`'s code-file strings; (3) a Tina admin **Translation
Dashboard** screen showing per-locale content counts and translation
coverage, modeled directly on Tina's own built-in
`MediaUsageDashboardScreenPlugin`.

## `cms/multilingual/` (generic, reusable, no project data)

```
cms/multilingual/
  types.ts                       # SwitcherEntry<TLocale>, DictionaryEntry,
                                  # CollectionCoverage<TCollectionName, TLocale>
  MultilingualService.ts          # locale routing + enable/disable + switcher data
  DictionaryService.ts             # __() lookup
  fields.ts                         # dictionaryEntriesField() and
                                     # switcherConfigField(locales) — two
                                     # composable Tina field factories (same
                                     # pattern as seoField()/draftField()), NOT
                                     # a whole-collection factory — a project
                                     # file assembles them into one collection,
                                     # same as any other shared-field helper
  internal/
    resolve-switcher-entries.ts        # merge CMS config overrides with locale
                                        # defaults, de-dupe, filter to available
  dashboard/
    TranslationDashboardService.ts       # per-collection, per-locale stats
    createTranslationDashboardScreen.tsx   # the one JSX exception — Tina
                                            # ScreenPlugin (admin-only UI)
```

## `MultilingualService` public API

```ts
class MultilingualService<TLocale extends string> {
  constructor(config: {
    locales: readonly TLocale[];          // every locale that HAS content
    defaultLocale: TLocale;
    enabledLocales?: readonly TLocale[];    // publicly visible subset; defaults
                                             // to `locales` (all enabled)
    enabled?: boolean;                        // whole feature on/off; defaults
                                               // to enabledLocales.length > 1
  })

  // routing (ported from today's lib/i18n.ts, unchanged behavior)
  isLocale(value: string): value is TLocale
  pathnameHasLocalePrefix(pathname: string): boolean
  stripLocalePrefix(pathname: string): string
  localePath(lang: TLocale, pathWithoutLocale: string): string

  // enable/disable — every public-facing surface (sitemap, hreflang,
  // switcher, dashboard visibility) reads these instead of `locales` directly
  isEnabled(): boolean
  getAllLocales(): readonly TLocale[]        // registered, enabled or not
  getEnabledLocales(): readonly TLocale[]     // publicly visible only
  isLocaleEnabled(lang: TLocale): boolean

  // switcher data — pure, no JSX (LanguageSwitcher.tsx stays in components/,
  // calls this for the merge/de-dupe/filter logic, renders the <Link>s itself)
  resolveSwitcherEntries(args: {
    currentLocale: TLocale;
    urls: Partial<Record<TLocale, string>>;
    labels?: Record<TLocale, string>;
    config?: Array<{ locale?: string | null; label?: string | null; flag?: string | null } | null> | null;
  }): SwitcherEntry<TLocale>[]
}
```

**What "disable a locale" actually means:** disabling `zh` never touches its
content — every `content/<collection>/zh/*` document stays exactly as-is and
is still directly editable in Tina. Disabling only removes it from
*discovery* surfaces: `app/sitemap.ts` calls `getEnabledLocales()` instead of
iterating `locales`; hreflang generation (`resolveLocaleAlternates` /
`buildAlternates` in the SEO domain) skips disabled locales when building the
alternates map; `LanguageSwitcher` never shows a disabled locale (its `urls`
map is built from `getEnabledLocales()`); the Translation Dashboard screen
itself doesn't register at all when `isEnabled()` is `false`. **Decided:** a
disabled locale's URL redirects to the (default-locale) home page rather than
404ing or staying reachable — same "no dangling/dead URL" principle
`middleware.ts` already applies to the unprefixed-vs-prefixed default-locale
routing today. Implemented in `middleware.ts`: after resolving the requested
locale, check `CMSMultilingual.isLocaleEnabled(locale)` and redirect to `/`
if it's `false`, before any further route matching happens.

## Dictionary + `__()`

Replaces `lib/dictionary.ts`'s hardcoded per-locale TS objects with one
CMS-editable collection, and a WordPress-style lookup: the call **is** the
source text (`__("Read more")`), not an abstract key (`t("common.readMore")`)
— untranslated strings just render as their English source, same as
WordPress. No i18n key-naming discipline needed, and every string works the
moment it's written in code, translation optional after the fact.

```ts
type DictionaryEntry = { key: string; values: Partial<Record<Locale, string>> };

class DictionaryService<TLocale extends string> {
  constructor(
    deps: { fetchEntries: () => Promise<DictionaryEntry[]> },
    options: { defaultLocale: TLocale }
  )

  // One fetch per request — wrap the call site in React's cache() (same
  // pattern getPageQuery etc. already use) so multiple components in one
  // render share it. Returns a SYNCHRONOUS lookup function: await once at
  // the top of a page, then call __() freely and inline through JSX below
  // it, same ergonomics as today's `const dict = getDictionary(locale)`.
  load(lang?: TLocale): Promise<(sourceText: string) => string>

  // one-shot convenience for a single lookup (still async, still a full fetch)
  translate(sourceText: string, lang?: TLocale): Promise<string>
}
```

```ts
// call site, e.g. inside a page or layout component
const __ = await CMSDictionary.load(locale);
// ...
<button>{__("Read more")}</button>
```

**Tina schema side, consolidated with the language switcher.** The
`languageSwitcher` field (display order / label overrides / flag per locale)
currently lives on `site-settings` — moving out of there and into this same
new collection, so there's one page in the admin for "everything about how
multiple languages behave," not switcher config on one page and translation
strings on another. `tina/collections/site-settings.schema.tsx` loses its
`languageSwitcher` field entirely.

`cms/multilingual/fields.ts` exports two composable field factories (not a
whole-collection factory — same pattern as `seoField()`/`draftField()`,
which are fields a project's schema file mixes in, not collections in their
own right):

```
dictionaryEntriesField(): TinaField
  entries: list of {
    key:    string, required   — the source text, e.g. "Read more"
    values: one optional string field PER LOCALE, generated dynamically from
            the `locales` array passed in — e.g. { vi: string?, zh: string? }.
            defaultLocale is intentionally omitted from `values`: the `key`
            itself already IS the default-locale text, nothing to duplicate.
  }

switcherConfigField(locales): TinaField
  switcher: list of { locale: string, label: string?, flag: image? }
  — same shape as today's site-settings `languageSwitcher` field, just
  relocated and now built by a generic factory instead of hand-written
  inline on that collection
```

A new project file, `tina/collections/multilingual.schema.tsx`, assembles
both into one global (`ui.global: true`), non-localized collection —
registered in `tina/config.ts`'s `collections` array like any other:

```ts
export const multilingualCollection: Collection = {
  name: "multilingual",
  label: "Multilingual",
  ui: { global: true },
  fields: [switcherConfigField(locales), dictionaryEntriesField()],
};
```

One admin page, two sections: switcher display settings on top, the
translation table below. `Header.tsx` (or wherever switcher config is read)
now queries this `multilingual` document instead of `getSiteSettings()`.

Honest caveat: Tina doesn't have a literal spreadsheet-grid field type —
`tinaTableTemplate` (checked in `node_modules/tinacms/dist/table.d.ts`) is
for embedding a markdown table *inside rich text*, not a data-grid UI. The
closest real UI is a `list` field of `{ key, values }` objects with
`itemProps` set so each row's collapsed label shows the key — same
repeatable-list pattern this schema already uses for `socialLinks`/footer
`columns`. It reads and edits like a table (one row per string, one column
per locale) even though it isn't a literal HTML grid.

## Translation Dashboard (Tina admin Screen)

Answers "this collection has 10 in en, 12 in vi, 4 in zh, % coverage" —
modeled directly on Tina's own built-in dashboard
(`node_modules/tinacms/dist/toolkit/plugin-screens/media-usage-dashboard-screen.d.ts`
+ `.../components/dashboard/media-usage-dashboard/`): a `ScreenPlugin`
(`createScreen({ name, Component, Icon, layout: "fullscreen", navCategory: "Dashboard" })`)
registered via `tina/config.ts`'s `cmsCallback`, the exact mechanism Tina
uses for `MediaUsageDashboardScreenPlugin`. Same shape as their
`useMediaUsageScanner` hook (async scan → `{ items, isLoading, refresh }`) →
`MediaUsageTable` component: here, `TranslationDashboardService.getStats()`
→ a table component with one row per collection, one column per enabled
locale, plus a coverage %.

```ts
type CollectionCoverage<TCollectionName extends string, TLocale extends string> = {
  collectionName: TCollectionName;
  countsByLocale: Record<TLocale, number>;
  coveragePercentByLocale: Record<TLocale, number>;
  // % of defaultLocale's filenames that also have a same-filename document
  // in this locale — matches how cross-locale pairing already works
  // everywhere else in this app (CLAUDE.md: "Cross-locale linking is by
  // filename"), so coverage means "actually translated," not just "this
  // locale happens to have N documents that may not correspond to anything"
};

class TranslationDashboardService<TCollectionName extends string, TLocale extends string> {
  constructor(
    deps: {
      getRegisteredCollectionNames: () => TCollectionName[];
      getItemLocaleIndex: (collectionName: TCollectionName) => Promise<{ filename: string; locale: TLocale }[]>;
      // ^ both injected from CMSCollection, same Option-A pattern as Taxonomy
    },
    options: { locales: readonly TLocale[]; defaultLocale: TLocale }
  )

  getStats(): Promise<CollectionCoverage<TCollectionName, TLocale>[]>
}

function createTranslationDashboardScreen(
  dashboard: TranslationDashboardService<any, any>
): ScreenPlugin
// wraps createScreen({...}) from "tinacms" — the one cms/ file allowed to
// import React/JSX, per the guiding-rules exception
```

## `lib/cms.ts` additions

```ts
export const CMSMultilingual = new MultilingualService({
  locales,               // from lib/i18n.ts
  defaultLocale,
  enabledLocales: ["en", "vi"],   // "zh" could be registered but not yet enabled
});

export const CMSDictionary = new DictionaryService(
  { fetchEntries: () => client.queries.multilingual({ relativePath: "index.json" })
      .then(r => r.data.multilingual.entries ?? []) },
  { defaultLocale }
);

// switcher config lives in the same document — a plain project-level fetch
// (lib/tina-content.ts, same shape as getSiteSettings), not a CMS* service
// method, since it's a one-off read passed straight into
// CMSMultilingual.resolveSwitcherEntries()'s `config` argument at the call site
export const getMultilingualSettings = () =>
  client.queries.multilingual({ relativePath: "index.json" }).then(r => r.data.multilingual);

// only exists — and only gets registered in tina/config.ts's cmsCallback —
// when multilingual is actually on
export const translationDashboardScreen = CMSMultilingual.isEnabled()
  ? createTranslationDashboardScreen(new TranslationDashboardService(
      {
        getRegisteredCollectionNames: () => ["blog", "products"],
        getItemLocaleIndex: CMSCollection.getItemLocaleIndex.bind(CMSCollection),
      },
      { locales: CMSMultilingual.getEnabledLocales(), defaultLocale }
    ))
  : null;
```
