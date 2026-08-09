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

The default locale is served **unprefixed** at `/` (e.g. `/products`); every
other locale is served under its own prefix (e.g. `/en/products`). This is
handled by `middleware.ts`.

**Note on the file name:** Next.js 16 renamed `middleware.ts` → `proxy.ts`
(export `middleware` → `proxy`), and normally that rename should stick — but
this repo deliberately uses the deprecated `middleware.ts` convention instead.
`proxy.ts` is hardcoded to the Node.js runtime with no override (Next.js
throws if a `runtime` is set in its `config` export); Cloudflare's
`opennextjs-cloudflare` adapter doesn't support Node.js middleware yet
(github.com/opennextjs/opennextjs-cloudflare#962, long-term tracked in #972),
so deploying there fails with "Node.js middleware is not currently
supported." `middleware.ts` isn't (yet) subject to that lock-in and can still
declare `runtime: "experimental-edge"` in its `config` export, which is what
makes the Cloudflare deploy work. This is a deliberate, verified workaround
for a currently-unresolved third-party adapter gap, not an oversight — but
re-check it on every Next.js/opennextjs-cloudflare upgrade, since it relies
on `middleware.ts` not being closed off the same way `proxy.ts` was.
Only revert to `proxy.ts` if this project stops targeting Cloudflare, or once
opennextjs-cloudflare ships Node.js middleware support.

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

- Each collection lives in its own `tina/collections/<name>.schema.tsx`
  file; `tina/config.ts` only imports and composes them into the
  `collections` array passed to `defineConfig`. Shared field helpers
  (`seoField()`, `draftField()`, `slugField()`/`slugLifecycleGuard()`,
  `defineTaxonomy()`/`taxonomyField()` — see "Taxonomies" below) live under
  `tina/collections/shared-fields/`, one `<name>.schema.tsx` per helper.
  Block templates live next to their render component as
  `components/blocks/<Name>.template.tsx`. This follows Tina's own
  naming-conventions guide (https://tina.io/docs/guides/naming-conventions)
  rather than one large inline schema file.
- **Collection filenames are prefixed by group, hyphenated, no dots:**
  content collections that stand on their own (`pages`, `blog`, `products`)
  get no prefix; a collection that only makes sense attached to another one
  is prefixed with that collection's name (`product-categories.schema.tsx`,
  `blog-categories.schema.tsx` — both taxonomies, see "Taxonomies" below);
  the global/singleton config documents are prefixed `site-`
  (`site-settings.schema.tsx`, `site-nav.schema.tsx`,
  `site-footer.schema.tsx`, `site-multilingual.schema.tsx`). Keep new
  collections in one of these three groups rather than inventing a fourth
  naming shape.
- Media is repo-based (`media.tina` in the config, `publicFolder: "public"`,
  `mediaRoot: "uploads"`) — uploads land in `public/uploads`, not an external
  provider. Tina's `image` field type accepts any file (PDFs included).
- Global/singleton documents (site settings, nav, footer) are list collections
  with exactly one file per locale and `ui.global: true` — not a true Tina
  "singleton" primitive.
- Admin UI is served at `/admin/index.html`, generated automatically by the
  `tinacms` CLI wrapper — no app route needed for it.
- `npm run dev` → `tinacms dev --noTelemetry -c "next dev"`. No Tina Cloud
  credentials needed — `clientId`/`token` fall back to `null` in
  `tina/config.ts`, which makes the CLI self-host content locally for dev.
- `npm run build` → `NODE_ENV=production NODE_OPTIONS=--max-old-space-size=4096
  tinacms build --noTelemetry -c "next build --webpack"`. The
  `NODE_ENV=production` prefix and `--noTelemetry` are load-bearing, not
  decorative — see Known issues below. `--webpack` and the raised heap limit
  are Cloudflare-build-environment workarounds (see Known issues); harmless
  elsewhere.

**Tina Cloud is required before the first production deploy, on every
project built from this boilerplate — not optional, not
platform-specific.** See "Production builds require Tina Cloud" under Known
issues below before deploying anywhere for the first time.

## Media URLs — always through `mediaUrl()`, never a raw field value

Every place that renders a Tina `image`-field value as an `<img>`/`<video>`
`src` (or a favicon/OG-image URL) must pass it through `mediaUrl()`
(`cms/media-url.ts`) first — never interpolate the field's string value
directly. `CoverMedia.tsx` (the shared image/video renderer behind most
content-driven media in this repo) already does this once, centrally; a new
ad-hoc media render outside that component — the way `Hero.tsx`'s slide
image/video, `Header.tsx`'s logo, `LanguageSwitcher.tsx`'s flag, and the
layout's favicon all are — needs its own `mediaUrl()` call.

**Why:** in production, a Tina `image` field resolves to a full
`https://assets.tina.io/...` URL (Tina Cloud's asset CDN — see "TinaCMS"
above), and that CDN serves every asset with no `Cache-Control` header at
all — confirmed via Lighthouse's "efficient cache lifetimes" audit flagging
~32MB of video/image transfer with no cache TTL. That host isn't ours to
configure. `mediaUrl()` rewrites an `assets.tina.io` URL to
`/media/<path>` — same-origin, served by `app/media/[...path]/route.ts` —
which proxies the fetch to Tina's CDN and stamps
`Cache-Control: public, max-age=31536000, immutable` on the way back out;
Cloudflare's own zone edge cache and every visitor's browser honor that
header with no further code needed. Locally (`next dev`), a Tina media
field instead resolves to a relative `/uploads/...` path (already
same-origin); `mediaUrl()` detects this via `new URL()` throwing on a
non-absolute string and returns it unchanged, so nothing routes through the
proxy in dev.

**Do not add Cloudflare's `caches.default` Cache API to this route without
verifying it first against real production logs.** An earlier version did
exactly that (plus `getCloudflareContext()` to get `waitUntil`), and it
spiked this Worker's error rate from <150 to 1.25k almost immediately after
deploy — every fresh (non-edge-cached) request to `/media/...` started
returning a 500 from this route. Root cause was never confirmed with a
stack trace (no log access at the time), but `caches.default` was the one
piece of that version that didn't type-check against this project's
ambient Cloudflare types without a forced cast — a real signal its runtime
shape inside a Next.js Route Handler on the Node.js runtime (this adapter's
default for Route Handlers, unlike `middleware.ts`'s forced edge runtime)
didn't match what was assumed. It also wasn't necessary: the plain
`Cache-Control` header is what actually satisfies Lighthouse's "efficient
cache lifetimes" check.

**Not enforced like `slugLifecycleGuard`** — there's no equivalent build-time
gate that fails loudly if a new component forgets the call, since a missed
`mediaUrl()` degrades to "this one asset isn't cached" rather than a broken
page (unlike a missing slug guard, which produces a live 404). Get it right
by routing new media through `CoverMedia.tsx` whenever the render shape fits
it, and calling `mediaUrl()` directly at the `src`/`poster`/`icon` prop
whenever it doesn't.

## Visual editing

Wired up for `blog`, `products`, and `pages` — collections editors touch
constantly; add to others deliberately, not by default (see the pattern
below). The plain
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
2. **`ui.router` on the collection** (in its `tina/collections/<name>.schema.tsx`), so the admin's
   preview pane knows which URL a document maps to. Derive it from
   `document._sys.breadcrumbs` (filename), never a custom field like
   `slug` — `document` in this callback is typed with only `_sys`, and that
   type is accurate: an earlier version of this code read `document.slug`
   via a cast (reasoning it was safe because `slugLifecycleGuard`
   guarantees uniqueness — true, but beside the point), and it broke live:
   clicking "edit" in the admin produced a preview URL with a literal
   `undefined` slug and 404'd, because the field genuinely isn't populated
   on `document` at this call site. Matches Tina's own docs example, which
   uses `_sys.filename` for the same reason. Only resolves to the right URL
   when filename === slug (true for this repo's seed content); if an
   editor's `slug` field diverges from the filename, this link can point at
   the wrong preview URL — the live site's actual routing is unaffected,
   since page rendering resolves the `slug` field via a GraphQL query
   (`lib/tina-content.ts`), not this router.
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
developers only (this repo intentionally leaves `categories`,
`productCategories`, and the singleton `site-settings`/`nav`/`footer` docs
on the plain admin).

Tradeoff, if asked to add more: per collection it costs a client/server
component split (page fetch → client component, not a single server
component), per-field `tinaField` wiring, and two data paths to keep in
sync (initial server props vs. the live-edit override). In
exchange, editors get true WYSIWYG editing instead of a flat form — worth it
for high-traffic editorial content, not for rarely-touched config.

## Routable slugs — a field, not a filename, and it's enforced

Any collection where a document's URL is driven by an editable `slug`
field (not by whatever Tina named the underlying file) uses two paired
helpers from `tina/collections/shared-fields/slug.schema.tsx`:

- **`slugField({ reserved? })`** — the field itself. `reserved` is an
  optional `Set<string>` of words that can't be used (see "Pages collection"
  below); omit it for collections that don't need one (`blog` posts live
  under `/blog/`, so they can't collide with a root-level page slug).
- **`slugLifecycleGuard(collectionName)`** — a `ui.beforeSubmit` hook doing
  two things: (1) blocks saving a document whose `slug` is already used by
  another document in the same collection *and locale* (the same slug
  validly exists in both `en/` and `vi/` — those are different URLs); (2)
  for the `pages` collection only, blocks changing `slug` at all on a
  filename listed in `lockedSlugFilenames` (`lib/pages-config.ts` — see
  "Collection-backed listing pages" below). Verified against
  `tinacms/dist/index.js` directly (not just docs, which don't say either
  way): `beforeSubmit` runs inside `handleSubmit`'s `try/catch`, and
  throwing there stops the write from ever reaching disk — Tina shows the
  message as a form error.

Deliberately does **not** track slug history or auto-redirect a renamed
document's old URL — an earlier version did, but it meant a
"Previous Slugs (auto-managed)" list field showing up in the admin with no
clean way to hide it, for a case (an editor renaming an existing page's
slug, not creating a new one) that doesn't come up often enough to justify
that. If a slug does change, add a redirect by hand at that point instead.

**Why this exists:** routing by filename (`relativePath: ${locale}/${slug}.md`)
silently breaks the moment a document's `slug` field doesn't match its
actual filename — whichever document isn't literally named `<slug>.md`
becomes an unreachable 404 with no error shown anywhere. So lookups
(`lib/tina-content.ts`) resolve a slug by **querying the `slug` field**
(`getBlogPostQuery`/`getPageQuery`: a filtered `*Connection` query first to
find the matching document's `relativePath`, then a single-doc fetch) and
only then read the resolved document — never by assuming filename === slug.
That's only safe because uniqueness is guaranteed at write time by the
guard above.

**The gate:** `assertSlugFieldsHaveGuard(collections)` runs at the bottom of
`tina/config.ts` on every `dev`/`build` — if any collection has a field
named `slug` but no `ui.beforeSubmit`, it throws immediately with the
offending collection's name. Adding a new routable collection *without*
wiring the guard fails the build loudly rather than shipping a latent
404 bug. Use `slugField()` +
`beforeSubmit: slugLifecycleGuard("name")` together on every new collection
that needs an editable slug.

**Real limitation, not fully closed:** `beforeSubmit` only runs when a
document is saved *through Tina's admin form*. A document created by a
direct GraphQL mutation (a seed script, a migration) bypasses it entirely —
same as an ORM-level unique constraint that doesn't help if something
writes to the database directly. The seed content in this repo was
created carefully by hand/script for exactly this reason; it isn't
proof the guard works, only that nothing violated it.

## Drafts

`draftField()` (`tina/collections/shared-fields/draft.schema.tsx`) is a plain, unenforced boolean —
Tina docs are explicit that draft fields aren't special, application code
is responsible for filtering: https://tina.io/docs/drafts/drafts-fields.
Applied to `products`, `blog`, and `pages` (collections whose documents are
individually publishable); not on the `site-settings`/`nav`/`footer`
singletons, which aren't individually publishable content at all.

- **Listing queries** filter it at the GraphQL level: `filter: { draft: { eq: false } } }`
  on every `*Connection` call in `lib/tina-content.ts`.
- **Single-document lookups** (`getBlogPostQuery`/`getPageQuery`, see
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

## Taxonomies

WordPress-style taxonomies (categories, tags, countries, ...) as a reusable
Tina pattern, not a one-off field on `blog`. Two factories in
`tina/collections/shared-fields/taxonomy.schema.tsx`:

- **`defineTaxonomy({ name, label })`** — registers a taxonomy as its own
  term-store collection (`title` + `slug`, uniqueness-guarded the same way
  as any other routable-slug collection — see "Routable slugs" above).
  Two are registered: `categories` (`tina/collections/categories.schema.tsx`,
  attached to `blog`) and `productCategories`
  (`tina/collections/product-categories.schema.tsx`, attached to
  `products`) — kept as separate taxonomies rather than shared, one row per
  collection × taxonomy (see the registry below). A third taxonomy (e.g.
  `countries`) is another call to this factory plus an entry in the
  `collections` array in `tina/config.ts`.
- **`taxonomyField({ taxonomy, label, multiple? })`** — attaches a
  registered taxonomy to a content collection as a reference field.
  `multiple` defaults to `true` (a document can carry several terms at
  once, matching WordPress's default checkbox-style category/tag
  behavior — its core `category` taxonomy is multi-select by default, not
  single).

**Why `multiple: true` isn't a plain `reference` field with `list: true`:**
Tina's `reference` field type doesn't support `list: true` in the admin —
the GraphQL schema builder accepts it (`@tinacms/graphql`'s
`_buildDataField`), but logs `"the user interface for reference does not
support \`list: true\`"` because there's no admin widget for it (confirmed
by reading that source, not just the docs, which don't mention `list` on
`reference` at all). So `multiple: true` instead wraps each term in a
repeatable `object` item (`{ term: <reference> }`) — the exact pattern
already used for every other repeatable field in this schema
(`socialLinks`, footer `columns`, `attributes`) — verified live in the
admin (drag, edit, delete, add all work; the collapsed item label falls
back to the reference's filename since `itemProps` only sees raw form
values, not resolved query data). That's why a multi-term field resolves
as `{ term: Category }[]`, not `Category[]` directly — unwrap with
`.map(c => c.term)` on the frontend. Pass `multiple: false` for a taxonomy
that's genuinely single-select for a given collection; that case has no
such limitation and stays a plain `reference` field.

**Frontend wiring** is generic across taxonomies rather than per-taxonomy
bespoke code:

- `lib/taxonomies.ts` — a registry, one row per (content collection ×
  taxonomy) attachment: `{ collection, taxonomy, urlSegment, fieldName }`.
  Adding "countries" to `blog` later is one row here plus the schema
  change, no new route file.
- `filterByTaxonomyTerm(entries, fieldName, termSlug)` in
  `lib/tina-content.ts` — a generic post-query filter. Filters in
  application code rather than a GraphQL `filter` clause, same as every
  other listing query in this file, since nested list-object filter
  semantics on a taxonomy field aren't worth relying on unverified.
- `app/[locale]/blog/[slug]/[term]/page.tsx` and
  `app/[locale]/products/[slug]/[term]/page.tsx` — the generic archive
  route for a taxonomy attached to `blog` and to `products`, respectively.
  Each folder is named `[slug]`, not `[taxonomy]`, only because Next.js
  requires every dynamic segment at the same route level to share one
  parameter name, and each level already has `[slug]` from its sibling
  detail route (`.../[slug]/page.tsx`) — confirmed live: naming it
  `[taxonomy]` instead broke the whole app with "You cannot use different
  slug names for the same dynamic path ('slug' !== 'taxonomy')". Each
  route's `resolveTerm()` is the one piece that isn't fully generic: it has
  a hardcoded case for its one taxonomy (`"categories"` /
  `"productCategories"`) because Tina's generated client is per-collection
  typed (`client.queries.categoriesConnection` /
  `client.queries.productCategoriesConnection`), so a new taxonomy needs a
  matching branch there, not just a registry row.

**`blog` and `products` each have one taxonomy attached.** Attaching a
taxonomy to a third content collection needs that collection's own archive
route file too, since Next.js routes are physical per top-level path — the
registry and `filterByTaxonomyTerm` are already collection-agnostic; only
the route file isn't.

## Pages collection & block-based editing

`pages` (`tina/collections/pages.schema.tsx`) is a generic,
editor-composable collection using Tina's block-based editing
(https://tina.io/docs/editing/blocks): a `blocks` list field with
`templates` (`pageBlocks`, assembled in that same file from each block's
`<Name>.template.tsx` next to its render component in `components/blocks/`;
`BlocksRenderer.tsx` switches on `block.__typename`). Add a new block type
by creating `<Name>.template.tsx` + adding it to `pageBlocks` + a case in
the switch — nothing else changes.

**Root-level routing:** `pages` documents resolve at `/<slug>` (e.g.
`/about`, or `/en/about`) via a catch-all route,
`app/[locale]/[slug]/page.tsx` — *not* a nested `/pages/<slug>`. This is
deliberate: it's what lets a client who's allowed to create pages publish
one live with no code deploy. It does not conflict with the dedicated
routes (`/blog`, `/products`, `/contact`, and `/blog/[slug]`/`/products/[slug]`
for detail pages) — verified empirically, not just reasoned about: Next.js
always resolves a literal folder over a same-level dynamic sibling, so
`/blog` hits `app/[locale]/blog/page.tsx` and never falls through to the
catch-all as long as that literal route exists. `lib/pages-config.ts`'s
`reservedSlugs` set (enforced via `slugField({ reserved: reservedSlugs })`
on `pages`) is deliberately small now (just `"admin"`, `"api"`) — `blog`
and `products` used to be reserved words here too, but they're not
generic collisions anymore, they're the exact slugs the locked listing-page
documents legitimately use (see "Collection-backed listing pages" below),
so reserving them would block saving the very documents meant to hold them.

**Creation lock:** `pages.ui.allowedActions.create` — `true` by default (a
generic pages collection is only useful if editors can add pages).
For a client who should only edit existing pages, flip it to `false`; this
is the one-line, per-client toggle mentioned in the field's own comment in
`tina/collections/pages.schema.tsx`.

**Block editing on/off per page, in code:** `lib/pages-config.ts`'s
`blocksDisabledSlugs` — a developer-only override, not exposed to editors.
A listed slug always renders as a fixed layout (title + intro only),
ignoring whatever's in its `blocks` field, regardless of what the admin
shows. The schema itself doesn't change per document; only the frontend's
rendering decision does.

**Migrating an existing fixed route to a `pages` document:** two variants,
both used in this repo.
- **Full migration** (`/about`, `/contact`): delete the dedicated
  `page.tsx` entirely, extract its markup into a block, create the
  `content/pages/<locale>/<slug>.md` document, add the block to it. Works
  cleanly whenever the route has no nested children of its own.
- **Content-only migration** (`/blog`, `/products`): the dedicated
  `page.tsx` has to stay — it has sibling children (`blog/[slug]`,
  `blog/[slug]/[term]`) that need that literal folder to keep existing, and
  Next.js resolving a literal folder over a same-level dynamic sibling
  means deleting `blog/page.tsx` would make `/blog` 404 rather than fall
  through to the `[slug]` catch-all. So the route file stays, but its body
  changes from hardcoded markup to `getPageQuery(locale, "blog")` +
  `PageView` — same pattern the home page already used. See "Collection-backed
  listing pages" below for the rest of what this needed (a locked slug, a
  fixed lookup key, a listing block).

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
list blocks a slug from being *used* elsewhere, but the home document needs
exactly that slug to be resolvable by `getPageQuery(locale, "home")`.
Uniqueness (so no second document can also claim `"home"`) is guaranteed by
`slugLifecycleGuard`, same as any other page — and unlike any other page,
`home`'s slug can't be *changed* at all; see the next section.

## Collection-backed listing pages, locked slugs & cross-locale linking

`lib/collection-slugs.ts` is the single source of truth for `blog` and
`products` — the two collections with their own dedicated route folders
(listing, detail, taxonomy archive) rather than a `pages` document, because
they have children a `pages` document can't (see the content-only migration
note above). Two things per collection, both code-level because they
concern the physical route, not CMS content:

- **`locales`** — the per-locale URL segment, e.g. `{ en: "blog", vi: "tin-tuc" }`.
  A `pages` document gets a translated URL for free via its own per-locale
  `slug` field; these can't, since their segment is a literal folder name.
  Adding a locale here needs a matching redirect+rewrite pair in
  `next.config.ts` (only for non-default locales — the default locale's
  segment already matches the physical folder name verbatim) so the
  translated segment resolves and the untranslated one 308s to it.
  `collectionPath(locale, key, rest?)` is the one place allowed to spell
  out `"/blog"`/`"/products"` as a literal string — every link builder goes
  through it, the `resolveTerm`/breadcrumb/CTA code included.
- **`listingPageFilename`** — the `pages` document (matched by filename,
  same in every locale) backing that collection's listing page, e.g.
  `content/pages/en/blog.md` + `content/pages/vi/blog.md`, each with a
  `BlogListingBlock` doing the actual rendering.

**Locked slugs:** `lib/pages-config.ts`'s `lockedSlugFilenames` — `home`
plus every collection's `listingPageFilename`, derived from the registry
above rather than hand-duplicated. `slugLifecycleGuard` (see "Routable
slugs") refuses to save a `slug` change on any `pages` document whose
*filename* is in this set. This isn't the same kind of protection
`reservedSlugs` gives everyone else: `blog`/`tin-tuc` aren't forbidden
words here, they're precisely the slug the locked document is supposed to
hold — the real public URL is owned by `collectionSlugs` above and never
reads this document's `slug` field at all, so letting an editor "change"
it would silently do nothing except lie about what the URL actually is.
**Also don't delete these three documents** — nothing enforces that: Tina
has no per-document delete-protection hook the way it has `beforeSubmit`
for saves (`allowedActions.delete` is collection-wide, all-or-nothing, and
would break `pages` being freely creatable/deletable for everything else),
so this is a documented convention, not a hard guarantee.

**Cross-locale linking is by filename, not by slug or by a translation-key
field.** Two locale documents are "the same page" purely because they share
a filename (`content/pages/en/about.md` / `content/pages/vi/about.md`) —
nothing else pairs them, and their `slug` fields can (and for `about`, do)
genuinely diverge (`about` / `ve-chung-toi`). This is why filenames are
**set once at creation and never renamed** — renaming breaks the pairing
*and* discards git history for that file, which is the whole reason this
approach won over a dedicated `translationKey` field: it reuses data that
already has to exist (the filename) instead of asking editors to
hand-maintain a second identifier in parallel with it.
- `getPageAlternates(filename)` (`lib/tina-content.ts`) — the actual
  cross-locale lookup: given a filename, finds the matching document in
  every locale and reads each one's own `slug` to build its real URL.
  Wrapped in `cache()`.
- `resolveLocaleAlternates(locale, pathname)` (`lib/locale-alternates.ts`)
  — the single function both hreflang and the language switcher call.
  Branches on whether the path is a known `collectionSlugs` route (pure
  string transform, since an individual post's/product's own slug is
  assumed identical across locales by convention) or a `pages` slug (a real
  `getPageAlternates` lookup, since those can diverge). Used by
  `buildAlternates` (`lib/seo.ts`, for `<link rel="alternate" hreflang>`)
  and by `Header.tsx` (server-resolved, passed into `LanguageSwitcher` as a
  plain `{ locale: url }` map — the switcher itself has no logic left,
  it just renders whatever URL it's given). Before this, both hreflang and
  the switcher independently guessed "same path, swap the locale prefix" —
  correct for collection routes (protected by the redirect above even when
  wrong) but silently broken for `about`/`contact` once their slugs
  diverged: hreflang pointed `vi` at `/vi/about`, which 404s: the real
  slug is `/vi/ve-chung-toi`. Confirmed live before the fix, not assumed.

**Renaming a slug does not auto-redirect the old URL** — deliberately, see
"Routable slugs" above. A `pages`/`blog`/`products` document renamed
through the admin just 404s at its old URL until a developer adds a
redirect by hand (`next.config.ts`'s `redirects()`, same mechanism already
used for the untranslated-collection-URL redirects above).

**Sitemap** (`app/sitemap.ts`) walks every non-draft `pages`/`blog`/`products`
document in every locale and builds each URL with the exact same helpers
everything else uses (`resolvePagesDocumentUrl`, `collectionPath`) — no
separate URL-building logic to keep in sync. `export const dynamic =
"force-dynamic"` for the same reason the rest of this app already renders
every route dynamically (see "Production builds require Tina Cloud" under
Known issues): a statically-generated sitemap would go stale the moment a
slug changes without a rebuild, defeating the point.

## Known issues

- **Production builds require Tina Cloud — set this up before the first
  deploy, on every project, regardless of hosting platform.** Every page in
  this app fetches CMS content at request time (all routes render
  dynamically — confirmed by `next build`'s own route summary marking them
  `ƒ`, not `○`), via the generated `tina/__generated__/client.ts`. Building
  with TinaCMS's `--local` (self-hosted) mode points that generated client
  at a temporary `http://localhost:4001/graphql` server that exists only for
  the duration of the build itself — it's gone by the time a real visitor
  hits the deployed site, on **any** host (this was first misdiagnosed as a
  Cloudflare-specific adapter bug; it isn't — a plain Node server or Vercel
  deploy would fail the exact same way). Symptoms are inconsistent and
  actively misleading depending on which `lib/tina-content.ts` function is
  involved: functions wrapped in try/catch (`getSiteSettings`,
  `getPageQuery`) degrade to a clean Next.js not-found page; functions
  without one (`getBlogPosts`, `getProducts`, and other `*Connection`
  helpers in that file) throw uncaught and render `app/global-error.tsx`
  ("Something went wrong"). It can even look like it works in local testing right after
  a build, because of a leftover on-disk query-result cache
  (`tina/__generated__/.cache/<timestamp>/`, gitignored, tied to that one
  build's absolute machine path) — that's a false positive from reusing the
  same build machine, not evidence of a working setup; a genuinely fresh
  build has no such cache.
  **The fix, required once per project:** create the project at
  app.tina.io, then set `NEXT_PUBLIC_TINA_CLIENT_ID` and `TINA_TOKEN` as env
  vars wherever the app builds/runs — on platforms that separate build-time
  and runtime environments (Cloudflare Workers does: Settings → Build →
  Environment Variables for the build step, `wrangler secret put` for the
  deployed Worker's runtime), set them in **both** places, since a
  deploy-runtime secret alone won't reach the build step that generates
  `client.ts`. Confirm it worked by checking the generated
  `tina/__generated__/client.ts` after a build: it must show a
  `content.tinajs.io` URL, never `localhost:4001`. Do this before
  troubleshooting *any* "works locally, broken in production" symptom on a
  project from this boilerplate — chasing the symptom instead (adapter
  rewrite bugs, middleware runtime lock-in, etc., all real rabbit holes hit
  before this was found) wastes real time on the wrong layer.
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
- **Turbopack can hang indefinitely on resource-constrained build
  containers**: `next build` defaults to Turbopack in Next.js 16, which
  offloads compilation to a worker process communicating with its native
  binary over IPC (`NEXT_TURBOPACK_USE_WORKER`) — observed hanging silently
  for 25+ minutes on one build platform (no error, no crash, just no output
  until an external timeout killed it), while the identical build with
  `next build --webpack` completed in seconds. Also observed separately: the
  Tina indexing step hitting V8's default ~2GB heap ceiling and OOM-crashing
  on the same platform, fixed by `NODE_OPTIONS=--max-old-space-size=4096` —
  a different failure mode (fast crash vs. silent hang) from a different
  cause, both specific to that one build environment. Neither reproduced
  locally. If a fresh project's build hangs or OOMs somewhere a local build
  doesn't, try these two independently before assuming an app-code bug.
- **Cloudflare deploy ran the entire Tina+Next build twice** if
  `wrangler.jsonc`/`open-next.config.ts` aren't committed — this repo now
  commits them (plus `public/_headers` and the `deploy`/`preview`/`upload`
  scripts in `package.json`), but re-check this on a fresh clone of the
  boilerplate before assuming a slow build is one of the causes above.
  Root cause, confirmed against an actual Cloudflare Workers Builds log: the
  dashboard had **Build command** = `npm run build` and **Deploy command** =
  `npx wrangler deploy`, configured as two independent steps. The build
  command's `.next` output is never consumed by the deploy step — Cloudflare
  Workers needs a `.open-next/worker.js` bundle, not a plain `.next` folder.
  With no `wrangler.jsonc` on disk, `wrangler deploy` detected an
  unconfigured Next.js project and auto-ran `@opennextjs/cloudflare migrate`,
  which reinstalled ~223 packages (wrangler, `@opennextjs/cloudflare`, and
  their deps — uncached, since nothing pinning them was ever committed) and
  then reran `npm run build` **from scratch** to produce the bundle it
  actually needed. Net effect on the observed run: Tina Cloud indexing
  (~70-90s) and `next build --webpack` (~45-55s) each ran twice, plus a
  ~20-35s uncached dependency install in between — roughly 4 of the total
  9.5 minutes spent, doing nothing the first pass hadn't already done.
  **The fix:** commit the adapter config once (`npx @opennextjs/cloudflare
  migrate --forceInstall` from the repo root — `--forceInstall` is needed
  because of the same React 19 peer-dependency warnings TinaCMS always
  prints, see `npm install` output), verify `.dev.vars` has no secrets
  before checking whether to commit it (this repo's only has
  `NEXTJS_ENV=development`; real secrets belong in Cloudflare env vars per
  "Production builds require Tina Cloud" above, not in this file even if
  gitignored), then in the Cloudflare dashboard set **Build command** to
  empty and **Deploy command** to `npm run deploy` (`opennextjs-cloudflare
  build && opennextjs-cloudflare deploy` — one pass, build then bundle then
  deploy). Re-run the migrate command after any Next.js/`wrangler`/
  `@opennextjs/cloudflare` major-version bump, since it regenerates
  `compatibility_date` and the adapter's generated defaults.
- **Tina CLI telemetry can hang the build**: `tinacms build`/`dev` phones
  home to PostHog on exit by default; in an environment with restricted
  outbound network access, that flush retries for ~30s and can prevent the
  wrapped `next build` from ever running at all (observed directly: the log
  showed `Tina build complete` followed only by PostHog timeout errors, no
  `.next` output — the Next.js build step never started). Both scripts pass
  `--noTelemetry` for exactly this reason; don't remove it without
  confirming the target environment has open egress to PostHog.
- **`ui.router` must read `document._sys`, never a custom field** — see the
  "Visual editing" section above. Confirmed live, not just reasoned about:
  reading `document.slug` there produced a broken preview URL with a
  literal `undefined` and 404'd. The router callback's `document` really
  only carries `_sys` at runtime, matching its TypeScript type exactly —
  the type wasn't the incomplete part here, an earlier version of this code
  was wrong to override it with a cast.
