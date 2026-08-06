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

Only worth wiring up for collections editors touch constantly (start with
`blog`; add to others deliberately, not by default — see the pattern below).
The plain admin at `/admin/index.html` (form-based CRUD) works for every
collection with zero extra code; visual editing (click-to-edit directly on
the live page, in a split preview pane) needs three pieces per collection:

1. **A single-document query, not a connection query.** `useTina()` needs the
   raw `{ data, query, variables }` shape a `client.queries.<name>(...)`
   single-doc call returns — a `*Connection` (list) query result won't work.
   Compose the `relativePath` with locale as the sub-folder per Tina's
   directory-based i18n guide (`` `${locale}/${slug}.md` ``), same as any
   other single-doc lookup. Wrap it in React's `cache()` so `generateMetadata`
   and the page component share one request (see `getBlogPostQuery` in
   `lib/tina-content.ts`).
2. **`ui.router` on the collection** (`tina/config.ts`), so the admin's
   preview pane knows which URL a document maps to. `document` in that
   callback is only typed with `_sys` — no collection-specific fields, even
   though they exist on the object at runtime — so derive the locale/slug
   from `document._sys.breadcrumbs`, not a custom field like `document.slug`
   (matches Tina's own docs example, which uses `_sys.filename`). This is
   also why the app's `relativePath` lookup and the router's URL must agree
   on the same filename-is-the-slug assumption.
3. **A client component calling `useTina()` + `tinaField()`**
   (`components/blog/BlogPostView.tsx`) that the server page passes
   `{query, variables, data}` into. `data-tina-field={tinaField(post, "x")}`
   on the DOM node showing field `x` is what makes it clickable in the
   preview pane. Outside Tina's admin iframe, `useTina()` is a no-op — it
   returns the passed-in `data` unchanged, so normal visitors and the
   production build render identically to a plain server component.

To extend this to another collection, copy `getBlogPostQuery` +
`BlogPostView` + the `blog` collection's `ui.router`, swapping in that
collection's query/fields. Skip it for collections edited rarely or by
developers only (this repo intentionally leaves `contact-form-config` and
the singleton `site-settings`/`nav`/`footer` docs on the plain admin).

Tradeoff, if asked to add more: per collection it costs a client/server
component split (page fetch → client component, not a single server
component), per-field `tinaField` wiring (non-trivial for nested list fields
like `catalog`'s `pages[]` or `story-cards`' `attributes[]`), and two data
paths to keep in sync (initial server props vs. the live-edit override). In
exchange, editors get true WYSIWYG editing instead of a flat form — worth it
for high-traffic editorial content, not for rarely-touched config.

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
