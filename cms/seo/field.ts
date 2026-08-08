import type { TinaField } from "tinacms";

/**
 * Reusable SEO object field, added to every page-representing collection
 * so meta title/description/og image are editable per document.
 */
export function seoField(name = "seo", label = "SEO"): TinaField {
  return {
    type: "object",
    name,
    label,
    fields: [
      {
        type: "string",
        name: "metaTitle",
        label: "Meta Title",
        description: "Leave empty to use this page's own title.",
      },
      {
        type: "string",
        name: "metaDescription",
        label: "Meta Description",
        description: "Leave empty to use the Excerpt, where this collection has one.",
        ui: {
          component: "textarea",
        },
      },
      {
        type: "image",
        name: "ogImage",
        label: "OG Image",
      },
      {
        type: "string",
        name: "ogImageAlt",
        label: "OG Image Alt Text",
        description: "Leave empty to use this page's own title.",
      },
    ],
  } as TinaField;
}
