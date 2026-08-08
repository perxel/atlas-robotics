# Domain: Tina Lifecycle Hooks

See [`00-overview.md`](./00-overview.md) for cross-domain rules this file
assumes. Not in the original domain list — added while designing
[`07-slug.md`](./07-slug.md), which is built on top of this.

Tina gives each collection exactly **one** `ui.beforeSubmit` slot. Today
`slugLifecycleGuard` assumes it owns that slot entirely. That doesn't scale —
the moment a second independent check is needed (a required-field guard, an
auto-set-timestamp hook, anything else that should block or adjust a save),
someone has to hand-write a wrapper that calls both. So: a small, generic
composition utility, extendable by just appending to an array, not rewriting
anything. This is infrastructure every other hook-based feature plugs into —
not slug-specific, so it doesn't live under `cms/slug/`.

## `cms/tina-hooks/` (generic, reusable, no project data)

```
cms/tina-hooks/
  types.ts                    # BeforeSubmitArgs, BeforeSubmitHook
  compose-before-submit.ts      # composeBeforeSubmit(hooks): BeforeSubmitHook
```

```ts
type BeforeSubmitArgs = {
  values: Record<string, unknown>;
  cms: { api: { tina: { request: (query: string, opts: { variables: Record<string, unknown> })
    => Promise<{ data?: Record<string, any> }> } } };
  form: { path: string };
};
type BeforeSubmitHook = (args: BeforeSubmitArgs) => Promise<void> | void;

// Sequential, fail-fast: each hook is awaited before the next runs; the
// first thrown Error stops the save right there — same single-message UX
// slugLifecycleGuard already has today, just no longer assuming it's the
// only thing in beforeSubmit.
function composeBeforeSubmit(hooks: BeforeSubmitHook[]): BeforeSubmitHook {
  return async (args) => {
    for (const hook of hooks) await hook(args);
  };
}
```

**Convention going forward:** every collection wraps `beforeSubmit` in
`composeBeforeSubmit([...])`, even collections with only one hook today —
so adding a second one later is a one-line append, not a first-time refactor:

```ts
// tina/collections/blog.schema.tsx
ui: { beforeSubmit: composeBeforeSubmit([slugLifecycleGuard("blog")]) }

// tina/collections/pages.schema.tsx
ui: { beforeSubmit: composeBeforeSubmit([
  slugLifecycleGuard("pages", { lockedFilenames: lockedSlugFilenames }),
  // future: another independent guard, just another array entry
]) }
```

`assertSlugFieldsHaveGuard` (build-time check that every `slug` field has
*some* `beforeSubmit`) needs no change — it only checks `!!ui?.beforeSubmit`,
and a composed function is still truthy.
