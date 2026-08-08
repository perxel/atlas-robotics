# SEO — plan vs. built

Cross-check of `.claude/plans/04-seo.md` (deleted after this doc was
written — see `00-overview.md`) against `cms/seo/`.

## File layout — matches, plus two extra files

Plan lists: `types.ts`, `SeoService.ts`, `field.ts`,
`dashboard/SeoDashboardService.ts`, `dashboard/createSeoDashboardScreen.tsx`,
`breadcrumb/types.ts`, `breadcrumb/build-breadcrumb-json-ld.ts` — all
present as planned.

➕ `site-url.ts` and `require-in-production.ts` — not in the plan's file
list at all. `site-url.ts` exports `siteUrl`, read once from
`process.env.NEXT_PUBLIC_SITE_URL`; `require-in-production.ts` is a
small generic "fail loud in prod, fall back in dev" helper it's built on.
The plan's `SeoService` constructor already took `siteUrl: string` as a
plain option — where that value actually comes from (an env var, with a
production-only hard-fail if unset) wasn't specified anywhere in the
plan, and turned out to need its own two files rather than an inline
`process.env` read, per `require-in-production.ts`'s own comment: Next.js
only inlines `NEXT_PUBLIC_*` vars into the client bundle when read as a
static literal, so the fail/fallback logic had to be split from the env
lookup itself. `lib/cms.ts`'s `CMSSeo` instantiation imports `siteUrl`
from `@/cms/seo` rather than defining it itself — a reasonable
"discovered while implementing" addition, not scope creep.

## `SeoService` — matches exactly

`buildAlternates` and `buildMetadata` match the plan's signatures and
behavior, including the x-default resolution logic (prefer
`defaultLocale`'s alternate, fall through in registered-locale order).
The plan's stated reasoning for keeping `alternates` a plain input rather
than something `SeoService` resolves itself — "that dispatch logic
already has one home" — is honored: alternates resolution lives entirely
in `LocaleAlternatesService` (see `08-beyond-the-plan.md`), never in
`SeoService`.

## `seoField()` — matches

Straight move, same four fields (`metaTitle`, `metaDescription`,
`ogImage`, `ogImageAlt`) as before the refactor, matching the plan's "already
generic" note.

## SEO Dashboard — matches, with the plan's own flagged caveat honored

`SeoDashboardService.getCoverage()`/`getAudit()` match the plan's
signatures, including the `requiredFields` default of `["metaTitle",
"metaDescription"]`. `usingFallback` on every audit row is hardcoded to
`[]` in the built version — the plan itself flagged this as an open
question ("tracked separately... this is the decided default; revisit if
it doesn't feel right in practice"), and the built code's own comment
explains why it stayed that way: a generic SEO index
(`{filename, locale, slug, seo}`) doesn't carry enough route-type context
to know whether a specific fallback (a listing page's dictionary title
vs. a detail page's own title) actually covers a gap. Consistent
follow-through on the plan's own acknowledged limitation, not an
unaddressed gap.

## Breadcrumb — matches

`BreadcrumbItem` type and `buildBreadcrumbJsonLd(trail, siteUrl)` match
the plan's shape and code verbatim. Stayed plain functions, not a class
with injected Collection/Taxonomy capabilities, exactly per the plan's
reasoning (dispatch-by-route-type already happens at the call site).

## `lib/cms.ts` additions — same split noted in `03-multilingual.md`

The plan shows `seoDashboardScreen` instantiated inline in `lib/cms.ts`;
built, it's in `lib/dashboards.ts` alongside the translation dashboard,
for the bundle-size reason covered in that file's own doc comment (see
`03-multilingual.md`'s cross-check for detail — same drift, not repeated
twice). The `cmsCallback` registration in `tina/config.ts` matches the
plan's snippet exactly, including `seoDashboardScreen` being registered
unconditionally (unlike the translation dashboard's `isEnabled()` gate).

## One resolved-differently note carried from Collection

The plan's SEO Dashboard section says `getSeoIndex: () => ["blog",
"products", "pages"]` as if `pages` were just another entry in
`CollectionService`'s registry. It isn't — see `01-collection.md`'s
Addendum #4 cross-check and `08-beyond-the-plan.md` for how `pages`
actually got its own `getSeoIndex()` on a separate `PagesService`, unioned
at the `lib/dashboards.ts` call site instead.
