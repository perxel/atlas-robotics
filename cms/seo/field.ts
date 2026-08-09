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
        label: "Cover Media (Image or Video)",
        description:
          "Used as the card/hero cover and the social-share image. Tina's image field accepts any file — set a video (.mp4) here and it plays muted/looped instead of a still image.",
      },
      {
        type: "string",
        name: "ogImageAlt",
        label: "Cover Media Alt / Caption Text",
        description:
          "Alt text when Cover Media is an image, or its caption when it's a video. Leave empty to use this page's own title.",
      },
    ],
  } as TinaField;
}
