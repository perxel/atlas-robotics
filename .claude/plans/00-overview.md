# Refactor: extract a `/cms` framework layer — overview

This plan is being built domain by domain, one file per domain in this
folder. Don't read any single file as a finished plan on its own — cross-domain
decisions (Option A dependency injection, `lang?` defaults, the JSX exception)
are set once here and referenced, not repeated, in each domain file.

## Context

This repo is meant to be released as a reusable TinaCMS + Next.js marketing-site
boilerplate for future client projects. Right now the reusable, feature-shaped
logic (SEO metadata, multilingual routing, taxonomy, pagination, breadcrumbs,
the custom Tina hooks for slugs/drafts/taxonomies, and the collection
query/fetch patterns) is scattered across `lib/` and
`tina/collections/shared-fields/`, interleaved with this project's own data
(its two locales, its `blog`/`products` collections, its Vietnamese/English
copy).

## Guiding rules

- `cms/` never imports from `tina/__generated__/*`, never hardcodes this
  project's `locales`/`defaultLocale`, never hardcodes a specific collection
  or taxonomy name (`blog`, `productCategories`, ...), never hardcodes
  translated strings, and never exports a `.tsx`/JSX component **for the
  public site**. One deliberate exception: Tina admin Screen plugins (see
  `03-multilingual.md` → Translation Dashboard) — those render inside Tina's
  own admin chrome, not the client's branded site, so they don't need
  per-project restyling the way `LanguageSwitcher`/`Breadcrumb`/`Pagination`
  do. Same reasoning Tina's own built-in `MediaUsageDashboardScreenPlugin`
  ships as a ready-made component, not a bring-your-own-UI hook. (Confirmed
  directly against `node_modules/tinacms/dist/toolkit/core/plugins.d.ts` and
  `cms.d.ts`: Tina's plugin system — `Plugin`/`PluginTypeManager`/
  `cms.plugins.add()` — only extends Tina's own admin runtime, screens/
  fields/media stores/toolbar. It has no reach into the Next.js app serving
  the public site, so the rest of `cms/` isn't "a Tina plugin" and can't be —
  there's no such extension point for it.)
- Each domain (`collection`, `taxonomy`, `seo`, ...) is a **class**, defined
  generically in `cms/<domain>/`. Its public methods are the whole point —
  `import { CMSCollection } from "@/lib/cms"` and typing `CMSCollection.`
  should show every method you can call. Internal helper logic lives in
  private methods / an `internal/` folder inside that domain's `cms/`
  subfolder, and is never imported directly from outside it. Domains with no
  config/state to inject (Pagination) stay plain functions instead — no
  class for the sake of a class.
- Registering actual project data (which collections/taxonomies/locales
  exist, which Tina query function backs each one) happens by
  **instantiating** these classes with real config — `new CollectionService({ blog: {...}, products: {...} })` — and that instantiation lives entirely
  in `lib/`, never in `cms/`. All of it lives in one file, `lib/cms.ts`,
  which exports one configured singleton per domain (`CMSCollection`,
  `CMSTaxonomy`, `CMSSeo`, ...). This is the one file a future project edits
  to register a new collection/taxonomy/locale — `cms/` itself never changes.
- Where a collection name is passed as an argument (`collectionName: "blog"`),
  it's typed as a union derived from the registry (`"blog" | "products"`),
  not a plain `string` — free autocomplete/typo-catching, no extra typing at
  any call site, small one-time cost in the class definition.
- Every `lang` parameter is optional, falling back to the domain's configured
  `defaultLocale` — a single-locale project never has to pass it. Exceptions:
  parameters that mean "the OTHER locale to translate this path into"
  (`translateCollectionPath`, `resolvePagesDocumentUrl`), where there's no
  sensible default.
- Cross-domain dependencies are one-directional and explicit ("Option A"):
  a domain that needs another domain's capability is handed the *specific
  functions* it needs at construction time (e.g. `TaxonomyService` receives
  `getCollectionPath`/`getCollectionItems`/`getRelatedEntries` from
  `CollectionService`), never the whole class instance, and never the
  reverse direction.

## Domain index

| File | Domain | Shape |
|---|---|---|
| [`01-collection.md`](./01-collection.md) | Collection | Class (`CMSCollection`) — the `WP_Query` equivalent; also covers Drafts (folded in) |
| [`02-taxonomy.md`](./02-taxonomy.md) | Taxonomy | Class (`CMSTaxonomy`) — depends on Collection |
| [`03-multilingual.md`](./03-multilingual.md) | Multilingual | Class (`CMSMultilingual`) + Dictionary (`CMSDictionary`) + Translation Dashboard |
| [`04-seo.md`](./04-seo.md) | SEO | Class (`CMSSeo`) + SEO Dashboard; also covers Breadcrumb (folded in) |
| [`05-pagination.md`](./05-pagination.md) | Pagination | Plain functions, no class |
| [`06-tina-lifecycle-hooks.md`](./06-tina-lifecycle-hooks.md) | Tina Lifecycle Hooks | Plain functions — `composeBeforeSubmit`, new domain (not in the original list) |
| [`07-slug.md`](./07-slug.md) | Slug | Tina field factory + one `BeforeSubmitHook` |

## Domains folded into others (no longer standalone)

- **Drafts** → folded into Collection (`01-collection.md`, Addendum #2) —
  draft is a status of a collection item, not its own concern.
- **Breadcrumb** → folded into SEO (`04-seo.md`) — the trail data feeds both
  the UI list and breadcrumb JSON-LD structured data, which is an SEO concern.
