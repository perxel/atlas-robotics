import type { Collection } from "tinacms";
import { switcherConfigField, dictionaryEntriesField } from "@/cms/multilingual";
import { locales, defaultLocale } from "@/lib/registry";

/**
 * Everything about how multiple languages behave, in one admin page: the
 * language switcher's display config on top, the UI-chrome translation
 * table below. A single global, non-localized document (unlike
 * site-settings/nav/footer, which are one file PER locale) — there's only
 * ever one content/multilingual/index.json, not content/multilingual/<locale>.json,
 * since neither the switcher config nor the translation table is itself
 * locale-specific content.
 */
export const multilingualCollection: Collection = {
  name: "multilingual",
  label: "Multilingual",
  path: "content/multilingual",
  format: "json",
  ui: {
    global: true,
    allowedActions: {
      create: false,
      delete: false,
    },
  },
  fields: [switcherConfigField(locales), dictionaryEntriesField(locales, defaultLocale)],
};
