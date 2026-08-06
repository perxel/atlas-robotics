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
      },
      {
        type: "string",
        name: "metaDescription",
        label: "Meta Description",
        ui: {
          component: "textarea",
        },
      },
      {
        type: "image",
        name: "ogImage",
        label: "OG Image",
      },
    ],
  } as TinaField;
}
