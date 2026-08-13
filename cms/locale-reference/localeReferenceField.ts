import type { TinaField } from "tinacms";

export type LocaleReferenceMode = { mode: "all" } | { mode: "default" } | { mode: "defined"; locale: string };

/**
 * A `reference` field whose admin picker can be scoped to one locale's
 * documents, instead of listing every locale's copy mixed together (Tina's
 * `reference` field has no locale concept of its own — a document's locale
 * only exists as which folder it's saved under). Built on Tina's own
 * documented `collectionFilter` option (`@tinacms/schema-tools`'s
 * `ReferenceFieldOptions`, confirmed against `tinacms/dist/index.js`'s
 * `Combobox`/`useGetOptionSets`: it runs a real server-side GraphQL
 * `DocumentFilter`, `{ [fieldName]: { in: value } }`, against the
 * collection's own connection query) — not a hand-built picker component.
 * Requires the referenced collection(s) to actually have a `locale` field
 * to filter on (see `localeField()`/`stampLocale` in `cms/collection` /
 * `cms/tina-hooks` — every `defineContentCollection` collection has one,
 * auto-stamped from the document's own file path, never hand-typed).
 *
 * Three modes:
 * - `"all"`: a plain reference field, no filter — every locale's documents,
 *   Tina's own stock picker UI, unmodified.
 * - `"default"`: only the project's `defaultLocale` documents.
 * - `{ mode: "defined", locale }`: only one specific locale's documents —
 *   `locale` must be one of the project's registered `locales`, checked at
 *   config-build time (fails loudly rather than silently filtering to
 *   nothing, same "fail loud at config time" style as
 *   `assertSlugFieldsHaveGuard`).
 */
export function localeReferenceField(options: {
  name: string;
  label: string;
  collections: string[];
  mode: LocaleReferenceMode;
  locales: readonly string[];
  defaultLocale: string;
  required?: boolean;
  description?: string;
}): TinaField {
  const { name, label, collections, mode, locales, defaultLocale, required, description } = options;

  let collectionFilter: Record<string, Record<string, string[]>> | undefined;
  if (mode.mode !== "all") {
    const targetLocale = mode.mode === "default" ? defaultLocale : mode.locale;
    if (!locales.includes(targetLocale)) {
      throw new Error(
        `localeReferenceField("${name}"): mode "${targetLocale}" is not a registered locale (${locales.join(", ")}).`
      );
    }
    collectionFilter = Object.fromEntries(collections.map((c) => [c, { locale: [targetLocale] }]));
  }

  return {
    type: "reference",
    name,
    label,
    collections,
    ...(required ? { required } : {}),
    ...(description ? { description } : {}),
    ...(collectionFilter ? { collectionFilter } : {}),
  } as TinaField;
}
