# Tina Lifecycle Hooks — plan vs. built

Cross-check of `.claude/plans/06-tina-lifecycle-hooks.md` (deleted after
this doc was written — see `00-overview.md`) against `cms/tina-hooks/`.

## File-for-file match

`types.ts` (`BeforeSubmitArgs`, `BeforeSubmitHook`) and
`compose-before-submit.ts` (`composeBeforeSubmit`) — exactly the two
files planned, nothing more.

## One typed tightening the plan didn't specify

Plan: `type BeforeSubmitHook = (args: BeforeSubmitArgs) => Promise<void> | void`.
Built: `type BeforeSubmitHook = (args: BeforeSubmitArgs) => Promise<void>`
— drops the `| void` branch. The type file's own comment explains why:
Tina's own `beforeSubmit` type requires the function to always return a
`Promise`, and every actual hook is written `async` anyway, so the
stricter type costs nothing in practice while catching a
non-`async` hook at compile time instead of silently misbehaving at
runtime. A correctness tightening the plan's own sketch just didn't get
precise about.

## Behavior — matches exactly

`composeBeforeSubmit` is sequential and fail-fast, awaiting each hook
before the next runs and stopping at the first thrown `Error` — matches
the plan's description and code sample verbatim.

## Convention — followed

Every collection with a `slug` field wraps `beforeSubmit` in
`composeBeforeSubmit([...])`, even the ones with only one hook today
(`blog`, `products`, each taxonomy's `defineTaxonomy()`, `pages`) —
verified directly in `tina/collections/*.schema.tsx` and
`tina/collections/shared-fields/taxonomy.schema.tsx`. `pages` is the only
one with a second array slot actually reserved for future use in its own
schema file's shape, matching the plan's `pages.schema.tsx` example.

`assertSlugFieldsHaveGuard` needed no change, as predicted — it still
only checks `!!ui?.beforeSubmit`, and a composed function is still
truthy.
