import type { TinaField } from "tinacms";

/**
 * Auto-stamped on every save by `stampModifiedDate` (cms/tina-hooks) —
 * never hand-edited, so `component: () => null` hides it from the admin
 * form entirely (Tina's documented pattern for a schema field with no UI).
 *
 * Deliberately NOT `required: true`, even though it's conceptually a fixed
 * field every document has: Tina's required-field validation runs before
 * `ui.beforeSubmit` (confirmed against `tinacms/dist/index.js` —
 * `handleSubmit` only calls `beforeSubmit` after the form's own validation
 * passes), so marking this required would block saving a brand-new
 * document that hasn't been stamped yet, before the hook that stamps it
 * ever runs. In practice it's still effectively "fixed": every document
 * has one after its first save, the same way WordPress's `post_modified`
 * is never manually required either.
 */
export function modifiedDateField(): TinaField {
  return {
    type: "datetime",
    name: "modifiedDate",
    label: "Last Modified",
    ui: { component: () => null },
  } as TinaField;
}
