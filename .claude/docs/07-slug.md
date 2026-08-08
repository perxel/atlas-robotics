# Slug — plan vs. built

Cross-check of `.claude/plans/07-slug.md` (deleted after this doc was
written — see `00-overview.md`) against `cms/slug/`.

## File-for-file match

`field.ts` (`slugField`), `slug-lifecycle-guard.ts`
(`slugLifecycleGuard`), `assert-slug-fields-have-guard.ts`
(`assertSlugFieldsHaveGuard`), `index.ts` — exactly the three logic files
the plan lists, plus the expected barrel.

## `slugLifecycleGuard` — matches exactly

Returns one `BeforeSubmitHook` (not a whole `beforeSubmit` function), as
planned. Both checks match the plan's two-step description:

1. **Uniqueness** — unchanged in behavior from the pre-refactor version,
   still a `<collection>Connection` query filtered by `slug`, comparing
   `breadcrumbs[0]` (locale) and `relativePath` against the current
   document.
2. **Lock check** — keyed off `options.lockedFilenames`, a caller-supplied
   `Set<string>`, exactly replacing the plan-flagged old hardcoded
   `collectionName === "pages"` branch. `cms/slug` itself never imports
   project config — `lockedSlugFilenames` is still passed in from
   `pages.schema.tsx`, though it now comes from `@/lib/cms` rather than
   `@/lib/pages-config` (that file no longer exists — see
   `00-overview.md`'s consolidation note). The plan's own call-site
   example imports it from `lib/pages-config`; that's the one place the
   plan's exact import path is now stale, though the pattern it describes
   (a caller-supplied set, not a hardcoded branch) is intact.

## Call sites — matches

`blog.schema.tsx`, `products.schema.tsx`:
`composeBeforeSubmit([slugLifecycleGuard("blog"/"products")])`.
`pages.schema.tsx`:
`composeBeforeSubmit([slugLifecycleGuard("pages", { lockedFilenames: lockedSlugFilenames })])`.
Both match the plan's call-site examples exactly, modulo the import-path
note above.

`assertSlugFieldsHaveGuard(collections)` is still called once from
`tina/config.ts`, unchanged, as planned.

## One thing beyond the plan's own scope: `defineTaxonomy` reuses this hook too

Not mentioned in `07-slug.md` at all (taxonomies weren't cross-referenced
here), but worth noting for completeness: `defineTaxonomy()` in
`tina/collections/shared-fields/taxonomy.schema.tsx` also wires
`slugField()` + `composeBeforeSubmit([slugLifecycleGuard(name)])` on every
taxonomy term-store collection it creates — the same pattern applied a
third place beyond `blog`/`products`/`pages`, consistent with the
guard's genericity even though the plan file for Slug never enumerates
taxonomies as a caller.
