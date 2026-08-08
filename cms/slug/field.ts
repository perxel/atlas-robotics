import type { TinaField } from "tinacms";

/**
 * Standard routable slug field. Pair with `slugLifecycleGuard()` on the
 * same collection's `ui.beforeSubmit` (composed via `composeBeforeSubmit`
 * from `@/cms/tina-hooks`) — enforced automatically, see
 * `assertSlugFieldsHaveGuard` in this same folder.
 */
export function slugField(options?: { reserved?: Set<string> }): TinaField {
  const reserved = options?.reserved;
  return {
    type: "string",
    name: "slug",
    label: "Slug",
    required: true,
    ui: reserved
      ? {
          validate: (value) => {
            if (value && reserved.has(value)) {
              return `"${value}" is reserved for a built-in page and can't be used here.`;
            }
          },
        }
      : undefined,
  } as TinaField;
}
