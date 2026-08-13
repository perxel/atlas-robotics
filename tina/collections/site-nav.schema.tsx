import type { Collection, Template, TinaField } from "tinacms";
import { localeReferenceField } from "@/cms/locale-reference";
import { locales, defaultLocale } from "@/lib/registry";

/** One string sub-field per locale. Local to this file since `url` no
 * longer needs it — a "Page Link" item's URL comes from its `page`
 * reference instead (see `pageLinkTemplate` below). `requireDefaultLocale`
 * is off for a Page Link's `label`: unlike a Custom Link, it always has a
 * fallback (the referenced page's own title, see `resolveNavLink` in
 * lib/cms-server.ts), so nothing here is ever actually required to save. */
function localizedTextField(
  name: string,
  label: string,
  options: { description?: string; requireDefaultLocale: boolean }
): TinaField {
  return {
    type: "object",
    name,
    label,
    description: options.description,
    fields: locales.map((l) => ({
      type: "string",
      name: l,
      label: l,
      required: options.requireDefaultLocale && l === defaultLocale,
    })),
  } as TinaField;
}

/** A Page Link already gets its label for free — once a page is picked,
 * that page's own (already-translated) title is used as the nav label for
 * every language, the same way its URL is resolved automatically. This
 * field only exists for the rare case where the nav label should read
 * differently than the page's actual title — fill in only the language(s)
 * you want to override; every other language keeps using that page's
 * title.
 *
 * Named `labelOverride`, not `label` like Custom Link's field below —
 * deliberately a different field name, not just a different label/
 * description on the same name. Both templates live in the same `links`
 * list, and Tina's auto-generated query selects every template's fields
 * unconditionally; two same-named fields with different nullability
 * (this one optional so it's genuinely never required, Custom Link's
 * always requiring its default locale) makes GraphQL's field-merging
 * validation fail with a real, no-args-needed-to-reproduce "conflicting
 * types String vs String!" error — confirmed live, not guessed — since a
 * client can't have one consistent type for the same response key across
 * two union members that disagree on nullability. Different field names
 * sidestep the conflict entirely rather than relaxing either field's
 * required-ness to work around it. */
const pageLinkLabelField = localizedTextField("labelOverride", "Label Override (optional)", {
  requireDefaultLocale: false,
  description:
    "Leave every language blank to use the selected page's own title as the nav label (recommended). " +
    "Fill in a language here only if this nav item should say something different from that page's title.",
});

/** A Custom Link has no page to borrow a title from, so its label is the
 * only source of the nav text and must be typed per language — same
 * "nav managed once for all languages" model as everything else here, just
 * without a title fallback to lean on. */
const customLinkLabelField = localizedTextField("label", "Label", {
  requireDefaultLocale: true,
  description:
    `Nav is managed once for all languages, not per-locale file — fill in the text for every language you support. ` +
    `Only "${defaultLocale}" is required; a language left blank falls back to the "${defaultLocale}" text automatically ` +
    `until someone translates it.`,
});

// `itemProps` only ever sees raw form values, not resolved query data — a
// `reference` field's raw value is just the referenced document's path
// string (e.g. "content/pages/en/about.md"), never its title (confirmed
// against cms/taxonomy/taxonomy.field.ts's identical itemProps, which hits
// the same limitation for the same reason). So the collapsed list label
// falls back to that path's filename, not the page's actual title — a
// real page title only ever shows once resolveNavLink runs on the
// frontend, not inside the admin's own item list.
const itemProps = (item?: {
  label?: Record<string, string | null | undefined>;
  labelOverride?: Record<string, string | null | undefined>;
  page?: string | null;
}) => ({
  label:
    item?.label?.[defaultLocale] ||
    item?.labelOverride?.[defaultLocale] ||
    item?.page?.split("/").pop()?.replace(/\.md$/, "") ||
    "Link",
});

/** Item type 1 of 2: links to a page already in this site (`pages`
 * collection). Its URL — and, unless overridden above, its label too — are
 * auto-resolved per locale from that page's own content: nothing to
 * retype, and it can't drift out of sync with the page's real routing.
 * `withChildren` caps nesting at one level: top-level links get a
 * "Dropdown Items" list using both templates again, dropdown items don't
 * get a further level. */
function pageLinkTemplate(withChildren: boolean): Template {
  return {
    name: "pageLink",
    label: "Page Link",
    ui: { itemProps },
    fields: [
      pageLinkLabelField,
      localeReferenceField({
        name: "page",
        label: "Page",
        collections: ["pages"],
        mode: { mode: "default" },
        locales,
        defaultLocale,
        required: true,
        description: `Its URL is resolved automatically for every language — this list only shows "${defaultLocale}" pages, picking one is enough.`,
      }),
      { type: "boolean", name: "openInNewTab", label: "Open in new tab" },
      ...(withChildren ? [childrenField()] : []),
    ],
  };
}

/** Item type 2 of 2: anything that isn't a page in this site — an external
 * link, a page not yet migrated to the `pages` collection, or an internal
 * URL this project doesn't auto-resolve per locale (e.g. a taxonomy archive
 * like a blog category). Unlike a Page Link, both label and URL have to be
 * typed by hand — but URL is still one field per language, same as label,
 * since plenty of custom links (any internal path) genuinely differ per
 * language even though nothing here derives that automatically. A link
 * that's truly identical everywhere (an external site) just gets the same
 * value typed into each language. */
const customLinkUrlField = localizedTextField("url", "URL", {
  requireDefaultLocale: true,
  description:
    `One URL per language — e.g. https://example.com (same in every language) or an internal path like ` +
    `/blog/category/science that genuinely differs per language. Only "${defaultLocale}" is required; a language ` +
    `left blank falls back to the "${defaultLocale}" URL.`,
});

function customLinkTemplate(withChildren: boolean): Template {
  return {
    name: "customLink",
    label: "Custom Link",
    ui: { itemProps },
    fields: [
      customLinkLabelField,
      customLinkUrlField,
      { type: "boolean", name: "openInNewTab", label: "Open in new tab" },
      ...(withChildren ? [childrenField()] : []),
    ],
  };
}

function childrenField(): TinaField {
  return {
    type: "object",
    name: "children",
    label: "Dropdown Items",
    list: true,
    description: "Shown as a dropdown under this link. Leave empty for a plain link with no dropdown.",
    templates: [pageLinkTemplate(false), customLinkTemplate(false)],
  } as TinaField;
}

export const navCollection: Collection = {
  name: "nav",
  label: "Navigation",
  path: "content/nav",
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
      type: "object",
      name: "links",
      label: "Nav Links",
      list: true,
      description:
        "One list drives every language's menu — pick \"Page Link\" for anything already on this site (label optional, URL automatic) or \"Custom Link\" for everything else (label and URL, one per language).",
      templates: [pageLinkTemplate(true), customLinkTemplate(true)],
    } as TinaField,
  ],
};
