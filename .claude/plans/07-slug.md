# Domain: Slug (Tina field hook)

See [`00-overview.md`](./00-overview.md) for cross-domain rules this file
assumes. Built on top of
[`06-tina-lifecycle-hooks.md`](./06-tina-lifecycle-hooks.md)'s
`composeBeforeSubmit`.

## `cms/slug/` (generic, reusable, no project data)

```
cms/slug/
  field.ts                        # slugField(options?: { reserved?: Set<string> })
                                   # — unchanged, already generic
  slug-lifecycle-guard.ts           # slugLifecycleGuard(collectionName, options?):
                                     # BeforeSubmitHook — returns ONE hook now,
                                     # not the whole beforeSubmit function
  assert-slug-fields-have-guard.ts    # unchanged — build-time invariant check
```

```ts
function slugLifecycleGuard(
  collectionName: string,
  options?: { lockedFilenames?: Set<string> }
): BeforeSubmitHook {
  return async ({ values, cms, form }) => {
    // 1. uniqueness — unchanged from today
    // 2. lock check — now keyed off `options.lockedFilenames`, not a
    //    hardcoded `collectionName === "pages"` branch (the fix flagged
    //    back in the Guiding Rules: this was the one place a "generic"
    //    shared-field helper leaked project awareness)
    if (options?.lockedFilenames?.size) {
      // ...same on-disk-slug comparison logic as today, gated on this
      // collection actually having locked filenames to check at all
    }
    // ...
  };
}
```

`options.lockedFilenames` is passed in by the caller (`pages.schema.tsx`,
importing `lockedSlugFilenames` from `lib/pages-config.ts` same as today) —
`cms/slug` never imports project config directly.

## Call site

```ts
// tina/collections/pages.schema.tsx
import { lockedSlugFilenames } from "@/lib/pages-config";

ui: {
  beforeSubmit: composeBeforeSubmit([
    slugLifecycleGuard("pages", { lockedFilenames: lockedSlugFilenames }),
  ]),
}

// tina/collections/blog.schema.tsx / products.schema.tsx — no locked filenames
ui: { beforeSubmit: composeBeforeSubmit([slugLifecycleGuard("blog")]) }
```

`assertSlugFieldsHaveGuard(collections)` stays called once from
`tina/config.ts`, unchanged.
