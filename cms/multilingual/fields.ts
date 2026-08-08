import type { TinaField } from "tinacms";

/**
 * Repeatable `{ key, values }` list — the closest real Tina UI to a
 * spreadsheet-grid translation table (Tina has no literal data-grid field
 * type: `tinaTableTemplate` is for a markdown table *inside rich text*, not
 * a data field). One row per source string, one column per non-default
 * locale. `defaultLocale` is intentionally excluded from `values` — the
 * `key` itself already IS the default-locale text, nothing to duplicate.
 */
export function dictionaryEntriesField(
  locales: readonly string[],
  defaultLocale: string
): TinaField {
  const translatableLocales = locales.filter((l) => l !== defaultLocale);
  return {
    type: "object",
    name: "entries",
    label: "Translations",
    list: true,
    ui: {
      itemProps: (item: { key?: string }) => ({ label: item?.key || "Entry" }),
    },
    fields: [
      {
        type: "string",
        name: "key",
        label: "Source text",
        required: true,
        description: `The exact English text as written in code (the ${defaultLocale} locale's own text).`,
      },
      {
        type: "object",
        name: "values",
        label: "Translations",
        fields: translatableLocales.map((locale) => ({
          type: "string",
          name: locale,
          label: locale,
        })),
      },
    ],
  } as TinaField;
}

/** Same shape as this repo's original site-settings `languageSwitcher`
 * field — editorial control over the switcher's *display* only (order,
 * label, optional flag); which locales exist and which URL each one links
 * to stays a code-level concern (MultilingualService + the app's own
 * cross-locale alternates resolution). */
export function switcherConfigField(locales: readonly string[]): TinaField {
  return {
    type: "object",
    name: "switcher",
    label: "Language Switcher",
    list: true,
    ui: {
      itemProps: (item: { label?: string; locale?: string }) => ({
        label: item?.label || item?.locale || "Language",
      }),
    },
    fields: [
      {
        type: "string",
        name: "locale",
        label: "Locale",
        required: true,
        options: [...locales],
      },
      {
        type: "string",
        name: "label",
        label: "Label",
        required: true,
        description: 'Text shown in the switcher, e.g. "VI" or "Tiếng Việt".',
      },
      {
        type: "image",
        name: "flag",
        label: "Flag Image (optional)",
      },
    ],
  } as TinaField;
}
