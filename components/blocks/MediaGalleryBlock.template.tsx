import type { Template } from "tinacms";

export const mediaGalleryTemplate: Template = {
  name: "mediaGallery",
  label: "Media Gallery (Full-Bleed)",
  fields: [
    { type: "string", name: "heading", label: "Section Heading", required: true },
    { type: "string", name: "subheading", label: "Section Subheading" },
    {
      type: "object",
      name: "items",
      label: "Slides",
      list: true,
      ui: {
        itemProps: (item) => ({ label: item?.heading || "Slide" }),
      },
      fields: [
        {
          type: "image",
          name: "media",
          label: "Image or Video",
          required: true,
          description: "Tina's image field accepts any file — set a video (.mp4) to autoplay it muted/looped.",
        },
        {
          type: "string",
          name: "caption",
          label: "Caption / Alt Text",
          required: true,
          description: "Shown as a small credit line, and used as the image's alt text or the video's caption.",
        },
        { type: "string", name: "heading", label: "Overlay Heading", required: true },
        { type: "string", name: "subheading", label: "Overlay Subheading" },
        { type: "string", name: "buttonLabel", label: "Button Label" },
        { type: "string", name: "buttonUrl", label: "Button URL" },
      ],
    },
  ],
};
