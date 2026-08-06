@AGENTS.md

# Boilerplate guide

This repo is a reusable starting point for two-locale, TinaCMS-driven marketing
sites (Next.js App Router + TypeScript + Tailwind v4 + TinaCMS with repo-based
media). Read this before extending it for a new client project.

## Locales — single source of truth

`lib/i18n.ts` is the only place that defines which locales exist and which one
is default:

```ts
export const locales = ["vi", "en"] as const;
export const defaultLocale: Locale = "vi";
```

The default locale is served **unprefixed** at `/` (e.g. `/catalog`); every
other locale is served under its own prefix (e.g. `/en/catalog`). This is
handled by `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts` and the
export from `middleware` → `proxy` — don't rename it back):

- unprefixed request → rewritten internally to the default-locale route,
  URL bar stays clean
- `/<defaultLocale>/...` → 308-redirected to the unprefixed URL (so there is
  never a duplicate URL for the same page)
- `/<otherLocale>/...` → passed through as-is

To reuse this on a new project: edit `locales`/`defaultLocale` in
`lib/i18n.ts` and nothing else — no other file hardcodes a locale string.
Build every internal link with `localePath(locale, "/some/path")` from that
same file, never a hand-built `` `/${locale}/...` `` string.

## Translate everything, not just CMS content

Two separate things need translating, easy to forget the second one:

1. **CMS content** — anything authored in Tina (`content/<collection>/<locale>/...`).
   Structured per Tina's directory-based i18n convention: one file/folder per
   locale under each collection.
2. **UI chrome** — page headings, button labels, empty states, aria-labels,
   form status messages. None of this lives in Tina; it lives in
   `lib/dictionary.ts`, one `Dictionary` object per locale. Every page/component
   that renders user-facing text pulls it from `getDictionary(locale)` — never
   hardcode an English string directly in JSX. When adding a new page or
   component, add its strings to `Dictionary` for **every** locale in the same
   change, not just the one you're looking at.

## Theme

`app/globals.css` defines one fixed palette as CSS custom properties, exposed
to Tailwind v4 via `@theme inline` as semantic tokens: `background`,
`foreground`, `surface`, `surface-muted`, `border`, `accent`,
`accent-foreground`, `accent-soft`, `muted-foreground`. There is deliberately
no `prefers-color-scheme` auto dark-mode switch — mixing an OS-driven dark
body with hardcoded-light components is what caused the original bug here.

For a new project: change the values in `app/globals.css` only. Everywhere
else, use the semantic utility classes (`bg-surface`, `text-muted-foreground`,
`bg-accent`, `border-border`, ...) — never raw Tailwind grays/`bg-black`/
`bg-white`, so a palette swap stays a one-file change.

## TinaCMS

- Schema lives in `tina/config.ts`; a shared `seoField()` helper
  (`tina/seo-schema.ts`) adds a consistent meta title/description/OG image
  object to every page-representing collection.
- Media is repo-based (`media.tina` in the config, `publicFolder: "public"`,
  `mediaRoot: "uploads"`) — uploads land in `public/uploads`, not an external
  provider. Tina's `image` field type accepts any file (PDFs included).
- Global/singleton documents (site settings, nav, footer) are list collections
  with exactly one file per locale and `ui.global: true` — not a true Tina
  "singleton" primitive.
- Admin UI is served at `/admin/index.html`, generated automatically by the
  `tinacms` CLI wrapper — no app route needed for it.
- `npm run dev` → `tinacms dev -c "next dev"`.
- `npm run build` → `NODE_ENV=production tinacms build --local --skip-cloud-checks -c "next build"`.
  The `NODE_ENV=production` prefix is load-bearing, not decorative — see
  Known issues below.

## Visual editing

Wired up for `blog` and `pages` — collections editors touch constantly; add
to others deliberately, not by default (see the pattern below). The plain
admin at `/admin/index.html` (form-based CRUD) works for every collection
with zero extra code; visual editing (click-to-edit directly on the live
page, in a split preview pane) needs three pieces per collection:

