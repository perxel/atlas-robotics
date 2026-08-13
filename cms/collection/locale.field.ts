import type { TinaField } from "tinacms";

/**
 * Auto-stamped on every save by `stampLocale` (cms/tina-hooks), from the
 * document's own file path — never hand-edited, so `component: () => null`
 * hides it from the admin form entirely, same pattern as
 * `modifiedDateField()`. Exists so a `reference` field elsewhere can use
 * Tina's native `collectionFilter` (a real per-field GraphQL filter) to
 * list only one locale's documents — `collectionFilter` filters on actual
 * field values, and locale otherwise only exists implicitly as the
 * document's containing folder, which isn't a queryable field on its own.
 */
export function localeField(): TinaField {
  return {
    type: "string",
    name: "locale",
    label: "Locale",
    ui: { component: () => null },
  } as TinaField;
}
