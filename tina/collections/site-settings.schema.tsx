import type { Collection } from "tinacms";
import { seoField } from "./shared-fields/seo.schema";
import { locales } from "@/lib/i18n";

export const siteSettingsCollection: Collection = {
  name: "siteSettings",
  label: "Site Settings",
  path: "content/site-settings",
  format: "json",
  ui: {
    global: true,
    allowedActions: {
      create: false,
      delete: false,
    },
  },
  fields: [
    {
      type: "string",
      name: "title",
      label: "Site Title",
      required: true,
    },
    {
      type: "image",
      name: "logo",
      label: "Logo",
    },
    {
      type: "string",
      name: "logoAlt",
      label: "Logo Alt Text",
    },
    {
      type: "image",
      name: "favicon",
      label: "Favicon",
    },
    seoField("defaultSeo", "Default SEO"),
    {
      type: "object",
      name: "socialLinks",
      label: "Social Links",
      list: true,
      ui: {
        itemProps: (item) => ({ label: item?.platform || "Social Link" }),
      },
      fields: [
        { type: "string", name: "platform", label: "Platform Name" },
        { type: "string", name: "url", label: "URL" },
        {
          type: "string",
          name: "icon",
          label: "Icon Identifier",
          description: "e.g. facebook, instagram, x, youtube, linkedin",
        },
      ],
    },
    // Editorial control over the language switcher's *display* only — which
    // languages exist and which URL each one links to is still a code-level
    // concern (lib/i18n.ts's `locales`, lib/locale-alternates.ts's
    // resolveLocaleAlternates), same as every other locale-routing decision
    // in this app. This field only lets an editor reorder, relabel, and
    // optionally add a flag to each locale — not add/remove a language.
    // components/LanguageSwitcher.tsx falls back to lib/i18n.ts's
    // `localeLabels` for any locale missing from this list (including when
    // the list is empty), so the switcher never breaks if this is left
    // unconfigured.
    {
      type: "object",
      name: "languageSwitcher",
      label: "Language Switcher",
      list: true,
      ui: {
        itemProps: (item) => ({ label: item?.label || item?.locale || "Language" }),
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
    },
  ],
};