1. **A single-document query, not a connection query, resolved by the
   `slug` field.** `useTina()` needs the raw `{ data, query, variables }`
   shape a `client.queries.<name>(relativePath)` single-doc call returns — a
   `*Connection` (list) query result won't work. Get there in two steps, as
   `getBlogPostQuery`/`getPageQuery` (`lib/tina-content.ts`) do: a
   `*Connection` query filtered by `slug` (and `draft`) to find the matching
   document's `relativePath`, then the single-doc fetch by that path. Wrap
   the whole thing in React's `cache()` so `generateMetadata` and the page
   component share one request.
2. **`ui.router` on the collection** (`tina/config.ts`), so the admin's
   preview pane knows which URL a document maps to. `document` in that
   callback is only typed with `_sys` — no collection-specific fields — even
   though `slug` exists on the object at runtime; the router reads it via an
   explicit cast (`(document as unknown as { slug: string }).slug`). That
   cast is safe specifically *because* `slugUniquenessGuard` (see "Routable
   slugs" below) guarantees `slug` is unique per locale — without that
   guarantee, don't trust a custom field here; fall back to
   `document._sys.breadcrumbs` (filename-derived) the way Tina's own docs
   example does.
3. **A client component calling `useTina()` + `tinaField()`**
   (`components/blog/BlogPostView.tsx`, `components/pages/PageView.tsx`)
   that the server page passes `{query, variables, data}` into.
   `data-tina-field={tinaField(post, "x")}` on the DOM node showing field
   `x` is what makes it clickable in the preview pane. Outside Tina's admin
   iframe, both `useTina()` and `tinaField()` are no-ops — `useTina()`
   returns the passed-in `data` unchanged and `tinaField()` returns `""`
   (verified directly against `@tinacms/bridge/dist/tina-field.js`: it
   short-circuits to `""` whenever the object has no `_content_source`,
   which only live-edit data carries) — so normal visitors and the
   production build render identically to a plain server component.

**List/blocks fields work too, at two granularities:** `pages`' `blocks`
list is the example — `BlocksRenderer.tsx` wraps each rendered block in
`data-tina-field={tinaField(block)}` (no field name = "edit this whole
block," and Tina resolves the correct array index from the block object's
own metadata, no manual indexing needed), and each block component
additionally marks its own fields (`tinaField(data, "heading")` etc.) for
finer click targets. Same pattern for any other list field.

To extend this to another collection, copy the query pattern +
a `*View.tsx` client component + a `ui.router`, swapping in that
collection's query/fields. Skip it for collections edited rarely or by
developers only (this repo intentionally leaves `contact-form-config`,
`catalog`, `storyCards`, and the singleton `site-settings`/`nav`/`footer`
docs on the plain admin).

Tradeoff, if asked to add more: per collection it costs a client/server
component split (page fetch → client component, not a single server
component), per-field `tinaField` wiring, and two data paths to keep in
sync (initial server props vs. the live-edit override). In
exchange, editors get true WYSIWYG editing instead of a flat form — worth it
for high-traffic editorial content, not for rarely-touched config.

## Routable slugs — a field, not a filename, and it's enforced

Any collection where a document's URL is driven by an editable `slug`
field (not by whatever Tina named the underlying file) uses two paired
helpers from `tina/slug-field.ts`:

- **`slugField({ reserved? })`** — the field itself. `reserved` is an
  optional `Set<string>` of words that can't be used (see "Pages" below);
  omit it for collections that don't need one (`blog` posts live under
  `/blog/`, so they can't collide with a root-level page slug).
- **`slugUniquenessGuard(collectionName)`** — a `ui.beforeSubmit` hook that
  blocks saving a document whose `slug` is already used by another document
  in the same collection *and locale* (the same slug validly exists in both
  `en/` and `vi/` — those are different URLs). Verified against
  `tinacms/dist/index.js` directly (not just docs, which don't say either
  way): `beforeSubmit` runs inside `handleSubmit`'s `try/catch`, and
  throwing there stops the write from ever reaching disk — Tina shows the
  message as a form error.

**Why this exists:** routing by filename (`relativePath: ${locale}/${slug}.md`)
silently breaks the moment a document's `slug` field doesn't match its
actual filename — whichever document isn't literally named `<slug>.md`
becomes an unreachable 404 with no error shown anywhere. So lookups
(`lib/tina-content.ts`) resolve a slug by **querying the `slug` field**
(`getBlogPostQuery`/`getPageBySlug`: a filtered `*Connection` query first to
find the matching document's `relativePath`, then a single-doc fetch) and
only then read the resolved document — never by assuming filename === slug.
That's only safe because uniqueness is guaranteed at write time by the
guard above.

**The gate:** `assertSlugFieldsHaveGuard(collections)` runs at the bottom of
`tina/config.ts` on every `dev`/`build` — if any collection has a field
named `slug` but no `ui.beforeSubmit`, it throws immediately with the
offending collection's name. Adding a new routable collection *without*
wiring the guard fails the build loudly rather than shipping a latent
404 bug. Use `slugField()` + `beforeSubmit: slugUniquenessGuard("name")`
together on every new collection that needs an editable slug.

**Real limitation, not fully closed:** `beforeSubmit` only runs when a
document is saved *through Tina's admin form*. A document created by a
direct GraphQL mutation (a seed script, a migration) bypasses it entirely —
same as an ORM-level unique constraint that doesn't help if something
writes to the database directly. The seed content in this repo was
created carefully by hand/script for exactly this reason; it isn't
proof the guard works, only that nothing violated it.

## Drafts

`draftField()` (`tina/draft-field.ts`) is a plain, unenforced boolean —
Tina docs are explicit that draft fields aren't special, application code
is responsible for filtering: https://tina.io/docs/drafts/drafts-fields.
Applied to `catalog`, `storyCards`, `blog`, and `pages` (collections whose
documents are individually publishable); not on `contact-form-config`
(field definitions, not content) or the `site-settings`/`nav`/`footer`
singletons.

- **Listing queries** filter it at the GraphQL level: `filter: { draft: { eq: false } } }`
  on every `*Connection` call in `lib/tina-content.ts`.
- **Single-document lookups** (`getBlogPostQuery`/`getPageBySlug`, see
  above) apply the same `draft: { eq: false }` filter during the
  slug-resolution step — a draft simply won't resolve to a `relativePath`,
  so it 404s the same way a nonexistent slug would.
- Every seed content file explicitly sets `draft: false` rather than
  omitting the field — this was a deliberate choice to avoid relying on
  how Tina's filter treats an *absent* field vs. an explicit `false`
  (verified empirically that `eq: false` does match existing content, but
  explicit is cheap and removes the ambiguity for future seed content too).
- **Known gap, matches Tina's own documented caveat:** because drafts are
  filtered out at query time, a draft is *also* invisible inside Tina's own
  admin preview pane — an editor can't live-preview a post before
  publishing it. Tina's docs call this out directly: full support needs
  Next.js Preview Mode (`draftMode()`), which isn't implemented here. Out
  of scope for this PoC; flagging so it isn't mistaken for an oversight.

## Pages collection & block-based editing

`pages` (`tina/config.ts`) is a generic, editor-composable collection using
Tina's block-based editing (https://tina.io/docs/editing/blocks): a
`blocks` list field with `templates` (defined in `tina/blocks.ts`), each
template rendered by a matching component in `components/blocks/`
(`BlocksRenderer.tsx` switches on `block.__typename`). Add a new block type
by adding a `Template` to `pageBlocks` and a case to the switch — nothing
else changes.

**Root-level routing:** `pages` documents resolve at `/<slug>` (e.g.
`/about`, or `/en/about`) via a catch-all route,
`app/[locale]/[slug]/page.tsx` — *not* a nested `/pages/<slug>`. This is
deliberate: it's what lets a client who's allowed to create pages publish
one live with no code deploy. It does not conflict with the dedicated
routes (`/blog`, `/catalog`, `/contact`, `/story-cards`, and `/blog/[slug]`
for post details) — verified empirically, not just reasoned about: Next.js
always resolves a literal folder over a same-level dynamic sibling, so
`/blog` hits `app/[locale]/blog/page.tsx` and never falls through to the
catch-all as long as that literal route exists. `lib/pages-config.ts`'s
`reservedSlugs` set (enforced via `slugField({ reserved: reservedSlugs })`
on `pages`) stops an editor from creating a page that *would* collide if
one of those dedicated routes were ever removed.

**Creation lock:** `pages.ui.allowedActions.create` — `true` by default (a
generic pages collection is only useful if editors can add pages).
For a client who should only edit existing pages, flip it to `false`; this
is the one-line, per-client toggle mentioned in the field's own comment in
`tina/config.ts`.

**Block editing on/off per page, in code:** `lib/pages-config.ts`'s
`blocksDisabledSlugs` — a developer-only override, not exposed to editors.
A listed slug always renders as a fixed layout (title + intro only),
ignoring whatever's in its `blocks` field, regardless of what the admin
shows. The schema itself doesn't change per document; only the frontend's
rendering decision does.

**Migrating an existing fixed route (e.g. `/blog`) to a `pages` document:**
delete the dedicated `page.tsx`, extract its markup into a reusable
component, wrap that component in a new block type, create the
`content/pages/<locale>/<slug>.md` document, add the block to it. Detail
routes with their own data shape (`/blog/[slug]`) are unaffected either
way — they're a structurally different URL shape, not competing for the
same route.

**Home page is a `pages` document too** (`content/pages/<locale>/home.md`,
`slug: "home"`), rendered by `app/[locale]/page.tsx` — same `PageView` +
`getPageQuery` as any other page, visual editing included. It's *not*
handled by the `[slug]` catch-all, for a structural reason rather than a
choice: `/` has zero URL segments, and `[locale]/[slug]/page.tsx` requires
exactly one segment to bind `slug` to — there's no fallthrough to reach for
a zero-segment path the way `/blog` falls through once its dedicated route
is removed. So `app/[locale]/page.tsx` fetches slug `"home"` explicitly
instead of relying on routing to find it.

Because the `home` document is still a normal `pages` document with a real
`slug` field, it's *also* reachable at `/home` via the catch-all — same
content at two URLs. `app/[locale]/[slug]/page.tsx` special-cases
`slug === "home"` with a `redirect()` to `/` rather than rendering it a
second time. `"home"` is deliberately **not** in `reservedSlugs` — that
list blocks a slug from being *used*, but the home document needs exactly
that slug to be resolvable by `getPageQuery(locale, "home")`; uniqueness
(so no second document can also claim `"home"`) is already guaranteed by
`slugUniquenessGuard`, same as any other page.

## Known issues

- **Next.js 16 `/_global-error` prerender bug**: production builds crash
  during prerendering of the internal `/_global-error` route
  (`TypeError: Cannot read properties of null (reading 'useContext')`) unless
  `NODE_ENV=production` is explicitly set before `next build` runs. The Tina
  CLI only force-sets it under a code path this setup doesn't hit, hence the
  explicit prefix in the `build` script above. Open upstream issues:
  vercel/next.js#84994, #85668, #86178. Re-check on each Next.js patch bump —
  drop the workaround once it's fixed upstream.
- `app/global-error.tsx` sits outside the `[locale]` segment and has no
  locale context available (it replaces the root layout entirely), so its
  copy is intentionally bilingual rather than guessing a language.
