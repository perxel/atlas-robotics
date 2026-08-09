import type { TinaField } from "tinacms";

/**
 * Extra media grid shown on a detail page below the body — separate from
 * `seo.ogImage` (the single hero/card cover). Reused by `products` and
 * `blog` rather than baked into `defineContentCollection` itself, since
 * not every future collection needs one (same reasoning as
 * `topFields`/`extraFields` being opt-in per collection).
 */
export function galleryField(): TinaField {
  return {
    type: "object",
    name: "gallery",
    label: "Media Gallery",
    list: true,
    description: "Extra images/videos shown in a grid on the detail page.",
    ui: {
      itemProps: (item) => ({ label: item?.caption || "Media item" }),
    },
    fields: [
      {
        type: "image",
        name: "media",
        label: "Image or Video",
        required: true,
        description: "Tina's image field accepts any file — set a video (.mp4) to show it muted/looped.",
      },
      {
        type: "string",
        name: "caption",
        label: "Caption / Alt Text",
        required: true,
        description: "Shown under the tile, and used as the image's alt text or the video's caption.",
      },
      {
        type: "string",
        name: "orientation",
        label: "Orientation",
        options: ["landscape", "portrait"],
        description: "Portrait media gets a taller grid tile so it isn't cropped as hard.",
      },
    ],
  } as TinaField;
}
